import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Mock expo-notifications
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
}));

// Mock Platform
vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

// Import functions after mocks
import {
  requestNotificationPermissions,
  scheduleCurrencyNotifications,
  cancelCurrencyNotifications,
  cancelAllCurrencyNotifications,
  rescheduleAllNotifications,
} from "./notifications";
import type { CurrencyStatus } from "./currency-calculator";
import type { CurrencyType } from "@/types/currency";

describe("Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestNotificationPermissions", () => {
    it("should return true if permissions already granted", async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: "granted",
      } as any);

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it("should request permissions if not granted", async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: "denied",
      } as any);
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: "granted",
      } as any);

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it("should return false if permissions denied", async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        status: "denied",
      } as any);
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        status: "denied",
      } as any);

      const result = await requestNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  describe("scheduleCurrencyNotifications", () => {
    it("should schedule 3 notifications for currency with 60 days remaining", async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60);

      await scheduleCurrencyNotifications("day", expirationDate, 60);

      // Should schedule for 30, 15, and 1 day before expiration
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    });

    it("should schedule 2 notifications for currency with 20 days remaining", async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 20);

      await scheduleCurrencyNotifications("night", expirationDate, 20);

      // Should schedule for 15 and 1 day before expiration (not 30)
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });

    it("should schedule 1 notification for currency with 5 days remaining", async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 5);

      await scheduleCurrencyNotifications("nvg", expirationDate, 5);

      // Should only schedule for 1 day before expiration
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it("should not schedule notifications for expired currency", async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - 10);

      await scheduleCurrencyNotifications("medical", expirationDate, -10);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("should include correct notification content", async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60);

      await scheduleCurrencyNotifications("day", expirationDate, 60);

      const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      
      // Check 30-day notification
      expect(calls[0][0].content.title).toBe("Day Currency Expiring Soon");
      expect(calls[0][0].content.body).toContain("30 days");
      expect(calls[0][0].identifier).toBe("day_30days");

      // Check 15-day notification
      expect(calls[1][0].content.body).toContain("15 days");
      expect(calls[1][0].identifier).toBe("day_15days");

      // Check 1-day notification
      expect(calls[2][0].content.body).toContain("1 day");
      expect(calls[2][0].identifier).toBe("day_1days");
    });
  });

  describe("cancelCurrencyNotifications", () => {
    it("should cancel all notifications for a currency type", async () => {
      const mockNotifications = [
        {
          identifier: "day_30days",
          content: { data: { currencyType: "day" } },
        },
        {
          identifier: "day_15days",
          content: { data: { currencyType: "day" } },
        },
        {
          identifier: "night_30days",
          content: { data: { currencyType: "night" } },
        },
      ];

      vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue(
        mockNotifications as any
      );

      await cancelCurrencyNotifications("day");

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("day_30days");
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("day_15days");
    });
  });

  describe("rescheduleAllNotifications", () => {
    it("should cancel all and reschedule for valid currencies", async () => {
      const currencyStatuses: Record<CurrencyType, CurrencyStatus> = {
        day: {
          type: "day",
          name: "Day",
          status: "VALID",
          daysRemaining: 60,
          lastFlightDate: new Date(),
          expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        night: {
          type: "night",
          name: "Night",
          status: "EXPIRED",
          daysRemaining: -10,
          lastFlightDate: new Date(),
          expirationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
        nvg: {
          type: "nvg",
          name: "NVG",
          status: "EXPIRING SOON",
          daysRemaining: 20,
          lastFlightDate: new Date(),
          expirationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        },
        medical: {
          type: "medical",
          name: "Medical",
          status: "VALID",
          daysRemaining: 100,
          testDate: new Date(),
          expirationDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        },
        irt: {
          type: "irt",
          name: "IRT",
          status: "VALID",
          daysRemaining: 45,
          testDate: new Date(),
          expirationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
      };

      await rescheduleAllNotifications(currencyStatuses);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      
      // Should schedule for day (3 notifications), nvg (2 notifications), medical (3 notifications), irt (3 notifications)
      // Night should not be scheduled because it's expired
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(11);
    });
  });
});
