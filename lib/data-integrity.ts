/**
 * Data integrity validation and corruption detection
 */

import type { Flight } from "@/types/flight";

export interface ValidationError {
  flightId: string;
  field: string;
  error: string;
  severity: "error" | "warning";
  recoverable: boolean;
}

export interface IntegrityReport {
  valid: boolean;
  totalFlights: number;
  validFlights: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  corruptedFlights: string[];
}

/**
 * Validate a single flight entry
 */
export function validateFlight(flight: Flight): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!flight.id) {
    errors.push({
      flightId: flight.id || "unknown",
      field: "id",
      error: "Missing flight ID",
      severity: "error",
      recoverable: false,
    });
  }

  if (!flight.date) {
    errors.push({
      flightId: flight.id,
      field: "date",
      error: "Missing flight date",
      severity: "error",
      recoverable: false,
    });
  } else {
    // Validate date format
    const date = new Date(flight.date);
    if (isNaN(date.getTime())) {
      errors.push({
        flightId: flight.id,
        field: "date",
        error: "Invalid date format",
        severity: "error",
        recoverable: false,
      });
    }
    // Check for future dates
    if (date > new Date()) {
      errors.push({
        flightId: flight.id,
        field: "date",
        error: "Flight date is in the future",
        severity: "warning",
        recoverable: true,
      });
    }
  }

  // Aircraft validation
  if (!flight.aircraftType || flight.aircraftType.trim() === "") {
    errors.push({
      flightId: flight.id,
      field: "aircraftType",
      error: "Missing aircraft type",
      severity: "error",
      recoverable: false,
    });
  }

  if (!flight.aircraftNumber || flight.aircraftNumber.trim() === "") {
    errors.push({
      flightId: flight.id,
      field: "aircraftNumber",
      error: "Missing aircraft number",
      severity: "error",
      recoverable: false,
    });
  }

  // Crew validation
  if (!flight.captainName || flight.captainName.trim() === "") {
    errors.push({
      flightId: flight.id,
      field: "captainName",
      error: "Missing captain name",
      severity: "error",
      recoverable: false,
    });
  }

  if (!flight.coPilotName || flight.coPilotName.trim() === "") {
    errors.push({
      flightId: flight.id,
      field: "coPilotName",
      error: "Missing co-pilot name",
      severity: "error",
      recoverable: false,
    });
  }

  // Flight time validation
  if (typeof flight.flightTime !== "number" || isNaN(flight.flightTime)) {
    errors.push({
      flightId: flight.id,
      field: "flightTime",
      error: "Invalid flight time",
      severity: "error",
      recoverable: false,
    });
  } else {
    // Allow flightTime = 0 if dualHours > 0 (Dual-only flights)
    if (flight.flightTime < 0) {
      errors.push({
        flightId: flight.id,
        field: "flightTime",
        error: "Flight time cannot be negative",
        severity: "error",
        recoverable: false,
      });
    }
    // Check that at least one of flightTime or dualHours is > 0
    if (flight.flightTime === 0 && (flight.dualHours === undefined || flight.dualHours === 0)) {
      errors.push({
        flightId: flight.id,
        field: "flightTime",
        error: "Either flight time or dual hours must be greater than 0",
        severity: "error",
        recoverable: false,
      });
    }
    if (flight.flightTime > 24) {
      errors.push({
        flightId: flight.id,
        field: "flightTime",
        error: "Flight time exceeds 24 hours",
        severity: "warning",
        recoverable: true,
      });
    }
  }

  // Condition validation
  if (!["day", "night"].includes(flight.condition)) {
    errors.push({
      flightId: flight.id,
      field: "condition",
      error: `Invalid condition: ${flight.condition}`,
      severity: "error",
      recoverable: true,
    });
  }

  // Position validation
  if (!["1st_plt", "2nd_plt"].includes(flight.position)) {
    errors.push({
      flightId: flight.id,
      field: "position",
      error: `Invalid position: ${flight.position}`,
      severity: "error",
      recoverable: true,
    });
  }
  
  // Counts as captain validation
  if (typeof flight.countsAsCaptain !== "boolean") {
    errors.push({
      flightId: flight.id,
      field: "countsAsCaptain",
      error: "countsAsCaptain must be boolean",
      severity: "error",
      recoverable: true,
    });
  }
  
  // Dual hours validation
  if (typeof flight.dualHours !== "number" || flight.dualHours < 0) {
    errors.push({
      flightId: flight.id,
      field: "dualHours",
      error: "dualHours must be a non-negative number",
      severity: "error",
      recoverable: true,
    });
  }

  // NVG validation
  if (typeof flight.nvg !== "boolean") {
    errors.push({
      flightId: flight.id,
      field: "nvg",
      error: "Invalid NVG value (must be boolean)",
      severity: "error",
      recoverable: true,
    });
  }

  // Instrument flight validation
  if (typeof flight.instrumentFlight !== "boolean") {
    errors.push({
      flightId: flight.id,
      field: "instrumentFlight",
      error: "Invalid instrument flight value (must be boolean)",
      severity: "error",
      recoverable: true,
    });
  }

  // Simulation time validation
  if (flight.simulationTime !== undefined && flight.simulationTime !== null) {
    if (typeof flight.simulationTime !== "number" || isNaN(flight.simulationTime)) {
      errors.push({
        flightId: flight.id,
        field: "simulationTime",
        error: "Invalid simulation time",
        severity: "error",
        recoverable: true,
      });
    } else if (flight.simulationTime < 0) {
      errors.push({
        flightId: flight.id,
        field: "simulationTime",
        error: "Simulation time cannot be negative",
        severity: "error",
        recoverable: true,
      });
    } else if (flight.flightTime > 0 && flight.simulationTime > flight.flightTime) {
      // Only check if flightTime > 0 (skip check for Dual-only flights)
      errors.push({
        flightId: flight.id,
        field: "simulationTime",
        error: "Simulation time cannot exceed total flight time",
        severity: "warning",
        recoverable: true,
      });
    }
  }

  // Approach counts validation
  if (flight.ilsCount !== undefined && flight.ilsCount !== null) {
    if (typeof flight.ilsCount !== "number" || isNaN(flight.ilsCount) || flight.ilsCount < 0) {
      errors.push({
        flightId: flight.id,
        field: "ilsCount",
        error: "Invalid ILS count",
        severity: "error",
        recoverable: true,
      });
    }
  }

  if (flight.vorCount !== undefined && flight.vorCount !== null) {
    if (typeof flight.vorCount !== "number" || isNaN(flight.vorCount) || flight.vorCount < 0) {
      errors.push({
        flightId: flight.id,
        field: "vorCount",
        error: "Invalid VOR count",
        severity: "error",
        recoverable: true,
      });
    }
  }

  return errors;
}

/**
 * Validate all flights and generate integrity report
 */
export function validateAllFlights(flights: Flight[]): IntegrityReport {
  const allErrors: ValidationError[] = [];
  const corruptedFlights: string[] = [];
  let validFlights = 0;

  for (const flight of flights) {
    const errors = validateFlight(flight);
    if (errors.length === 0) {
      validFlights++;
    } else {
      allErrors.push(...errors);
      const hasUnrecoverableError = errors.some((e) => e.severity === "error" && !e.recoverable);
      if (hasUnrecoverableError) {
        corruptedFlights.push(flight.id);
      }
    }
  }

  const errors = allErrors.filter((e) => e.severity === "error");
  const warnings = allErrors.filter((e) => e.severity === "warning");

  return {
    valid: errors.length === 0,
    totalFlights: flights.length,
    validFlights,
    errors,
    warnings,
    corruptedFlights,
  };
}

/**
 * Attempt to repair a flight entry
 */
export function repairFlight(flight: Flight): { repaired: Flight; changes: string[] } {
  const repaired = { ...flight };
  const changes: string[] = [];

  // Fix condition to lowercase
  if (flight.condition && !["day", "night"].includes(flight.condition)) {
    const lower = flight.condition.toLowerCase();
    if (["day", "night"].includes(lower)) {
      repaired.condition = lower as "day" | "night";
      changes.push(`Fixed condition: ${flight.condition} → ${lower}`);
    }
  }

  // Fix position to lowercase and normalize
  if (flight.position && !["1st_plt", "2nd_plt"].includes(flight.position)) {
    const lower = flight.position.toLowerCase().replace(" ", "_");
    if (["1st_plt", "2nd_plt"].includes(lower)) {
      repaired.position = lower as "1st_plt" | "2nd_plt";
      changes.push(`Fixed position: ${flight.position} → ${repaired.position}`);
    }
  }
  
  // Ensure countsAsCaptain is boolean
  if (typeof flight.countsAsCaptain !== "boolean") {
    repaired.countsAsCaptain = Boolean(flight.countsAsCaptain);
    changes.push(`Fixed countsAsCaptain to boolean`);
  }
  
  // Ensure dualHours is a number
  if (typeof flight.dualHours !== "number") {
    repaired.dualHours = parseFloat(String(flight.dualHours)) || 0;
    changes.push(`Fixed dualHours to number: ${repaired.dualHours}`);
  }

  // Fix boolean values
  if (typeof flight.nvg !== "boolean") {
    repaired.nvg = Boolean(flight.nvg);
    changes.push(`Fixed NVG to boolean: ${flight.nvg} → ${repaired.nvg}`);
  }

  if (typeof flight.instrumentFlight !== "boolean") {
    repaired.instrumentFlight = Boolean(flight.instrumentFlight);
    changes.push(`Fixed instrumentFlight to boolean: ${flight.instrumentFlight} → ${repaired.instrumentFlight}`);
  }

  // Fix negative values
  if (flight.simulationTime && flight.simulationTime < 0) {
    repaired.simulationTime = 0;
    changes.push(`Fixed negative simulation time: ${flight.simulationTime} → 0`);
  }

  if (flight.ilsCount && flight.ilsCount < 0) {
    repaired.ilsCount = 0;
    changes.push(`Fixed negative ILS count: ${flight.ilsCount} → 0`);
  }

  if (flight.vorCount && flight.vorCount < 0) {
    repaired.vorCount = 0;
    changes.push(`Fixed negative VOR count: ${flight.vorCount} → 0`);
  }

  return { repaired, changes };
}

/**
 * Check data integrity on app startup
 */
export async function checkDataIntegrity(flights: Flight[]): Promise<IntegrityReport> {
  return validateAllFlights(flights);
}
