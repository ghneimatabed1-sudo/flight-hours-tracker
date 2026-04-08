/**
 * Comprehensive tests for all currency types
 * Ensures all currencies update correctly from flights
 */

import { describe, it, expect } from "vitest";
import { calculateCurrencyStatus } from "../lib/currency-calculator";
import type { Currency } from "@/types/currency";
import type { Flight } from "@/types/flight";

describe("All Currencies Update Correctly", () => {
  const recentDate = "2026-04-05"; // 2 days ago from test date
  const oldDate = "2025-12-01"; // More than 90 days ago

  // Day Currency
  const dayCurrency: Currency = {
    type: "day",
    validityDays: 90,
    reminderDays: 30,
    status: "current",
  };

  // Night Currency
  const nightCurrency: Currency = {
    type: "night",
    validityDays: 90,
    reminderDays: 30,
    status: "current",
  };

  // NVG Currency
  const nvgCurrency: Currency = {
    type: "nvg",
    validityDays: 90,
    reminderDays: 30,
    status: "current",
  };

  // Medical Currency (date-based)
  const medicalCurrency: Currency = {
    type: "medical",
    validityDays: 365,
    reminderDays: 30,
    status: "current",
    testDate: recentDate,
  };

  // IRT Currency (flight-based)
  const irtCurrency: Currency = {
    type: "irt",
    validityDays: 90,
    reminderDays: 30,
    status: "current",
  };

  // Test flights
  const dayFlight: Flight = {
    id: "1",
    date: recentDate,
    aircraftType: "UH-60M",
    aircraftNumber: "001",
    captainName: "Test Captain",
    coPilotName: "Test Co-Pilot",
    mission: "Training",
    condition: "day",
    nvg: false,
    position: "1st_plt",
    countsAsCaptain: true,
    flightTime: 2.0,
    dualHours: 0,
    type: "act",
    instrumentFlight: false,
    createdAt: recentDate + "T10:00:00Z",
    updatedAt: recentDate + "T10:00:00Z",
  };

  const nightFlight: Flight = {
    ...dayFlight,
    id: "2",
    condition: "night",
    nvg: false, // Night WITHOUT NVG
  };

  const nvgFlight: Flight = {
    ...dayFlight,
    id: "3",
    condition: "night",
    nvg: true, // Night WITH NVG
  };

  const irtFlight: Flight = {
    ...dayFlight,
    id: "4",
    mission: "IRT", // IRT mission type
    instrumentFlight: true,
    actualHours: 2.0,
    simulationTime: 0,
    ilsCount: 2,
    vorCount: 1,
  };

  describe("Day Currency", () => {
    it("should update from day flights", () => {
      const status = calculateCurrencyStatus(dayCurrency, [dayFlight]);
      expect(status.status).toBe("VALID");
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.lastFlightDate).toBeDefined();
    });

    it("should NOT update from night flights", () => {
      const status = calculateCurrencyStatus(dayCurrency, [nightFlight]);
      expect(status.status).toBe("EXPIRED");
    });

    it("should NOT update from NVG flights", () => {
      const status = calculateCurrencyStatus(dayCurrency, [nvgFlight]);
      expect(status.status).toBe("EXPIRED");
    });
  });

  describe("Night Currency", () => {
    it("should update from night flights (non-NVG)", () => {
      const status = calculateCurrencyStatus(nightCurrency, [nightFlight]);
      expect(status.status).toBe("VALID");
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.lastFlightDate).toBeDefined();
    });

    it("should NOT update from day flights", () => {
      const status = calculateCurrencyStatus(nightCurrency, [dayFlight]);
      expect(status.status).toBe("EXPIRED");
    });

    it("should NOT update from NVG flights", () => {
      const status = calculateCurrencyStatus(nightCurrency, [nvgFlight]);
      expect(status.status).toBe("EXPIRED");
    });
  });

  describe("NVG Currency", () => {
    it("should update from NVG flights", () => {
      const status = calculateCurrencyStatus(nvgCurrency, [nvgFlight]);
      expect(status.status).toBe("VALID");
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.lastFlightDate).toBeDefined();
    });

    it("should NOT update from day flights", () => {
      const status = calculateCurrencyStatus(nvgCurrency, [dayFlight]);
      expect(status.status).toBe("EXPIRED");
    });

    it("should NOT update from night flights (non-NVG)", () => {
      const status = calculateCurrencyStatus(nvgCurrency, [nightFlight]);
      expect(status.status).toBe("EXPIRED");
    });
  });

  describe("Medical Currency", () => {
    it("should use testDate (date-based)", () => {
      const status = calculateCurrencyStatus(medicalCurrency, []);
      expect(status.status).toBe("VALID");
      expect(status.testDate).toBeDefined();
      expect(status.daysRemaining).toBeGreaterThan(0);
    });

    it("should NOT be affected by flights", () => {
      const statusWithoutFlights = calculateCurrencyStatus(medicalCurrency, []);
      const statusWithFlights = calculateCurrencyStatus(medicalCurrency, [
        dayFlight,
        nightFlight,
        nvgFlight,
      ]);

      expect(statusWithoutFlights.daysRemaining).toBe(
        statusWithFlights.daysRemaining
      );
    });

    it("should expire without testDate", () => {
      const medicalWithoutDate: Currency = {
        ...medicalCurrency,
        testDate: undefined,
      };
      const status = calculateCurrencyStatus(medicalWithoutDate, []);
      expect(status.status).toBe("EXPIRED");
    });
  });

  describe("IRT Currency", () => {
    it("should update from IRT flights with Instrument Flight", () => {
      const status = calculateCurrencyStatus(irtCurrency, [irtFlight]);
      expect(status.status).toBe("VALID");
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.lastFlightDate).toBeDefined();
    });

    it("should NOT update from non-IRT flights", () => {
      const status = calculateCurrencyStatus(irtCurrency, [dayFlight]);
      expect(status.status).toBe("EXPIRED");
    });

    it("should NOT update from IRT flights WITHOUT Instrument Flight", () => {
      const irtFlightNoIF: Flight = {
        ...irtFlight,
        instrumentFlight: false,
      };
      const status = calculateCurrencyStatus(irtCurrency, [irtFlightNoIF]);
      expect(status.status).toBe("EXPIRED");
    });

    it("should be case-insensitive for mission type", () => {
      const irtFlightLowercase: Flight = {
        ...irtFlight,
        mission: "irt",
      };
      const status = calculateCurrencyStatus(irtCurrency, [
        irtFlightLowercase,
      ]);
      expect(status.status).toBe("VALID");
    });
  });

  describe("Currency Expiration", () => {
    it("should expire Day Currency after validity period", () => {
      const oldDayFlight: Flight = {
        ...dayFlight,
        date: oldDate,
      };
      const status = calculateCurrencyStatus(dayCurrency, [oldDayFlight]);
      expect(status.status).toBe("EXPIRED");
      expect(status.daysRemaining).toBeLessThan(0);
    });

    it("should expire Night Currency after validity period", () => {
      const oldNightFlight: Flight = {
        ...nightFlight,
        date: oldDate,
      };
      const status = calculateCurrencyStatus(nightCurrency, [oldNightFlight]);
      expect(status.status).toBe("EXPIRED");
      expect(status.daysRemaining).toBeLessThan(0);
    });

    it("should expire NVG Currency after validity period", () => {
      const oldNvgFlight: Flight = {
        ...nvgFlight,
        date: oldDate,
      };
      const status = calculateCurrencyStatus(nvgCurrency, [oldNvgFlight]);
      expect(status.status).toBe("EXPIRED");
      expect(status.daysRemaining).toBeLessThan(0);
    });

    it("should expire IRT Currency after validity period", () => {
      const oldIrtFlight: Flight = {
        ...irtFlight,
        date: oldDate,
      };
      const status = calculateCurrencyStatus(irtCurrency, [oldIrtFlight]);
      expect(status.status).toBe("EXPIRED");
      expect(status.daysRemaining).toBeLessThan(0);
    });
  });

  describe("Multiple Flights", () => {
    it("should use the most recent flight for each currency", () => {
      const oldDayFlight: Flight = {
        ...dayFlight,
        id: "old",
        date: oldDate,
      };
      const recentDayFlight: Flight = {
        ...dayFlight,
        id: "recent",
        date: recentDate,
      };

      const status = calculateCurrencyStatus(dayCurrency, [
        oldDayFlight,
        recentDayFlight,
      ]);

      expect(status.status).toBe("VALID");
      expect(status.lastFlightDate?.toISOString()).toContain("2026-04-05");
    });
  });
});
