/**
 * Tests for IRT Currency tracking
 * IRT Currency should update automatically when adding IRT flights with Instrument Flight enabled
 * IRT flights are identified by mission field = "IRT" (case-insensitive)
 */

import { describe, it, expect } from "vitest";
import { calculateCurrencyStatus } from "../lib/currency-calculator";
import type { Currency } from "@/types/currency";
import type { Flight } from "@/types/flight";

describe("IRT Currency Tracking", () => {
  const irtCurrency: Currency = {
    type: "irt",
    validityDays: 90, // 90 days validity
    reminderDays: 30,
    status: "current",
  };

  it("should update IRT currency from IRT flight with Instrument Flight enabled", () => {
    const flights: Flight[] = [
      {
        id: "1",
        date: "2026-04-05", // 2 days ago
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "IRT", // Mission Type = IRT
        condition: "day",
        nvg: false,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0,
        type: "act",
        instrumentFlight: true,
        actualHours: 2.0,
        simulationTime: 0,
        ilsCount: 2,
        vorCount: 1,
        createdAt: "2026-01-20T10:00:00Z",
        updatedAt: "2026-01-20T10:00:00Z",
      },
    ];

    const status = calculateCurrencyStatus(irtCurrency, flights);

    expect(status.type).toBe("irt");
    expect(status.status).toBe("VALID");
    expect(status.daysRemaining).toBeGreaterThan(0);
    expect(status.lastFlightDate).toBeDefined();
  });

  it("should update IRT currency from Dual IRT flight", () => {
    const flights: Flight[] = [
      {
        id: "1",
        date: "2026-04-05",
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "IRT", // Mission Type = IRT
        condition: "day",
        nvg: false,
        position: "2nd_plt", // Co-Pilot
        countsAsCaptain: false,
        flightTime: 2.0,
        dualHours: 2.0, // Dual hours
        type: "act",
        instrumentFlight: true,
        actualHours: 2.0,
        simulationTime: 0,
        ilsCount: 2,
        vorCount: 1,
        createdAt: "2026-01-20T10:00:00Z",
        updatedAt: "2026-01-20T10:00:00Z",
      },
    ];

    const status = calculateCurrencyStatus(irtCurrency, flights);

    expect(status.type).toBe("irt");
    expect(status.status).toBe("VALID");
    expect(status.daysRemaining).toBeGreaterThan(0);
    expect(status.lastFlightDate).toBeDefined();
  });

  it("should NOT update IRT currency from IRT flight WITHOUT Instrument Flight", () => {
    const flights: Flight[] = [
      {
        id: "1",
        date: "2026-04-05",
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "IRT", // Mission Type = IRT
        condition: "day",
        nvg: false,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0,
        type: "act",
        instrumentFlight: false, // No Instrument Flight
        createdAt: "2026-01-20T10:00:00Z",
        updatedAt: "2026-01-20T10:00:00Z",
      },
    ];

    const status = calculateCurrencyStatus(irtCurrency, flights);

    expect(status.type).toBe("irt");
    expect(status.status).toBe("EXPIRED");
    expect(status.daysRemaining).toBe(-999);
  });

  it("should NOT update IRT currency from non-IRT mission", () => {
    const flights: Flight[] = [
      {
        id: "1",
        date: "2026-04-05",
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "GHMTF", // Not IRT mission
        condition: "day",
        nvg: false,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0,
        type: "act",
        instrumentFlight: true,
        actualHours: 2.0,
        simulationTime: 0,
        ilsCount: 2,
        vorCount: 1,
        createdAt: "2026-01-20T10:00:00Z",
        updatedAt: "2026-01-20T10:00:00Z",
      },
    ];

    const status = calculateCurrencyStatus(irtCurrency, flights);

    expect(status.type).toBe("irt");
    expect(status.status).toBe("EXPIRED");
    expect(status.daysRemaining).toBe(-999);
  });

  it("should handle case-insensitive mission type matching", () => {
    const flights: Flight[] = [
      {
        id: "1",
        date: "2026-04-05",
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "irt", // lowercase mission type
        condition: "day",
        nvg: false,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0,
        type: "act",
        instrumentFlight: true,
        actualHours: 2.0,
        simulationTime: 0,
        ilsCount: 2,
        vorCount: 1,
        createdAt: "2026-01-20T10:00:00Z",
        updatedAt: "2026-01-20T10:00:00Z",
      },
    ];

    const status = calculateCurrencyStatus(irtCurrency, flights);

    expect(status.type).toBe("irt");
    expect(status.status).toBe("VALID");
    expect(status.daysRemaining).toBeGreaterThan(0);
  });

  it("should use the most recent IRT flight", () => {
    const flights: Flight[] = [
      {
        id: "1",
        date: "2026-04-03", // Older flight
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "IRT",
        condition: "day",
        nvg: false,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0,
        type: "act",
        instrumentFlight: true,
        actualHours: 2.0,
        simulationTime: 0,
        ilsCount: 2,
        vorCount: 1,
        createdAt: "2026-01-10T10:00:00Z",
        updatedAt: "2026-01-10T10:00:00Z",
      },
      {
        id: "2",
        date: "2026-04-05", // Most recent flight
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "IRT",
        condition: "day",
        nvg: false,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0,
        type: "act",
        instrumentFlight: true,
        actualHours: 2.0,
        simulationTime: 0,
        ilsCount: 2,
        vorCount: 1,
        createdAt: "2026-01-20T10:00:00Z",
        updatedAt: "2026-01-20T10:00:00Z",
      },
    ];

    const status = calculateCurrencyStatus(irtCurrency, flights);

    expect(status.type).toBe("irt");
    expect(status.status).toBe("VALID");
    expect(status.lastFlightDate).toBeDefined();
    expect(status.lastFlightDate?.toISOString()).toContain("2026-04-05");
  });

  it("should expire IRT currency after validity period", () => {
    const flights: Flight[] = [
      {
        id: "1",
        date: "2025-10-01", // More than 90 days ago
        aircraftType: "UH-60M",
        aircraftNumber: "001",
        captainName: "Test Captain",
        coPilotName: "Test Co-Pilot",
        mission: "IRT",
        condition: "day",
        nvg: false,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0,
        type: "act",
        instrumentFlight: true,
        actualHours: 2.0,
        simulationTime: 0,
        ilsCount: 2,
        vorCount: 1,
        createdAt: "2025-10-01T10:00:00Z",
        updatedAt: "2025-10-01T10:00:00Z",
      },
    ];

    const status = calculateCurrencyStatus(irtCurrency, flights);

    expect(status.type).toBe("irt");
    expect(status.status).toBe("EXPIRED");
    expect(status.daysRemaining).toBeLessThan(0);
  });
});
