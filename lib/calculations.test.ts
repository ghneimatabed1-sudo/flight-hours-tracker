/**
 * Tests for flight hours calculations with new position-based system
 */

import { describe, it, expect } from "vitest";
import { calculateTotals, classifyFlight, createEmptyTotals } from "./calculations";
import type { Flight } from "@/types/flight";

describe("Flight Hours Calculations - New System", () => {
  const baseFlight: Flight = {
    id: "test-1",
    date: "2025-01-15",
    aircraftType: "UH-60M",
    aircraftNumber: "001",
    captainName: "BASSAM",
    coPilotName: "RADWAN",
    mission: "MTP CRS 1",
    condition: "day",
    nvg: false,
    position: "1st_plt",
    countsAsCaptain: true,
    flightTime: 2.5,
    dualHours: 0,
    type: "act",
    instrumentFlight: false,
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  };

  describe("1st PLT with Captain Qualification", () => {
    it("should add hours to both 1st PLT and Captain", () => {
      const flight: Flight = {
        ...baseFlight,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.5,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.day1stPlt).toBe(2.5);
      expect(totals.firstPilotTotal).toBe(2.5);
      expect(totals.captainTotal).toBe(2.5); // Also counts as captain
      expect(totals.dayTotal).toBe(2.5);
      expect(totals.totalHours).toBe(2.5);
    });
  });

  describe("1st PLT without Captain Qualification", () => {
    it("should add hours to 1st PLT only, NOT to Captain", () => {
      const flight: Flight = {
        ...baseFlight,
        position: "1st_plt",
        countsAsCaptain: false, // NOT qualified as captain
        flightTime: 2.5,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.day1stPlt).toBe(2.5);
      expect(totals.firstPilotTotal).toBe(2.5);
      expect(totals.captainTotal).toBe(0); // Should NOT count as captain
      expect(totals.dayTotal).toBe(2.5);
      expect(totals.totalHours).toBe(2.5);
    });
  });

  describe("2nd PLT (Second Pilot)", () => {
    it("should add hours to 2nd PLT only", () => {
      const flight: Flight = {
        ...baseFlight,
        position: "2nd_plt",
        countsAsCaptain: false, // Doesn't apply to 2nd PLT
        flightTime: 1.8,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.day2ndPlt).toBe(1.8);
      expect(totals.secondPilotTotal).toBe(1.8);
      expect(totals.captainTotal).toBe(0);
      expect(totals.dayTotal).toBe(1.8);
      expect(totals.totalHours).toBe(1.8);
    });
  });

  describe("Dual Hours (Independent)", () => {
    it("should add dual hours independently from flight time", () => {
      const flight: Flight = {
        ...baseFlight,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        dualHours: 0.5, // Independent dual hours
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.day1stPlt).toBe(2.0); // Flight time only
      expect(totals.dayDual).toBe(0.5); // Dual hours
      expect(totals.dayTotal).toBe(2.5); // 2.0 + 0.5
      expect(totals.captainTotal).toBe(2.5); // Flight time (2.0) + Dual hours (0.5) - NEW LOGIC
      expect(totals.dualTotal).toBe(0.5);
      expect(totals.totalHours).toBe(2.5); // Flight time + dual hours
    });
  });

  describe("Night Flying", () => {
    it("should classify night 1st PLT with captain qualification", () => {
      const flight: Flight = {
        ...baseFlight,
        condition: "night",
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 1.5,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.night1stPlt).toBe(1.5);
      expect(totals.firstPilotTotal).toBe(1.5);
      expect(totals.captainTotal).toBe(1.5);
      expect(totals.nightTotal).toBe(1.5);
    });

    it("should classify night 2nd PLT", () => {
      const flight: Flight = {
        ...baseFlight,
        condition: "night",
        position: "2nd_plt",
        flightTime: 1.2,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.night2ndPlt).toBe(1.2);
      expect(totals.secondPilotTotal).toBe(1.2);
      expect(totals.captainTotal).toBe(0);
      expect(totals.nightTotal).toBe(1.2);
    });
  });

  describe("NVG Hours", () => {
    it("should count NVG hours for night + NVG flight", () => {
      const flight: Flight = {
        ...baseFlight,
        condition: "night",
        nvg: true,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.nvgTotal).toBe(2.0);
      expect(totals.nightTotal).toBe(2.0);
      expect(totals.captainTotal).toBe(2.0);
    });

    it("should count dual NVG hours separately", () => {
      const flight: Flight = {
        ...baseFlight,
        condition: "night",
        nvg: true,
        position: "1st_plt",
        countsAsCaptain: false,
        flightTime: 1.0,
        dualHours: 0.5,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      expect(totals.nvgTotal).toBe(1.5); // 1.0 flight + 0.5 dual
      expect(totals.dualNVGHours).toBe(0.5);
      expect(totals.nightTotal).toBe(1.5);
    });
  });

  describe("Multiple Flights", () => {
    it("should correctly sum multiple flights", () => {
      const flights: Flight[] = [
        {
          ...baseFlight,
          id: "f1",
          position: "1st_plt",
          countsAsCaptain: true,
          flightTime: 2.0,
          dualHours: 0,
        },
        {
          ...baseFlight,
          id: "f2",
          position: "1st_plt",
          countsAsCaptain: false, // Not qualified
          flightTime: 1.5,
          dualHours: 0.5,
        },
        {
          ...baseFlight,
          id: "f3",
          position: "2nd_plt",
          flightTime: 1.0,
          dualHours: 0,
        },
      ];

      const totals = calculateTotals(flights);

      expect(totals.firstPilotTotal).toBe(3.5); // 2.0 + 1.5
      expect(totals.captainTotal).toBe(2.5); // First flight (2.0) + Second flight Dual (0.5) - NEW LOGIC
      expect(totals.secondPilotTotal).toBe(1.0);
      expect(totals.dualTotal).toBe(0.5);
      expect(totals.totalHours).toBe(5.0); // 2.0 + 1.5 + 0.5 + 1.0
    });
  });

  describe("Instrument Flight", () => {
    it("should count instrument flight hours correctly", () => {
      const flight: Flight = {
        ...baseFlight,
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 2.0,
        instrumentFlight: true,
        simulationTime: 1.6,
        actualHours: 0.5,
        ilsCount: 2,
        vorCount: 1,
      };

      const totals = classifyFlight(flight, createEmptyTotals());

      // I.F Total = Flight Time (not SIM or ACT)
      expect(totals.instrumentFlightTotal).toBe(2.0);
      // SIM and ACT are independent tracking
      expect(totals.ifSim).toBe(1.6);
      expect(totals.ifAct).toBe(0.5);
      expect(totals.totalILSApproaches).toBe(2);
      expect(totals.totalVORApproaches).toBe(1);
      // Total Hours = Flight Time only (SIM/ACT don't add)
      expect(totals.totalHours).toBe(2.0);
    });
  });
});
