/**
 * Flight data types for the flight hours tracking application
 */

export type FlightCondition = "day" | "night";
export type FlightPosition = "1st_plt" | "2nd_plt"; // First Pilot or Second Pilot
export type FlightType = "sim" | "act";
export type ApproachType = "ILS" | "VOR" | "none";

export interface Flight {
  id: string;
  date: string; // ISO date string
  aircraftType: string;
  aircraftNumber: string;
  captainName: string;
  coPilotName: string;
  mission: string;
  condition: FlightCondition;
  nvg: boolean;
  position: FlightPosition; // 1st PLT or 2nd PLT
  countsAsCaptain: boolean; // Only applies when position = 1st_plt
  flightTime: number; // Hours as decimal (e.g., 1.5, 2.3)
  dualHours: number; // Independent dual hours (added to total)
  type: FlightType;
  // Instrument Flight fields
  instrumentFlight: boolean;
  simulationTime?: number; // SIM hours
  actualHours?: number; // ACT hours
  ilsCount?: number; // Number of ILS approaches
  vorCount?: number; // Number of VOR approaches
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface FlightInput {
  date: string;
  aircraftType: string;
  aircraftNumber: string;
  captainName: string;
  coPilotName: string;
  mission: string;
  condition: FlightCondition;
  nvg: boolean;
  position: FlightPosition; // 1st PLT or 2nd PLT
  countsAsCaptain: boolean; // Only applies when position = 1st_plt
  flightTime: number;
  dualHours: number; // Independent dual hours
  type: FlightType;
  // Instrument Flight fields
  instrumentFlight: boolean;
  simulationTime?: number; // SIM hours
  actualHours?: number; // ACT hours
  ilsCount?: number;
  vorCount?: number;
}

export interface FlightTotals {
  // Day flying totals
  day1stPlt: number; // Day 1st PLT hours
  day2ndPlt: number; // Day 2nd PLT hours
  dayDual: number; // Day Dual hours
  dayTotal: number; // Total day hours

  // Night flying totals
  night1stPlt: number; // Night 1st PLT hours
  night2ndPlt: number; // Night 2nd PLT hours
  nightDual: number; // Night Dual hours
  nightTotal: number; // Total night hours

  // NVG flying totals
  nvg1stPlt: number; // NVG 1st PLT hours
  nvg2ndPlt: number; // NVG 2nd PLT hours
  nvgDual: number; // NVG Dual hours
  nvgTotal: number; // Total NVG hours

  // Instrument Flight breakdown
  ifSim: number; // I.F SIM hours
  ifAct: number; // I.F ACT hours
  instrumentFlightTotal: number; // Total IF hours

  // Captain and Pilot totals
  captainTotal: number; // CAP - Captain qualified hours only
  firstPilotTotal: number; // Total 1st PLT hours (includes CAP + non-CAP)
  secondPilotTotal: number; // Total 2nd PLT hours
  dualTotal: number; // Total Dual hours (all conditions)
  totalILSApproaches: number;
  totalVORApproaches: number;
  nightNonNVGTotal: number; // Night hours without NVG
  
  // Dual subcategories
  dualDayHours: number;
  dualNightHours: number; // Night Dual (non-NVG)
  dualNVGHours: number;
  dualInstrumentHours: number;

  // Overall totals
  totalHours: number; // Grand total (flight time + dual hours)
}

export interface MonthlyReport {
  year: number;
  month: number; // 1-12
  flights: Flight[];
  totals: FlightTotals;
  aircraftTotals: Record<string, FlightTotals>; // Totals per aircraft type
}

export interface GrandTotals extends FlightTotals {
  lastMonthTotal: number;
  thisMonthTotal: number;
  cumulativeTotal: number;
}

// InitialHours is defined in @/types/initial-hours — do not duplicate here
export type { InitialHours } from "@/types/initial-hours";
