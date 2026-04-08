/**
 * Comprehensive tests for data integrity validation
 * Tests all possible flight scenarios including Dual flights
 */

import { describe, it, expect } from "vitest";
import { validateFlight, validateAllFlights, repairFlight } from "./data-integrity";
import type { Flight } from "@/types/flight";

// Helper function to create a valid base flight
function createBaseFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: "flight_test_001",
    date: "2025-01-20",
    aircraftType: "UH-60M",
    aircraftNumber: "12345",
    captainName: "JOHN DOE",
    coPilotName: "JANE SMITH",
    mission: "TRAINING",
    condition: "day",
    nvg: false,
    position: "1st_plt",
    countsAsCaptain: true,
    flightTime: 2.5,
    dualHours: 0,
    type: "act",
    instrumentFlight: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Data Integrity Validation - All Scenarios", () => {
  
  // ==================== VALID FLIGHTS ====================
  
  describe("Valid Flight Scenarios", () => {
    it("should accept regular flight with only flightTime", () => {
      const flight = createBaseFlight({
        flightTime: 2.5,
        dualHours: 0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Dual-only flight (flightTime = 0, dualHours > 0)", () => {
      const flight = createBaseFlight({
        flightTime: 0,
        dualHours: 1.5,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept combined flight (flightTime > 0, dualHours > 0)", () => {
      const flight = createBaseFlight({
        flightTime: 2.0,
        dualHours: 1.0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept 1st PLT position", () => {
      const flight = createBaseFlight({
        position: "1st_plt",
        countsAsCaptain: true,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept 2nd PLT position", () => {
      const flight = createBaseFlight({
        position: "2nd_plt",
        countsAsCaptain: false,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Day condition", () => {
      const flight = createBaseFlight({
        condition: "day",
        nvg: false,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Night condition without NVG", () => {
      const flight = createBaseFlight({
        condition: "night",
        nvg: false,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Night condition with NVG", () => {
      const flight = createBaseFlight({
        condition: "night",
        nvg: true,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Instrument Flight with simulation time", () => {
      const flight = createBaseFlight({
        instrumentFlight: true,
        simulationTime: 1.0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Instrument Flight with actual hours", () => {
      const flight = createBaseFlight({
        instrumentFlight: true,
        actualHours: 1.5,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept ILS and VOR approaches", () => {
      const flight = createBaseFlight({
        instrumentFlight: true,
        ilsCount: 3,
        vorCount: 2,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });
  });

  // ==================== DUAL FLIGHT SCENARIOS ====================
  
  describe("Dual Flight Scenarios", () => {
    it("should accept Dual Day flight (flightTime = 0, dualHours > 0)", () => {
      const flight = createBaseFlight({
        condition: "day",
        flightTime: 0,
        dualHours: 1.5,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Dual Night flight (flightTime = 0, dualHours > 0)", () => {
      const flight = createBaseFlight({
        condition: "night",
        nvg: false,
        flightTime: 0,
        dualHours: 2.0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Dual NVG flight (flightTime = 0, dualHours > 0)", () => {
      const flight = createBaseFlight({
        condition: "night",
        nvg: true,
        flightTime: 0,
        dualHours: 1.0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept Dual Instrument flight (flightTime = 0, dualHours > 0)", () => {
      const flight = createBaseFlight({
        instrumentFlight: true,
        flightTime: 0,
        dualHours: 1.5,
        simulationTime: 0.5,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept 1st PLT with Dual hours", () => {
      const flight = createBaseFlight({
        position: "1st_plt",
        countsAsCaptain: true,
        flightTime: 0,
        dualHours: 1.0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept 2nd PLT with Dual hours", () => {
      const flight = createBaseFlight({
        position: "2nd_plt",
        countsAsCaptain: false,
        flightTime: 0,
        dualHours: 1.0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });
  });

  // ==================== INVALID FLIGHTS ====================
  
  describe("Invalid Flight Scenarios", () => {
    it("should reject flight with both flightTime = 0 and dualHours = 0", () => {
      const flight = createBaseFlight({
        flightTime: 0,
        dualHours: 0,
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.error.includes("Either flight time or dual hours"))).toBe(true);
    });

    it("should reject flight with negative flightTime", () => {
      const flight = createBaseFlight({
        flightTime: -1.5,
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.error.includes("cannot be negative"))).toBe(true);
    });

    it("should reject flight with negative dualHours", () => {
      const flight = createBaseFlight({
        dualHours: -1.0,
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "dualHours")).toBe(true);
    });

    it("should reject flight with missing date", () => {
      const flight = createBaseFlight({
        date: "",
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "date")).toBe(true);
    });

    it("should reject flight with missing aircraft type", () => {
      const flight = createBaseFlight({
        aircraftType: "",
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "aircraftType")).toBe(true);
    });

    it("should reject flight with missing captain name", () => {
      const flight = createBaseFlight({
        captainName: "",
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "captainName")).toBe(true);
    });

    it("should reject flight with invalid position", () => {
      const flight = createBaseFlight({
        position: "invalid_position" as any,
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "position")).toBe(true);
    });

    it("should reject flight with invalid condition", () => {
      const flight = createBaseFlight({
        condition: "invalid_condition" as any,
      });
      const errors = validateFlight(flight);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "condition")).toBe(true);
    });
  });

  // ==================== EDGE CASES ====================
  
  describe("Edge Cases", () => {
    it("should warn about flight time exceeding 24 hours", () => {
      const flight = createBaseFlight({
        flightTime: 25.0,
      });
      const errors = validateFlight(flight);
      expect(errors.some(e => e.severity === "warning" && e.error.includes("24 hours"))).toBe(true);
    });

    it("should warn about future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const flight = createBaseFlight({
        date: futureDate.toISOString().split("T")[0],
      });
      const errors = validateFlight(flight);
      expect(errors.some(e => e.severity === "warning" && e.error.includes("future"))).toBe(true);
    });

    it("should accept flight with very small flightTime (0.1 hours)", () => {
      const flight = createBaseFlight({
        flightTime: 0.1,
        dualHours: 0,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });

    it("should accept flight with very small dualHours (0.1 hours)", () => {
      const flight = createBaseFlight({
        flightTime: 0,
        dualHours: 0.1,
      });
      const errors = validateFlight(flight);
      expect(errors).toHaveLength(0);
    });
  });

  // ==================== REPAIR FUNCTIONALITY ====================
  
  describe("Repair Functionality", () => {
    it("should repair invalid position to lowercase", () => {
      const flight = createBaseFlight({
        position: "1ST_PLT" as any,
      });
      const { repaired, changes } = repairFlight(flight);
      expect(repaired.position).toBe("1st_plt");
      expect(changes.length).toBeGreaterThan(0);
    });

    it("should repair invalid condition to lowercase", () => {
      const flight = createBaseFlight({
        condition: "DAY" as any,
      });
      const { repaired, changes } = repairFlight(flight);
      expect(repaired.condition).toBe("day");
      expect(changes.length).toBeGreaterThan(0);
    });

    it("should repair non-boolean countsAsCaptain", () => {
      const flight = createBaseFlight({
        countsAsCaptain: "true" as any,
      });
      const { repaired, changes } = repairFlight(flight);
      expect(typeof repaired.countsAsCaptain).toBe("boolean");
      expect(changes.length).toBeGreaterThan(0);
    });

    it("should repair non-number dualHours", () => {
      const flight = createBaseFlight({
        dualHours: "1.5" as any,
      });
      const { repaired, changes } = repairFlight(flight);
      expect(typeof repaired.dualHours).toBe("number");
      expect(repaired.dualHours).toBe(1.5);
      expect(changes.length).toBeGreaterThan(0);
    });
  });

  // ==================== BATCH VALIDATION ====================
  
  describe("Batch Validation", () => {
    it("should validate multiple flights correctly", () => {
      const flights: Flight[] = [
        createBaseFlight({ id: "flight_001", flightTime: 2.0, dualHours: 0 }),
        createBaseFlight({ id: "flight_002", flightTime: 0, dualHours: 1.5 }),
        createBaseFlight({ id: "flight_003", flightTime: 1.5, dualHours: 0.5 }),
      ];
      const report = validateAllFlights(flights);
      expect(report.valid).toBe(true);
      expect(report.totalFlights).toBe(3);
      expect(report.validFlights).toBe(3);
      expect(report.errors).toHaveLength(0);
    });

    it("should detect invalid flights in batch", () => {
      const flights: Flight[] = [
        createBaseFlight({ id: "flight_001", flightTime: 2.0, dualHours: 0 }),
        createBaseFlight({ id: "flight_002", flightTime: 0, dualHours: 0 }), // Invalid
        createBaseFlight({ id: "flight_003", flightTime: 1.5, dualHours: 0.5 }),
      ];
      const report = validateAllFlights(flights);
      expect(report.valid).toBe(false);
      expect(report.totalFlights).toBe(3);
      expect(report.validFlights).toBe(2);
      expect(report.errors.length).toBeGreaterThan(0);
    });
  });
});
