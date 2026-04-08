/**
 * Tests for Initial Hours calculation
 * Ensures Initial Hours are added correctly to Grand Total
 */

import { describe, it, expect } from "vitest";
import { calculateGrandTotals, calculateTotals } from "../lib/calculations";
import type { Flight } from "@/types/flight";
import type { InitialHours } from "@/types/initial-hours";

describe("Initial Hours Calculation", () => {
  const currentYear = 2026;
  const currentMonth = 1; // January

  const initialHours: InitialHours = {
    totalHours: 500,
    dayHours: 200,
    nightHours: 150,
    nvgHours: 150,
    instrumentHours: 100,
    captainHours: 300,
    copilotHours: 100,
    dualDayHours: 50,
    dualNightHours: 30,
    dualNVGHours: 20,
    day1stPlt: 100,
    day2ndPlt: 50,
    night1stPlt: 75,
    night2ndPlt: 45,
    nvg1stPlt: 80,
    nvg2ndPlt: 50,
  };

  const testFlight: Flight = {
    id: "1",
    date: "2026-01-15",
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
    dualHours: 1.5,
    type: "act",
    instrumentFlight: false,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
  };

  describe("calculateTotals with Initial Hours", () => {
    it("should add Initial Hours to totals", () => {
      const totals = calculateTotals([], initialHours);
      
      expect(totals.totalHours).toBe(500);
      expect(totals.dayTotal).toBe(200);
      expect(totals.nightTotal).toBe(150);
      expect(totals.nvgTotal).toBe(150);
      expect(totals.instrumentFlightTotal).toBe(100);
      expect(totals.captainTotal).toBe(300);
    });

    it("should add flight hours + Initial Hours", () => {
      const totals = calculateTotals([testFlight], initialHours);
      
      // testFlight: 2.0 flight + 1.5 dual = 3.5 hours
      expect(totals.totalHours).toBe(503.5); // 500 + 3.5
      expect(totals.dayTotal).toBeGreaterThan(200); // 200 + day hours from flight
      expect(totals.captainTotal).toBeGreaterThan(300); // 300 + captain hours from flight
    });

    it("should work without Initial Hours", () => {
      const totals = calculateTotals([testFlight]);
      
      expect(totals.totalHours).toBe(3.5); // Only flight hours
      expect(totals.dayTotal).toBeGreaterThan(0);
    });
  });

  describe("calculateGrandTotals with Initial Hours", () => {
    it("should add Initial Hours to cumulative total only once", () => {
      const grandTotals = calculateGrandTotals(
        [testFlight],
        currentYear,
        currentMonth,
        initialHours
      );

      // Cumulative should include Initial Hours + flight hours
      expect(grandTotals.cumulativeTotal).toBe(503.5); // 500 + 3.5
      expect(grandTotals.totalHours).toBe(503.5);
    });

    it("should NOT add Initial Hours to monthly totals", () => {
      const grandTotals = calculateGrandTotals(
        [testFlight],
        currentYear,
        currentMonth,
        initialHours
      );

      // This month should only show flight hours (not Initial Hours)
      expect(grandTotals.thisMonthTotal).toBe(3.5); // Only flight hours
    });

    it("should work with multiple flights", () => {
      const flight2: Flight = {
        ...testFlight,
        id: "2",
        date: "2026-01-20",
        flightTime: 1.0,
        dualHours: 0.5,
      };

      const grandTotals = calculateGrandTotals(
        [testFlight, flight2],
        currentYear,
        currentMonth,
        initialHours
      );

      // Total: 500 + 3.5 + 1.5 = 505.0
      expect(grandTotals.cumulativeTotal).toBe(505.0);
      expect(grandTotals.thisMonthTotal).toBe(5.0); // 3.5 + 1.5
    });

    it("should work without Initial Hours", () => {
      const grandTotals = calculateGrandTotals(
        [testFlight],
        currentYear,
        currentMonth
      );

      expect(grandTotals.cumulativeTotal).toBe(3.5); // Only flight hours
      expect(grandTotals.thisMonthTotal).toBe(3.5);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero Initial Hours", () => {
      const zeroInitial: InitialHours = {
        totalHours: 0,
        dayHours: 0,
        nightHours: 0,
        nvgHours: 0,
        instrumentHours: 0,
        captainHours: 0,
        copilotHours: 0,
        dualDayHours: 0,
        dualNightHours: 0,
        dualNVGHours: 0,
        day1stPlt: 0,
        day2ndPlt: 0,
        night1stPlt: 0,
        night2ndPlt: 0,
        nvg1stPlt: 0,
        nvg2ndPlt: 0,
      };

      const totals = calculateTotals([testFlight], zeroInitial);
      expect(totals.totalHours).toBe(3.5);
    });

    it("should handle large Initial Hours", () => {
      const largeInitial: InitialHours = {
        totalHours: 10000,
        dayHours: 200,
        nightHours: 150,
        nvgHours: 150,
        instrumentHours: 100,
        captainHours: 300,
        copilotHours: 100,
        dualDayHours: 50,
        dualNightHours: 30,
        dualNVGHours: 20,
        day1stPlt: 100,
        day2ndPlt: 50,
        night1stPlt: 75,
        night2ndPlt: 45,
        nvg1stPlt: 80,
        nvg2ndPlt: 50,
      };

      const totals = calculateTotals([testFlight], largeInitial);
      expect(totals.totalHours).toBe(10003.5);
    });

    it("should handle no flights with Initial Hours", () => {
      const grandTotals = calculateGrandTotals(
        [],
        currentYear,
        currentMonth,
        initialHours
      );

      expect(grandTotals.cumulativeTotal).toBe(500);
      expect(grandTotals.thisMonthTotal).toBe(0);
    });
  });
});
