/**
 * Structured totals calculation for different time periods
 */

import type { Flight, FlightTotals } from "@/types/flight";
import { calculateTotals } from "./calculations";

export interface StructuredTotals {
  totalHours: number;
  
  // Day Flying breakdown
  dayHours: number; // Total Day
  day1stPlt: number; // Day 1st PLT
  day2ndPlt: number; // Day 2nd PLT
  dayDual: number; // Day DUAL
  
  // Night Flying breakdown
  nightHours: number; // Total Night (Non-NVG only)
  night1stPlt: number; // Night 1st PLT
  night2ndPlt: number; // Night 2nd PLT
  nightDual: number; // Night DUAL
  
  // NVG breakdown
  nvgHours: number; // Total NVG
  nvg1stPlt: number; // NVG 1st PLT
  nvg2ndPlt: number; // NVG 2nd PLT
  nvgDual: number; // NVG DUAL
  
  // Instrument Flight breakdown
  instrumentFlightHours: number; // Total I.F
  ifSim: number; // I.F SIM
  ifAct: number; // I.F ACT
  
  // Captain Hours
  captainHours: number; // CAP - Captain qualified hours only
  
  // Legacy fields (for backward compatibility)
  firstPilotHours: number; // 1ST PLT - All first pilot hours
  secondPilotHours: number; // 2ND PLT - All second pilot hours
  copilotHours: number; // Alias for secondPilotHours
  dualHours: number; // Total dual hours
  dualDayHours: number;
  dualNightHours: number;
  dualNVGHours: number;
  dualInstrumentHours: number;
  
  totalILSApproaches: number;
  totalVORApproaches: number;
  flightCount: number;
}

/**
 * Convert FlightTotals to StructuredTotals format
 */
function convertToStructuredTotals(totals: FlightTotals, flightCount: number): StructuredTotals {
  return {
    totalHours: totals.totalHours,
    
    // Day Flying breakdown
    dayHours: totals.dayTotal,
    day1stPlt: totals.day1stPlt,
    day2ndPlt: totals.day2ndPlt,
    dayDual: totals.dayDual,
    
    // Night Flying breakdown
    nightHours: totals.nightTotal,
    night1stPlt: totals.night1stPlt,
    night2ndPlt: totals.night2ndPlt,
    nightDual: totals.nightDual,
    
    // NVG breakdown
    nvgHours: totals.nvgTotal,
    nvg1stPlt: totals.nvg1stPlt,
    nvg2ndPlt: totals.nvg2ndPlt,
    nvgDual: totals.nvgDual,
    
    // Instrument Flight breakdown
    instrumentFlightHours: totals.instrumentFlightTotal,
    ifSim: totals.ifSim,
    ifAct: totals.ifAct,
    
    // Captain Hours
    captainHours: totals.captainTotal,
    
    // Legacy fields
    firstPilotHours: totals.firstPilotTotal,
    secondPilotHours: totals.secondPilotTotal,
    copilotHours: totals.secondPilotTotal,
    dualHours: totals.dualTotal,
    dualDayHours: totals.dualDayHours,
    dualNightHours: totals.dualNightHours,
    dualNVGHours: totals.dualNVGHours,
    dualInstrumentHours: totals.dualInstrumentHours,
    totalILSApproaches: totals.totalILSApproaches,
    totalVORApproaches: totals.totalVORApproaches,

    flightCount,
  };
}

/**
 * Calculate totals for a specific month
 */
export function calculateMonthTotals(
  flights: Flight[],
  year: number,
  month: number
): StructuredTotals {
  const monthFlights = flights.filter((flight) => {
    const date = new Date(flight.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  const totals = calculateTotals(monthFlights);
  return convertToStructuredTotals(totals, monthFlights.length);
}

/**
 * Calculate totals for first half of year (Jan-Jun)
 */
export function calculateFirstHalfTotals(flights: Flight[], year: number): StructuredTotals {
  const firstHalfFlights = flights.filter((flight) => {
    const date = new Date(flight.date);
    const month = date.getMonth() + 1;
    return date.getFullYear() === year && month >= 1 && month <= 6;
  });

  const totals = calculateTotals(firstHalfFlights);
  return convertToStructuredTotals(totals, firstHalfFlights.length);
}

/**
 * Calculate totals for second half of year (Jul-Dec)
 */
export function calculateSecondHalfTotals(flights: Flight[], year: number): StructuredTotals {
  const secondHalfFlights = flights.filter((flight) => {
    const date = new Date(flight.date);
    const month = date.getMonth() + 1;
    return date.getFullYear() === year && month >= 7 && month <= 12;
  });

  const totals = calculateTotals(secondHalfFlights);
  return convertToStructuredTotals(totals, secondHalfFlights.length);
}

/**
 * Calculate totals for full year (Jan-Dec)
 */
export function calculateYearTotals(flights: Flight[], year: number): StructuredTotals {
  const yearFlights = flights.filter((flight) => {
    const date = new Date(flight.date);
    return date.getFullYear() === year;
  });

  const totals = calculateTotals(yearFlights);
  return convertToStructuredTotals(totals, yearFlights.length);
}

/**
 * Calculate grand totals (all flights)
 */
export function calculateGrandTotals(flights: Flight[], initialHours?: import("@/types/initial-hours").InitialHours): StructuredTotals {
  const totals = calculateTotals(flights, initialHours);
  return convertToStructuredTotals(totals, flights.length);
}

/**
 * Get all structured totals for a given period
 */
export interface AllStructuredTotals {
  selectedMonth: StructuredTotals;
  firstHalf: StructuredTotals;
  secondHalf: StructuredTotals;
  fullYear: StructuredTotals;
  grandTotal: StructuredTotals;
}

export function getAllStructuredTotals(
  flights: Flight[],
  selectedYear: number,
  selectedMonth: number,
  initialHours?: import("@/types/initial-hours").InitialHours
): AllStructuredTotals {
  return {
    selectedMonth: calculateMonthTotals(flights, selectedYear, selectedMonth),
    firstHalf: calculateFirstHalfTotals(flights, selectedYear),
    secondHalf: calculateSecondHalfTotals(flights, selectedYear),
    fullYear: calculateYearTotals(flights, selectedYear),
    grandTotal: calculateGrandTotals(flights, initialHours),
  };
}
