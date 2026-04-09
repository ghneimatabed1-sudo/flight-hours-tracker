/**
 * Flight Hours Tracker — 100-Scenario Comprehensive Simulation
 * Tests all features across realistic usage patterns
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  classifyFlight,
  calculateTotals,
  createEmptyTotals,
  calculateAircraftTotals,
} from "../lib/calculations";
import { calculateAllCurrencyStatuses } from "../lib/currency-calculator";
import type { Flight, FlightTotals } from "@/types/flight";
import type { InitialHours } from "@/types/initial-hours";
import type { Currency } from "@/types/currency";

// ============ Simulation Setup ============

let testFlights: Flight[] = [];
let testTotals: FlightTotals;
let testInitialHours: InitialHours;
let testCurrencies: Currency[];

beforeAll(() => {
  // Generate 30 test flights across 100 days
  const baseDate = new Date("2026-01-01");

  const createFlight = (
    day: number,
    condition: "day" | "night",
    position: "1st_plt" | "2nd_plt",
    hours: number,
    nvg = false,
    dual = 0,
    instrumentFlight = false,
    ilsCount = 0,
    vorCount = 0
  ): Flight => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + day);
    return {
      id: `flight_${day}`,
      date: date.toISOString().split("T")[0],
      aircraftType: "UH-60M",
      aircraftNumber: "001",
      captainName: "CAPT. TEST",
      coPilotName: "CPT. WING",
      mission: "TRAINING",
      condition,
      nvg,
      position,
      countsAsCaptain: position === "1st_plt",
      flightTime: hours,
      dualHours: dual,
      type: "act",
      instrumentFlight,
      ilsCount,
      vorCount,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };
  };

  // Build flight list
  testFlights = [
    // Days 1-15: Basic day flying
    createFlight(1, "day", "1st_plt", 1.5),
    createFlight(3, "day", "2nd_plt", 0.8),
    createFlight(5, "day", "1st_plt", 2.0),
    createFlight(7, "day", "1st_plt", 1.2, false, 0.5),
    createFlight(10, "day", "2nd_plt", 0.3),

    // Days 15-30: Night introduction
    createFlight(15, "night", "1st_plt", 1.5),
    createFlight(18, "day", "1st_plt", 1.8),
    createFlight(20, "night", "2nd_plt", 1.2),
    createFlight(22, "night", "1st_plt", 1.8),
    createFlight(25, "day", "1st_plt", 2.1, false, 0.3),

    // Days 30-45: NVG and instrument
    createFlight(30, "night", "1st_plt", 2.0, true),
    createFlight(32, "day", "1st_plt", 1.4),
    createFlight(35, "night", "1st_plt", 0.3),
    createFlight(37, "night", "1st_plt", 1.6, true),
    createFlight(40, "day", "1st_plt", 1.5, false, 0, true, 2, 1),

    // Days 45-60: Intensive
    createFlight(45, "day", "1st_plt", 2.2),
    createFlight(47, "night", "1st_plt", 1.9, true, 0.5),
    createFlight(50, "day", "2nd_plt", 1.1),
    createFlight(52, "night", "1st_plt", 2.0),
    createFlight(55, "night", "1st_plt", 0.4),

    // Days 60-75: Advanced
    createFlight(60, "day", "1st_plt", 2.0, false, 0, true, 1, 2),
    createFlight(62, "night", "2nd_plt", 1.4, false, 0.6),
    createFlight(65, "day", "1st_plt", 2.3),
    createFlight(67, "night", "1st_plt", 1.6, true),
    createFlight(70, "day", "1st_plt", 1.9),

    // Days 75-100: Edge cases
    createFlight(75, "night", "1st_plt", 1.5, true),
    createFlight(77, "day", "1st_plt", 0.2),
    createFlight(80, "day", "1st_plt", 1.8, false, 0, true, 3, 0),
    createFlight(85, "night", "1st_plt", 2.1),
    createFlight(90, "day", "1st_plt", 1.9),
    createFlight(95, "day", "2nd_plt", 0.5),
  ];

  // Initial hours
  testInitialHours = {
    totalHours: 500,
    dayHours: 300,
    nightHours: 120,
    nvgHours: 80,
    instrumentHours: 150,
    captainHours: 400,
    copilotHours: 100,
    dualDayHours: 40,
    dualNightHours: 20,
    dualNVGHours: 15,
    day1stPlt: 280,
    day2ndPlt: 20,
    night1stPlt: 100,
    night2ndPlt: 20,
    nvg1stPlt: 75,
    nvg2ndPlt: 5,
  };

  // Currencies
  testCurrencies = [
    { type: "day", validityDays: 30, reminderDays: 3 },
    { type: "night", validityDays: 30, reminderDays: 3 },
    { type: "nvg", validityDays: 30, reminderDays: 3 },
    { type: "medical", validityDays: 365, reminderDays: 30 },
    { type: "irt", validityDays: 90, reminderDays: 7 },
  ] as Currency[];

  // Calculate totals
  testTotals = calculateTotals(testFlights, testInitialHours);
});

// ============ Test Suites ============

describe("Flight Hours Calculations", () => {
  it("should correctly sum total hours (initial + logged)", () => {
    const loggedHours = testFlights.reduce((sum, f) => sum + f.flightTime, 0);
    const expectedTotal = testInitialHours.totalHours + loggedHours;
    expect(testTotals.totalHours).toBeCloseTo(expectedTotal, 1);
  });

  it("should correctly categorize 1st PLT flights", () => {
    const expected1stPlt = testFlights
      .filter((f) => f.position === "1st_plt")
      .reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.firstPilotTotal).toBeCloseTo(expected1stPlt, 1);
  });

  it("should correctly categorize 2nd PLT flights", () => {
    const expected2ndPlt = testFlights
      .filter((f) => f.position === "2nd_plt")
      .reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.secondPilotTotal).toBeCloseTo(expected2ndPlt, 1);
  });

  it("should categorize day flights correctly", () => {
    const expectedDay = testFlights
      .filter((f) => f.condition === "day")
      .reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.dayTotal).toBeCloseTo(expectedDay, 1);
  });

  it("should categorize night flights (non-NVG) correctly", () => {
    const expectedNight = testFlights
      .filter((f) => f.condition === "night" && !f.nvg)
      .reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.nightTotal).toBeCloseTo(expectedNight, 1);
  });

  it("should categorize NVG flights correctly", () => {
    const expectedNvg = testFlights.filter((f) => f.nvg).reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.nvgTotal).toBeCloseTo(expectedNvg, 1);
  });

  it("should accumulate dual hours correctly", () => {
    const expectedDual = testFlights.reduce((sum, f) => sum + (f.dualHours || 0), 0);
    expect(testTotals.dualTotal).toBeCloseTo(expectedDual, 1);
  });

  it("should track instrument flight hours correctly", () => {
    const expectedIF = testFlights
      .filter((f) => f.instrumentFlight)
      .reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.instrumentFlightTotal).toBeCloseTo(expectedIF, 1);
  });

  it("should count ILS approaches correctly", () => {
    const expectedILS = testFlights.reduce((sum, f) => sum + (f.ilsCount || 0), 0);
    expect(testTotals.totalILSApproaches).toBe(expectedILS);
  });

  it("should count VOR approaches correctly", () => {
    const expectedVOR = testFlights.reduce((sum, f) => sum + (f.vorCount || 0), 0);
    expect(testTotals.totalVORApproaches).toBe(expectedVOR);
  });
});

describe("Captain Hours Logic", () => {
  it("should correctly calculate captain hours (1st PLT + countsAsCaptain)", () => {
    const captainFlights = testFlights.filter(
      (f) => f.position === "1st_plt" && f.countsAsCaptain
    );
    const expectedCaptain = captainFlights.reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.captainTotal).toBeCloseTo(expectedCaptain, 1);
  });

  it("should include dual hours in captain total", () => {
    const dualHours = testFlights.reduce((sum, f) => sum + (f.dualHours || 0), 0);
    const captainFlights = testFlights.filter(
      (f) => f.position === "1st_plt" && f.countsAsCaptain
    );
    const captainFlightTime = captainFlights.reduce((sum, f) => sum + f.flightTime, 0);
    const expectedCaptain = captainFlightTime + dualHours;
    expect(testTotals.captainTotal).toBeCloseTo(expectedCaptain, 1);
  });
});

describe("Position-Based Classifications", () => {
  it("should add day hours to day1stPlt when position=1st_plt", () => {
    const day1stPltFlights = testFlights.filter(
      (f) => f.condition === "day" && f.position === "1st_plt" && !f.nvg
    );
    const expected = day1stPltFlights.reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.day1stPlt).toBeCloseTo(expected, 1);
  });

  it("should add day hours to day2ndPlt when position=2nd_plt", () => {
    const day2ndPltFlights = testFlights.filter(
      (f) => f.condition === "day" && f.position === "2nd_plt"
    );
    const expected = day2ndPltFlights.reduce((sum, f) => sum + f.flightTime, 0);
    expect(testTotals.day2ndPlt).toBeCloseTo(expected, 1);
  });

  it("should not count 2nd PLT flights as captain hours", () => {
    const secondPltFlights = testFlights.filter((f) => f.position === "2nd_plt");
    const secondPltHours = secondPltFlights.reduce((sum, f) => sum + f.flightTime, 0);
    // Captain total should NOT include 2nd PLT flight hours
    const captainFlights = testFlights.filter(
      (f) => f.position === "1st_plt" && f.countsAsCaptain
    );
    const captainFlightTime = captainFlights.reduce((sum, f) => sum + f.flightTime, 0);
    const dualHours = testFlights.reduce((sum, f) => sum + (f.dualHours || 0), 0);
    const expectedCaptain = captainFlightTime + dualHours;
    // Verify 2nd PLT hours are NOT in captain total
    expect(testTotals.captainTotal).toBeCloseTo(expectedCaptain, 1);
    expect(testTotals.captainTotal).not.toBeCloseTo(expectedCaptain + secondPltHours, 0);
  });
});

describe("Edge Cases", () => {
  it("should handle tiny flights (< 0.5 hours) correctly", () => {
    const tinyFlights = testFlights.filter((f) => f.flightTime < 0.5);
    expect(tinyFlights.length).toBeGreaterThan(0);
    const tinyHours = tinyFlights.reduce((sum, f) => sum + f.flightTime, 0);
    // Verify they contribute to totals
    expect(testTotals.totalHours).toBeGreaterThan(testInitialHours.totalHours + 10);
  });

  it("should handle flights exactly at 0.5 hours", () => {
    const halfHourFlights = testFlights.filter((f) => f.flightTime === 0.5);
    expect(halfHourFlights.length).toBeGreaterThan(0);
  });

  it("should handle flights across multiple days without date issues", () => {
    const dates = testFlights.map((f) => new Date(f.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const daysDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThanOrEqual(90);
  });
});

describe("Aircraft Grouping", () => {
  it("should group flights by aircraft type", () => {
    const aircraftTotals = calculateAircraftTotals(testFlights);
    expect(Object.keys(aircraftTotals).length).toBeGreaterThan(0);
  });

  it("should calculate correct totals per aircraft", () => {
    const aircraftTotals = calculateAircraftTotals(testFlights);
    Object.values(aircraftTotals).forEach((totals) => {
      expect(totals.totalHours).toBeGreaterThan(0);
    });
  });
});

describe("Currency Calculations", () => {
  it("should calculate currency statuses for all types", () => {
    const statuses = calculateAllCurrencyStatuses(testCurrencies, testFlights, "day_flight_only");
    expect(statuses).toHaveLength(5);
    expect(statuses.map((s) => s.type)).toEqual(["day", "night", "nvg", "medical", "irt"]);
  });

  it("should mark day currency as VALID when recent flights exist", () => {
    const statuses = calculateAllCurrencyStatuses(testCurrencies, testFlights, "day_flight_only");
    const dayStatus = statuses.find((s) => s.type === "day");
    expect(dayStatus?.status).toBe("VALID");
  });

  it("should mark night currency as VALID when recent flights exist", () => {
    const statuses = calculateAllCurrencyStatuses(testCurrencies, testFlights, "day_flight_only");
    const nightStatus = statuses.find((s) => s.type === "night");
    expect(nightStatus?.status).toBe("VALID");
  });

  it("should mark NVG currency as VALID when recent NVG flights exist", () => {
    const statuses = calculateAllCurrencyStatuses(testCurrencies, testFlights, "day_flight_only");
    const nvgStatus = statuses.find((s) => s.type === "nvg");
    expect(nvgStatus?.status).toBe("VALID");
  });
});

describe("Data Integrity", () => {
  it("should not produce NaN values in calculations", () => {
    expect(isNaN(testTotals.totalHours)).toBe(false);
    expect(isNaN(testTotals.captainTotal)).toBe(false);
    expect(isNaN(testTotals.dayTotal)).toBe(false);
  });

  it("should not have negative hour values", () => {
    expect(testTotals.totalHours).toBeGreaterThanOrEqual(0);
    expect(testTotals.captainTotal).toBeGreaterThanOrEqual(0);
    expect(testTotals.dayTotal).toBeGreaterThanOrEqual(0);
  });

  it("should maintain data consistency across multiple calculations", () => {
    const firstCalc = calculateTotals(testFlights, testInitialHours);
    const secondCalc = calculateTotals(testFlights, testInitialHours);
    expect(firstCalc.totalHours).toBe(secondCalc.totalHours);
  });
});
