/**
 * Push notification utility for currency reminders
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { CurrencyType } from "@/types/currency";
import type { CurrencyStatus } from "@/lib/currency-calculator";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false; // Notifications not supported on web
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Schedule currency reminder notifications at 30, 15, and 1 day before expiration
 */
export async function scheduleCurrencyNotifications(
  currencyType: CurrencyType,
  expirationDate: Date,
  daysRemaining: number
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    const currencyName = getCurrencyDisplayName(currencyType);
    const notificationIntervals = [30, 15, 1]; // Days before expiration

    for (const interval of notificationIntervals) {
      // Only schedule if there are enough days remaining
      if (daysRemaining > interval) {
        const triggerDate = new Date(expirationDate);
        triggerDate.setDate(triggerDate.getDate() - interval);

        // Only schedule if the trigger date is in the future
        if (triggerDate > new Date()) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${currencyType}_${interval}days`,
            content: {
              title: `${currencyName} Currency Expiring Soon`,
              body: `Your ${currencyName} currency will expire in ${interval} day${interval > 1 ? "s" : ""}. Schedule a flight to maintain currency.`,
              data: { 
                currencyType, 
                expirationDate: expirationDate.toISOString(),
                daysUntilExpiry: interval 
              },
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error(`Failed to schedule notifications for ${currencyType}:`, error);
  }
}

/**
 * Cancel all scheduled notifications for a specific currency type
 */
export async function cancelCurrencyNotifications(currencyType: CurrencyType): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.currencyType === currencyType) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.error(`Failed to cancel notifications for ${currencyType}:`, error);
  }
}

/**
 * Cancel all scheduled currency notifications
 */
export async function cancelAllCurrencyNotifications(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Failed to cancel all notifications:", error);
  }
}

/**
 * Reschedule all currency notifications based on current status
 */
export async function rescheduleAllNotifications(
  currencyStatuses: Record<CurrencyType, CurrencyStatus>
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    // Cancel all existing notifications first
    await cancelAllCurrencyNotifications();

    // Schedule new notifications for each currency (30, 15, 1 day before expiration)
    for (const [currencyType, status] of Object.entries(currencyStatuses) as [CurrencyType, CurrencyStatus][]) {
      if (status.status !== "EXPIRED" && status.expirationDate && status.daysRemaining > 0) {
        await scheduleCurrencyNotifications(
          currencyType,
          status.expirationDate,
          status.daysRemaining
        );
      }
    }
  } catch (error) {
    console.error("Failed to reschedule notifications:", error);
  }
}

/**
 * Get display name for currency type
 */
function getCurrencyDisplayName(currencyType: CurrencyType): string {
  const names: Record<CurrencyType, string> = {
    day: "Day",
    night: "Night",
    nvg: "NVG",
    medical: "Medical",
    irt: "IRT",
  };
  return names[currencyType] || currencyType;
}

/**
 * Get list of all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  if (Platform.OS === "web") {
    return [];
  }

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Failed to get scheduled notifications:", error);
    return [];
  }
}
