/**
 * Automatic calculation engine for flight hours classification and totals
 * This module handles all automatic calculations so users never do manual math
 * 
 * NEW LOGIC (matching Excel logbook):
 * - Position: 1st PLT or 2nd PLT (who is flying)
 * - Captain Hours (CAP): Only when position=1st_plt AND countsAsCaptain=true
 * - Dual Hours: Independent field, added to total separately
 * - Total = flightTime + dualHours
 */

import type { Flight, FlightTotals, MonthlyReport, GrandTotals } from "@/types/flight";
import type { InitialHours } from "@/types/initial-hours";

export type { GrandTotals };

/**
 * Initialize empty totals object
 */
export function createEmptyTotals(): FlightTotals {
  return {
    day1stPlt: 0,
    day2ndPlt: 0,
    dayDual: 0,
    dayTotal: 0,
    night1stPlt: 0,
    night2ndPlt: 0,
    nightDual: 0,
    nightTotal: 0,
    nvg1stPlt: 0,
    nvg2ndPlt: 0,
    nvgDual: 0,
    nvgTotal: 0,
    ifSim: 0,
    ifAct: 0,
    instrumentFlightTotal: 0,
    captainTotal: 0,
    firstPilotTotal: 0,
    secondPilotTotal: 0,
    dualTotal: 0,
    totalILSApproaches: 0,
    totalVORApproaches: 0,
    nightNonNVGTotal: 0,
    dualDayHours: 0,
    dualNightHours: 0,
    dualNVGHours: 0,
    dualInstrumentHours: 0,
    totalHours: 0,
  };
}

/**
 * Classify a single flight and add its hours to the appropriate categories
 *
 * RULES:
 * 1. Day / Night / NVG are three completely separate buckets — NVG hours go
 *    ONLY to NVG, NOT also to Night. Night (non-NVG) goes ONLY to Night.
 * 2. Captain Hours: flight time (and dual hours) only go to captainTotal
 *    when countsAsCaptain=true AND position=1st_plt.
 *    2nd PLT can never count as captain.
 * 3. Dual Hours are independent — they go into their own dual bucket
 *    (dayDual / nightDual / nvgDual) based on the flight condition,
 *    AND also follow the same countsAsCaptain rule for captain hours.
 * 4. Total = flightTime + dualHours
 */
export function classifyFlight(flight: Flight, totals: FlightTotals): FlightTotals {
  const time = flight.flightTime;
  const dual = flight.dualHours || 0;
  const newTotals = { ...totals };

  // ── FLIGHT TIME CLASSIFICATION ──────────────────────────────────────────────
  if (flight.condition === "day") {
    if (flight.position === "1st_plt") {
      newTotals.day1stPlt += time;
      newTotals.firstPilotTotal += time;
      if (flight.countsAsCaptain) {
        newTotals.captainTotal += time;
      }
    } else if (flight.position === "2nd_plt") {
      newTotals.day2ndPlt += time;
      newTotals.secondPilotTotal += time;
    }
    newTotals.dayTotal += time;

  } else if (flight.condition === "night") {
    if (flight.nvg) {
      // ── NVG: goes ONLY to NVG bucket, NOT to night ──
      if (flight.position === "1st_plt") {
        newTotals.nvg1stPlt += time;
        newTotals.firstPilotTotal += time;
        if (flight.countsAsCaptain) {
          newTotals.captainTotal += time;
        }
      } else if (flight.position === "2nd_plt") {
        newTotals.nvg2ndPlt += time;
        newTotals.secondPilotTotal += time;
      }
      newTotals.nvgTotal += time;
      // nightTotal is NOT incremented — NVG and Night are separate categories
    } else {
      // ── Night (non-NVG): goes ONLY to night bucket, NOT to NVG ──
      if (flight.position === "1st_plt") {
        newTotals.night1stPlt += time;
        newTotals.firstPilotTotal += time;
        if (flight.countsAsCaptain) {
          newTotals.captainTotal += time;
        }
      } else if (flight.position === "2nd_plt") {
        newTotals.night2ndPlt += time;
        newTotals.secondPilotTotal += time;
      }
      newTotals.nightTotal += time;
      newTotals.nightNonNVGTotal += time;
    }
  }

  // ── DUAL HOURS CLASSIFICATION ───────────────────────────────────────────────
  // Dual hours go into their own dual bucket (day/night/NVG based on condition).
  // They follow the SAME countsAsCaptain rule — only added to captainTotal when
  // countsAsCaptain=true. They are NOT automatically captain hours.
  if (dual > 0) {
    newTotals.dualTotal += dual;

    // Captain rule applies to dual hours the same way it applies to flight time
    if (flight.countsAsCaptain) {
      newTotals.captainTotal += dual;
    }

    if (flight.condition === "day") {
      newTotals.dayDual += dual;
      newTotals.dualDayHours += dual;
      newTotals.dayTotal += dual;
    } else if (flight.condition === "night") {
      if (flight.nvg) {
        // NVG dual — goes ONLY to NVG, NOT to night
        newTotals.nvgDual += dual;
        newTotals.dualNVGHours += dual;
        newTotals.nvgTotal += dual;
        // nightTotal is NOT incremented here either
      } else {
        // Night dual (non-NVG)
        newTotals.nightDual += dual;
        newTotals.dualNightHours += dual;
        newTotals.nightTotal += dual;
        newTotals.nightNonNVGTotal += dual;
      }
    }
  }

  // INSTRUMENT FLIGHT
  // NEW LOGIC: Dual IF hours also count toward IF Total
  if (flight.instrumentFlight) {
    // I.F Total = Flight Time + Dual Hours (if any)
    newTotals.instrumentFlightTotal += time;
    newTotals.totalILSApproaches += flight.ilsCount || 0;
    newTotals.totalVORApproaches += flight.vorCount || 0;
    
    // I.F breakdown: SIM and ACT are independent tracking fields
    if (flight.simulationTime) {
      newTotals.ifSim += flight.simulationTime;
    }
    if (flight.actualHours) {
      newTotals.ifAct += flight.actualHours;
    }
    
    // If dual hours exist and IF is active, add to dual instrument AND IF total
    if (dual > 0) {
      newTotals.dualInstrumentHours += dual;
      newTotals.instrumentFlightTotal += dual; // ✅ NEW: Dual IF hours count toward IF Total
    }
  }

  // TOTAL HOURS = flight time + dual hours
  newTotals.totalHours += time + dual;

  return newTotals;
}

/**
 * Calculate totals for an array of flights
 * @param flights - Array of flights to calculate
 * @param initialHours - Optional initial hours to add to totals (does not affect currency)
 */

// Parse YYYY-MM-DD date strings as local time (avoids UTC midnight timezone shift)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function calculateTotals(flights: Flight[], initialHours?: InitialHours): FlightTotals {
  let totals = createEmptyTotals();
  for (const flight of flights) {
    totals = classifyFlight(flight, totals);
  }
  
  // Add initial hours if provided (baseline hours from before app usage)
  if (initialHours) {
    totals.totalHours += initialHours.totalHours;
    totals.dayTotal += initialHours.dayHours;
    totals.nightTotal += initialHours.nightHours;
    totals.nvgTotal += initialHours.nvgHours;
    totals.instrumentFlightTotal += initialHours.instrumentHours;
    totals.captainTotal += initialHours.captainHours;
    totals.secondPilotTotal += initialHours.copilotHours;
    totals.dualDayHours += initialHours.dualDayHours;
    totals.dualNightHours += initialHours.dualNightHours;
    totals.dualNVGHours += initialHours.dualNVGHours;
    
    // Add detailed breakdown for Day/Night/NVG
    totals.day1stPlt += initialHours.day1stPlt;
    totals.day2ndPlt += initialHours.day2ndPlt;
    totals.night1stPlt += initialHours.night1stPlt;
    totals.night2ndPlt += initialHours.night2ndPlt;
    totals.nvg1stPlt += initialHours.nvg1stPlt;
    totals.nvg2ndPlt += initialHours.nvg2ndPlt;

    // Roll sub-bucket initial hours into the overall pilot totals so that the
    // displayed "1st PLT Total" and "2nd PLT Total" reflect historical hours.
    totals.firstPilotTotal +=
      initialHours.day1stPlt + initialHours.night1stPlt + initialHours.nvg1stPlt;
    totals.secondPilotTotal +=
      initialHours.day2ndPlt + initialHours.night2ndPlt + initialHours.nvg2ndPlt;
    
    // Add to Day DUAL
    totals.dayDual += initialHours.dualDayHours;
    // Add to Night DUAL
    totals.nightDual += initialHours.dualNightHours;
    // Add to NVG DUAL
    totals.nvgDual += initialHours.dualNVGHours;
    
    // Calculate total dual from dual subcategories
    totals.dualTotal += initialHours.dualDayHours + initialHours.dualNightHours + initialHours.dualNVGHours;
  }
  
  // Round all accumulated values to eliminate floating point drift
  return roundAllTotals(totals);
}

/**
 * Calculate totals grouped by aircraft type
 */
export function calculateAircraftTotals(flights: Flight[]): Record<string, FlightTotals> {
  const aircraftGroups: Record<string, Flight[]> = {};

  // Group flights by aircraft type
  for (const flight of flights) {
    if (!aircraftGroups[flight.aircraftType]) {
      aircraftGroups[flight.aircraftType] = [];
    }
    aircraftGroups[flight.aircraftType].push(flight);
  }

  // Calculate totals for each aircraft type
  const aircraftTotals: Record<string, FlightTotals> = {};
  for (const [aircraftType, aircraftFlights] of Object.entries(aircraftGroups)) {
    aircraftTotals[aircraftType] = calculateTotals(aircraftFlights);
  }

  return aircraftTotals;
}

/**
 * Generate a monthly report with all totals automatically calculated
 * @param flights - Array of flights to calculate
 * @param year - Year for the report
 * @param month - Month for the report (1-12)
 * @param initialHours - Optional initial hours to add to totals
 */
export function generateMonthlyReport(
  flights: Flight[],
  year: number,
  month: number,
  initialHours?: InitialHours
): MonthlyReport {
  // Filter flights for the specified month
  const monthFlights = flights.filter((flight) => {
    const date = parseLocalDate(flight.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  // Sort by date (newest first)
  monthFlights.sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());

  return {
    year,
    month,
    flights: monthFlights,
    totals: calculateTotals(monthFlights, initialHours),
    aircraftTotals: calculateAircraftTotals(monthFlights),
  };
}

/**
 * Calculate grand totals including last month and cumulative totals
 * @param allFlights - All flights in the system
 * @param currentYear - Current year
 * @param currentMonth - Current month (1-12)
 * @param initialHours - Optional initial hours to add to totals
 */
export function calculateGrandTotals(
  allFlights: Flight[],
  currentYear: number,
  currentMonth: number,
  initialHours?: InitialHours
): GrandTotals {
  // Get this month's flights
  const thisMonthFlights = allFlights.filter((flight) => {
    const date = parseLocalDate(flight.date);
    return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
  });

  // Get last month's flights
  const lastMonthDate = currentMonth === 1
    ? new Date(currentYear - 1, 11) // January → go back to December of previous year
    : new Date(currentYear, currentMonth - 2);
  const lastMonthFlights = allFlights.filter((flight) => {
    const date = parseLocalDate(flight.date);
    return (
      date.getFullYear() === lastMonthDate.getFullYear() &&
      date.getMonth() === lastMonthDate.getMonth()
    );
  });

  // Calculate totals WITHOUT initial hours for monthly views
  const thisMonthTotals = calculateTotals(thisMonthFlights);
  const lastMonthTotal = calculateTotals(lastMonthFlights).totalHours;
  
  // Calculate cumulative totals WITH initial hours (added only once)
  const cumulativeTotals = calculateTotals(allFlights, initialHours);

  return {
    ...cumulativeTotals,
    lastMonthTotal,
    thisMonthTotal: thisMonthTotals.totalHours,
    cumulativeTotal: cumulativeTotals.totalHours,
  };
}

/**
 * Calculate total flights in the last 6 months (rolling)
 */
export function calculateLast6MonthsFlights(flights: Flight[]): number {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return flights.filter((flight) => {
    const flightDate = parseLocalDate(flight.date);
    return flightDate >= sixMonthsAgo;
  }).length;
}

/**
 * Calculate total flights for the current year
 */
export function calculateCurrentYearFlights(flights: Flight[]): number {
  const currentYear = new Date().getFullYear();
  
  return flights.filter((flight) => {
    const flightDate = parseLocalDate(flight.date);
    return flightDate.getFullYear() === currentYear;
  }).length;
}

/**
 * Round hours to avoid floating point accumulation errors (3 decimal places)
 */
export function roundHours(hours: number): number {
  return Math.round(hours * 1000) / 1000;
}

/**
 * Format hours for display (e.g., "1.5", "2.3", "0.0")
 */
export function formatHours(hours: number): string {
  return roundHours(hours).toFixed(1);
}

/**
 * Round all numeric fields in a FlightTotals object to eliminate floating point accumulation errors.
 */
function roundAllTotals(totals: FlightTotals): FlightTotals {
  const rounded: FlightTotals = {} as FlightTotals;
  for (const key of Object.keys(totals) as (keyof FlightTotals)[]) {
    (rounded as Record<string, number>)[key] = roundHours(totals[key]);
  }
  return rounded;
}
