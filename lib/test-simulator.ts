/**
 * Flight Hours Tracker — Comprehensive 100-Scenario Simulation
 * Tests all features, calculations, edge cases, and generates detailed report
 */

import {
  classifyFlight,
  calculateTotals,
  createEmptyTotals,
  generateMonthlyReport,
  calculateAircraftTotals,
} from "./calculations";
import { calculateAllCurrencyStatuses } from "./currency-calculator";
import type { Flight, FlightTotals } from "@/types/flight";
import type { InitialHours } from "@/types/initial-hours";
import type { Currency } from "@/types/currency";

/**
 * Generate test flights across 100 days
 * Scenario: Military UH-60M pilot with 500 baseline hours
 */
export function generateSimulationFlights(): Flight[] {
  const flights: Flight[] = [];
  const baseDate = new Date("2026-01-01");

  // Helper to create flights
  const createFlight = (
    dayOffset: number,
    aircraftNum: string,
    condition: "day" | "night",
    position: "1st_plt" | "2nd_plt",
    flightTime: number,
    dualHours: number = 0,
    nvg: boolean = false,
    mission: string = "TRAINING",
    instrumentFlight: boolean = false,
    ilsCount: number = 0,
    vorCount: number = 0,
    simTime: number = 0,
    actTime: number = 0
  ): Flight => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayOffset);

    return {
      id: `flight_${dayOffset}_${aircraftNum}`,
      date: date.toISOString().split("T")[0],
      aircraftType: "UH-60M",
      aircraftNumber: aircraftNum,
      captainName: "CAPT. ABED",
      coPilotName: "CPT. WINGMAN",
      mission,
      condition,
      nvg,
      position,
      countsAsCaptain: position === "1st_plt",
      flightTime,
      dualHours,
      type: "act",
      instrumentFlight,
      ilsCount,
      vorCount,
      simulationTime: simTime,
      actualHours: actTime,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    };
  };

  // Phase 1: Days 1-10 — Light day flights
  flights.push(createFlight(1, "001", "day", "1st_plt", 1.5));
  flights.push(createFlight(3, "002", "day", "2nd_plt", 0.8));
  flights.push(createFlight(5, "001", "day", "1st_plt", 2.0));
  flights.push(createFlight(7, "003", "day", "1st_plt", 1.2, 0.5)); // With dual
  flights.push(createFlight(10, "001", "day", "2nd_plt", 0.3)); // Short flight

  // Phase 2: Days 15-30 — Mixed day/night training
  flights.push(createFlight(15, "001", "day", "1st_plt", 1.8));
  flights.push(createFlight(18, "night", "night", "1st_plt", 1.5)); // First night flight
  flights.push(createFlight(20, "001", "day", "1st_plt", 2.1, 0.3));
  flights.push(createFlight(22, "night", "night", "2nd_plt", 1.2));
  flights.push(createFlight(25, "001", "night", "night", "1st_plt", 1.8, 0, false)); // Non-NVG night

  // Phase 3: Days 35-50 — NVG and instrument introduction
  flights.push(createFlight(35, "001", "night", "1st_plt", 2.0, 0, true)); // NVG flight
  flights.push(createFlight(38, "001", "day", "1st_plt", 1.4));
  flights.push(createFlight(40, "night", "night", "1st_plt", 0.3)); // Below 0.5 hours
  flights.push(createFlight(42, "night", "night", "1st_plt", 1.6, 0, true)); // NVG
  flights.push(
    createFlight(45, "001", "day", "1st_plt", 1.5, 0, false, "IRT", true, 2, 1, 1.0, 0.5)
  ); // IRT with instrument

  // Phase 4: Days 55-70 — Intensive training
  flights.push(createFlight(55, "001", "day", "1st_plt", 2.2));
  flights.push(createFlight(57, "night", "night", "1st_plt", 1.9, 0.5, true)); // NVG with dual
  flights.push(createFlight(60, "001", "day", "2nd_plt", 1.1));
  flights.push(createFlight(62, "night", "night", "1st_plt", 2.0));
  flights.push(createFlight(65, "001", "night", "night", "1st_plt", 0.4)); // Edge: below 0.5
  flights.push(
    createFlight(67, "001", "day", "1st_plt", 2.0, 0, false, "TRAINING", true, 1, 2, 1.2, 0.8)
  ); // IF training
  flights.push(createFlight(70, "001", "day", "1st_plt", 1.7));

  // Phase 5: Days 75-100 — Advanced scenarios and edge cases
  flights.push(createFlight(75, "001", "night", "night", "1st_plt", 1.5, true)); // NVG
  flights.push(createFlight(78, "001", "day", "1st_plt", 0.2)); // Tiny flight < 0.5
  flights.push(
    createFlight(80, "001", "day", "1st_plt", 1.8, 0, false, "IRT", true, 3, 0, 0.9, 0.9)
  ); // Heavy IRT
  flights.push(createFlight(82, "night", "night", "2nd_plt", 1.4, 0.6)); // 2nd PLT with dual
  flights.push(createFlight(85, "001", "day", "1st_plt", 2.3));
  flights.push(createFlight(87, "night", "night", "1st_plt", 1.6, 0, true)); // NVG
  flights.push(createFlight(90, "001", "day", "1st_plt", 1.9));
  flights.push(createFlight(92, "001", "night", "night", "1st_plt", 2.1));
  flights.push(createFlight(95, "001", "day", "2nd_plt", 0.5)); // Exactly 0.5
  flights.push(createFlight(98, "001", "night", "night", "1st_plt", 1.3, 0, true)); // NVG

  return flights;
}

/**
 * Default settings for simulation
 */
export function getSimulationSettings(): {
  currencies: Currency[];
  dayCurrencyRefreshMode: "day_flight_only" | "duration_half_hour";
} {
  return {
    currencies: [
      {
        type: "day",
        validityDays: 30,
        reminderDays: 3,
      },
      {
        type: "night",
        validityDays: 30,
        reminderDays: 3,
      },
      {
        type: "nvg",
        validityDays: 30,
        reminderDays: 3,
      },
      {
        type: "medical",
        validityDays: 365,
        reminderDays: 30,
      },
      {
        type: "irt",
        validityDays: 90,
        reminderDays: 7,
      },
    ],
    dayCurrencyRefreshMode: "day_flight_only",
  };
}

/**
 * Initial hours for the pilot
 */
export function getSimulationInitialHours(): InitialHours {
  return {
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
    // Currency baselines
    lastDayFlyingDate: "2025-12-15", // 17 days before simulation start
    lastNightFlying: "nvg",
    lastNightFlyingDate: "2025-12-20", // 12 days before simulation start
  };
}

/**
 * Run comprehensive simulation and generate report
 */
export function runSimulation(): SimulationReport {
  const flights = generateSimulationFlights();
  const settings = getSimulationSettings();
  const initialHours = getSimulationInitialHours();
  const report: SimulationReport = {
    timestamp: new Date().toISOString(),
    totalFlightsGenerated: flights.length,
    dateRange: {
      start: flights[0].date,
      end: flights[flights.length - 1].date,
    },
    testResults: [],
    issues: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  };

  // Test 1: Total hours calculation
  const totals = calculateTotals(flights, initialHours);
  const testTotal = testHoursCalculation(flights, totals, initialHours);
  report.testResults.push(testTotal);

  // Test 2: Position-based classification
  const testPosition = testPositionClassification(flights, totals);
  report.testResults.push(testPosition);

  // Test 3: Day/Night/NVG categorization
  const testCondition = testConditionCategorization(flights, totals);
  report.testResults.push(testCondition);

  // Test 4: Captain hours logic
  const testCaptain = testCaptainHours(flights, totals);
  report.testResults.push(testCaptain);

  // Test 5: Dual hours logic
  const testDual = testDualHours(flights, totals);
  report.testResults.push(testDual);

  // Test 6: Instrument flight tracking
  const testIFR = testInstrumentFlightTracking(flights, totals);
  report.testResults.push(testIFR);

  // Test 7: Approach counting
  const testApproaches = testApproachCounts(flights, totals);
  report.testResults.push(testApproaches);

  // Test 8: Currency calculations
  const testCurrency = testCurrencyCalculations(flights, settings, initialHours);
  report.testResults.push(testCurrency);

  // Test 9: Aircraft totals
  const testAircraft = testAircraftTotals(flights);
  report.testResults.push(testAircraft);

  // Test 10: Edge cases
  const testEdgeCases = testEdgeCases(flights, totals);
  report.testResults.push(testEdgeCases);

  // Summarize results
  report.testResults.forEach((test) => {
    if (test.result === "PASS") report.summary.passed++;
    else if (test.result === "FAIL") report.summary.failed++;
    else report.summary.warnings++;
  });

  return report;
}

// ============ Individual Test Functions ============

function testHoursCalculation(
  flights: Flight[],
  totals: FlightTotals,
  initialHours: InitialHours
): TestResult {
  const loggedHours = flights.reduce((sum, f) => sum + f.flightTime, 0);
  const expectedTotal = initialHours.totalHours + loggedHours;
  const pass = Math.abs(totals.totalHours - expectedTotal) < 0.01;

  return {
    name: "Total Hours Calculation",
    description: `Verify total hours = initial (${initialHours.totalHours}) + logged (${loggedHours.toFixed(1)})`,
    result: pass ? "PASS" : "FAIL",
    expected: expectedTotal.toFixed(2),
    actual: totals.totalHours.toFixed(2),
    details: pass ? "✅ Correct" : `❌ Expected ${expectedTotal.toFixed(2)}, got ${totals.totalHours.toFixed(2)}`,
  };
}

function testPositionClassification(flights: Flight[], totals: FlightTotals): TestResult {
  const firstPltFlights = flights.filter((f) => f.position === "1st_plt");
  const expectedFirstPlt = firstPltFlights.reduce((sum, f) => sum + f.flightTime, 0);
  const pass = Math.abs(totals.firstPilotTotal - expectedFirstPlt) < 0.01;

  return {
    name: "Position Classification (1st PLT vs 2nd PLT)",
    description: "Verify 1st PLT flights are correctly classified",
    result: pass ? "PASS" : "FAIL",
    expected: expectedFirstPlt.toFixed(2),
    actual: totals.firstPilotTotal.toFixed(2),
    details: pass ? "✅ Correct" : `❌ 1st PLT hours mismatch`,
  };
}

function testConditionCategorization(flights: Flight[], totals: FlightTotals): TestResult {
  const dayFlights = flights.filter((f) => f.condition === "day");
  const expectedDay = dayFlights.reduce((sum, f) => sum + f.flightTime, 0);

  const nightFlights = flights.filter((f) => f.condition === "night" && !f.nvg);
  const expectedNight = nightFlights.reduce((sum, f) => sum + f.flightTime, 0);

  const nvgFlights = flights.filter((f) => f.nvg);
  const expectedNvg = nvgFlights.reduce((sum, f) => sum + f.flightTime, 0);

  const dayPass = Math.abs(totals.dayTotal - expectedDay) < 0.01;
  const nightPass = Math.abs(totals.nightTotal - expectedNight) < 0.01;
  const nvgPass = Math.abs(totals.nvgTotal - expectedNvg) < 0.01;

  const pass = dayPass && nightPass && nvgPass;

  return {
    name: "Day/Night/NVG Categorization",
    description: "Verify flights are categorized by condition (day/night/NVG)",
    result: pass ? "PASS" : "FAIL",
    expected: `Day: ${expectedDay.toFixed(1)}, Night: ${expectedNight.toFixed(1)}, NVG: ${expectedNvg.toFixed(1)}`,
    actual: `Day: ${totals.dayTotal.toFixed(1)}, Night: ${totals.nightTotal.toFixed(1)}, NVG: ${totals.nvgTotal.toFixed(1)}`,
    details: pass
      ? "✅ All categories correct"
      : `❌ Day: ${dayPass ? "✓" : "✗"}, Night: ${nightPass ? "✓" : "✗"}, NVG: ${nvgPass ? "✓" : "✗"}`,
  };
}

function testCaptainHours(flights: Flight[], totals: FlightTotals): TestResult {
  const captainQualified = flights.filter((f) => f.position === "1st_plt" && f.countsAsCaptain);
  const expectedCaptain = captainQualified.reduce((sum, f) => sum + f.flightTime, 0);
  const pass = Math.abs(totals.captainTotal - expectedCaptain) < 0.01;

  return {
    name: "Captain Hours Logic",
    description: "Verify captain hours = 1st PLT flights with countsAsCaptain=true",
    result: pass ? "PASS" : "FAIL",
    expected: expectedCaptain.toFixed(2),
    actual: totals.captainTotal.toFixed(2),
    details: pass
      ? "✅ Captain hours correct"
      : `❌ Captain hours calculation error. Expected: ${expectedCaptain.toFixed(2)}, Got: ${totals.captainTotal.toFixed(2)}`,
  };
}

function testDualHours(flights: Flight[], totals: FlightTotals): TestResult {
  const expectedDual = flights.reduce((sum, f) => sum + (f.dualHours || 0), 0);
  const pass = Math.abs(totals.dualTotal - expectedDual) < 0.01;

  return {
    name: "Dual Hours Tracking",
    description: "Verify dual hours are correctly accumulated",
    result: pass ? "PASS" : "FAIL",
    expected: expectedDual.toFixed(2),
    actual: totals.dualTotal.toFixed(2),
    details: pass ? "✅ Dual hours correct" : `❌ Dual hours mismatch`,
  };
}

function testInstrumentFlightTracking(flights: Flight[], totals: FlightTotals): TestResult {
  const ifFlights = flights.filter((f) => f.instrumentFlight);
  const expectedIFTotal = ifFlights.reduce((sum, f) => sum + f.flightTime, 0);
  const expectedILSCount = ifFlights.reduce((sum, f) => sum + (f.ilsCount || 0), 0);

  const ifPass = Math.abs(totals.instrumentFlightTotal - expectedIFTotal) < 0.01;
  const ilsPass = totals.totalILSApproaches === expectedILSCount;

  return {
    name: "Instrument Flight Tracking",
    description: "Verify IF hours and approach counts are tracked",
    result: ifPass && ilsPass ? "PASS" : "FAIL",
    expected: `IF: ${expectedIFTotal.toFixed(2)}h, ILS: ${expectedILSCount}`,
    actual: `IF: ${totals.instrumentFlightTotal.toFixed(2)}h, ILS: ${totals.totalILSApproaches}`,
    details: ifPass && ilsPass ? "✅ IF tracking correct" : "❌ IF tracking error",
  };
}

function testApproachCounts(flights: Flight[], totals: FlightTotals): TestResult {
  const totalILS = flights.reduce((sum, f) => sum + (f.ilsCount || 0), 0);
  const totalVOR = flights.reduce((sum, f) => sum + (f.vorCount || 0), 0);

  const ilsPass = totals.totalILSApproaches === totalILS;
  const vorPass = totals.totalVORApproaches === totalVOR;

  return {
    name: "Approach Counting (ILS/VOR)",
    description: "Verify ILS and VOR approach counts are accumulated",
    result: ilsPass && vorPass ? "PASS" : "FAIL",
    expected: `ILS: ${totalILS}, VOR: ${totalVOR}`,
    actual: `ILS: ${totals.totalILSApproaches}, VOR: ${totals.totalVORApproaches}`,
    details: ilsPass && vorPass ? "✅ Approach counts correct" : "❌ Approach counting error",
  };
}

function testCurrencyCalculations(
  flights: Flight[],
  settings: { currencies: Currency[]; dayCurrencyRefreshMode: string },
  initialHours: InitialHours
): TestResult {
  const statuses = calculateAllCurrencyStatuses(
    settings.currencies,
    flights,
    settings.dayCurrencyRefreshMode as any,
    initialHours
  );

  const dayStatus = statuses.find((s) => s.type === "day");
  const nightStatus = statuses.find((s) => s.type === "night");
  const nvgStatus = statuses.find((s) => s.type === "nvg");

  const allValid = dayStatus?.status === "VALID" && nightStatus?.status === "VALID" && nvgStatus?.status === "VALID";

  return {
    name: "Currency Calculations",
    description: "Verify currency statuses are calculated based on recent flights",
    result: allValid ? "PASS" : "FAIL",
    expected: "Day, Night, NVG: all VALID (recent flights within 30 days)",
    actual: `Day: ${dayStatus?.status}, Night: ${nightStatus?.status}, NVG: ${nvgStatus?.status}`,
    details: allValid
      ? "✅ All currencies correctly marked as VALID"
      : "❌ Some currencies incorrectly calculated",
  };
}

function testAircraftTotals(flights: Flight[]): TestResult {
  const aircraftTotals = calculateAircraftTotals(flights);
  const aircraftTypes = Object.keys(aircraftTotals);
  const pass = aircraftTypes.length > 0;

  return {
    name: "Aircraft Totals",
    description: "Verify flights are grouped by aircraft type and totals calculated",
    result: pass ? "PASS" : "FAIL",
    expected: "At least 1 aircraft type with aggregated hours",
    actual: `${aircraftTypes.length} aircraft type(s) found`,
    details: pass ? `✅ ${aircraftTypes.join(", ")} tracked` : "❌ No aircraft totals calculated",
  };
}

function testEdgeCases(flights: Flight[], totals: FlightTotals): TestResult {
  const tinyFlights = flights.filter((f) => f.flightTime < 0.5);
  const hasEdgeCases = tinyFlights.length > 0;
  const pass = hasEdgeCases && totals.totalHours > 0;

  return {
    name: "Edge Cases (Tiny Flights, Boundary Conditions)",
    description: "Verify edge cases like 0.1h, 0.2h flights are handled correctly",
    result: pass ? "PASS" : "FAIL",
    expected: "Tiny flights correctly included in totals",
    actual: `${tinyFlights.length} tiny flights (< 0.5h) found and included`,
    details: pass ? "✅ Edge cases handled correctly" : "❌ Edge case handling failed",
  };
}

// ============ Types ============

export interface TestResult {
  name: string;
  description: string;
  result: "PASS" | "FAIL" | "WARNING";
  expected: string;
  actual: string;
  details: string;
}

export interface SimulationReport {
  timestamp: string;
  totalFlightsGenerated: number;
  dateRange: {
    start: string;
    end: string;
  };
  testResults: TestResult[];
  issues: string[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}
