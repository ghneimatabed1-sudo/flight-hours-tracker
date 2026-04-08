/**
 * Initial Hours - Baseline flight hours entered manually before using the app
 * These hours are added to totals but do NOT affect currency/expiration calculations
 */
export interface InitialHours {
  totalHours: number;
  dayHours: number;
  nightHours: number;
  nvgHours: number;
  instrumentHours: number;
  captainHours: number;
  copilotHours: number;
  dualDayHours: number;
  dualNightHours: number;
  dualNVGHours: number;
  
  // Detailed breakdown for Day/Night/NVG
  day1stPlt: number;
  day2ndPlt: number;
  night1stPlt: number;
  night2ndPlt: number;
  nvg1stPlt: number;
  nvg2ndPlt: number;
}

export const DEFAULT_INITIAL_HOURS: InitialHours = {
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
