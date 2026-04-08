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
 * NEW LOGIC:
 * 1. Flight Time goes to position (1st PLT or 2nd PLT)
 * 2. If position=1st_plt AND countsAsCaptain=true → also add to Captain Hours
 * 3. Dual Hours are independent and added separately
 * 4. Total = flightTime + dualHours
 */
export function classifyFlight(flight: Flight, totals: FlightTotals): FlightTotals {
  const time = flight.flightTime;
  const dual = flight.dualHours || 0;
  const newTotals = { ...totals };

  // FLIGHT TIME CLASSIFICATION (based on position and condition)
  if (flight.condition === "day") {
    // Day flying
    if (flight.position === "1st_plt") {
      newTotals.day1stPlt += time;
      newTotals.firstPilotTotal += time;
      
      // If qualified as captain, add to captain hours
      if (flight.countsAsCaptain) {
        newTotals.captainTotal += time;
      }
    } else if (flight.position === "2nd_plt") {
      newTotals.day2ndPlt += time;
      newTotals.secondPilotTotal += time;
    }
    newTotals.dayTotal += time;
    
  } else if (flight.condition === "night") {
    // Night flying
    if (flight.nvg) {
      // NVG (Night Vision Goggles) - also counts as night flying
      if (flight.position === "1st_plt") {
        newTotals.nvg1stPlt += time;
        newTotals.firstPilotTotal += time;
        
        // If qualified as captain, add to captain hours
        if (flight.countsAsCaptain) {
          newTotals.captainTotal += time;
        }
      } else if (flight.position === "2nd_plt") {
        newTotals.nvg2ndPlt += time;
        newTotals.secondPilotTotal += time;
      }
      newTotals.nvgTotal += time;
      newTotals.nightTotal += time; // NVG is a type of night flying
    } else {
      // Night (non-NVG)
      if (flight.position === "1st_plt") {
        newTotals.night1stPlt += time;
        newTotals.firstPilotTotal += time;
        
        // If qualified as captain, add to captain hours
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

  // DUAL HOURS CLASSIFICATION (independent from position)
  // NEW LOGIC: All Dual Hours also count as Captain Hours
  if (dual > 0) {
    newTotals.dualTotal += dual;
    newTotals.captainTotal += dual; // ✅ NEW: Dual hours count as Captain hours
    
    if (flight.condition === "day") {
      newTotals.dayDual += dual; // Add to day dual column
      newTotals.dualDayHours += dual;
      newTotals.dayTotal += dual;
    } else if (flight.condition === "night") {
      if (flight.nvg) {
        // NVG Dual - also counts as night flying
        newTotals.nvgDual += dual;
        newTotals.dualNVGHours += dual;
        newTotals.nvgTotal += dual;
        newTotals.nightTotal += dual; // NVG dual is also night flying
      } else {
        // Night Dual (non-NVG)
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
    
    // Add to Day DUAL
    totals.dayDual += initialHours.dualDayHours;
    // Add to Night DUAL
    totals.nightDual += initialHours.dualNightHours;
    // Add to NVG DUAL
    totals.nvgDual += initialHours.dualNVGHours;
    
    // Calculate total dual from dual subcategories
    totals.dualTotal += initialHours.dualDayHours + initialHours.dualNightHours + initialHours.dualNVGHours;
  }
  
  return totals;
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
    const date = new Date(flight.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  // Sort by date (newest first)
  monthFlights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    const date = new Date(flight.date);
    return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
  });

  // Get last month's flights
  const lastMonthDate = new Date(currentYear, currentMonth - 2); // month is 1-indexed, so -2 for last month
  const lastMonthFlights = allFlights.filter((flight) => {
    const date = new Date(flight.date);
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
    const flightDate = new Date(flight.date);
    return flightDate >= sixMonthsAgo;
  }).length;
}

/**
 * Calculate total flights for the current year
 */
export function calculateCurrentYearFlights(flights: Flight[]): number {
  const currentYear = new Date().getFullYear();
  
  return flights.filter((flight) => {
    const flightDate = new Date(flight.date);
    return flightDate.getFullYear() === currentYear;
  }).length;
}

/**
 * Round hours to one decimal place for display
 */
export function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

/**
 * Format hours for display (e.g., "1.5", "2.3", "0.0")
 */
export function formatHours(hours: number): string {
  return roundHours(hours).toFixed(1);
}
