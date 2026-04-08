/**
 * Smart auto-fill functionality based on previous flights
 */

import type { Flight, FlightInput } from "@/types/flight";

export interface AutoFillSuggestion {
  aircraftTypes: string[];
  aircraftNumbers: string[];
  captainNames: string[];
  coPilotNames: string[];
  missions: string[];
  commonPairs: {
    aircraftType: string;
    aircraftNumber: string;
    count: number;
  }[];
  recentFlights: Flight[];
}

/**
 * Analyze flight history and generate suggestions
 */
export function generateAutoFillSuggestions(flights: Flight[]): AutoFillSuggestion {
  // Get unique values with frequency
  const aircraftTypeMap = new Map<string, number>();
  const aircraftNumberMap = new Map<string, number>();
  const captainNameMap = new Map<string, number>();
  const coPilotNameMap = new Map<string, number>();
  const missionMap = new Map<string, number>();
  const pairMap = new Map<string, { type: string; number: string; count: number }>();

  for (const flight of flights) {
    // Count aircraft types
    aircraftTypeMap.set(flight.aircraftType, (aircraftTypeMap.get(flight.aircraftType) || 0) + 1);

    // Count aircraft numbers
    aircraftNumberMap.set(
      flight.aircraftNumber,
      (aircraftNumberMap.get(flight.aircraftNumber) || 0) + 1
    );

    // Count captain names
    captainNameMap.set(flight.captainName, (captainNameMap.get(flight.captainName) || 0) + 1);

    // Count co-pilot names
    coPilotNameMap.set(flight.coPilotName, (coPilotNameMap.get(flight.coPilotName) || 0) + 1);

    // Count missions
    if (flight.mission) {
      missionMap.set(flight.mission, (missionMap.get(flight.mission) || 0) + 1);
    }

    // Count aircraft type/number pairs
    const pairKey = `${flight.aircraftType}|${flight.aircraftNumber}`;
    const existing = pairMap.get(pairKey);
    if (existing) {
      existing.count++;
    } else {
      pairMap.set(pairKey, {
        type: flight.aircraftType,
        number: flight.aircraftNumber,
        count: 1,
      });
    }
  }

  // Sort by frequency and get top suggestions
  const sortByFrequency = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

  const aircraftTypes = sortByFrequency(aircraftTypeMap).slice(0, 10);
  const aircraftNumbers = sortByFrequency(aircraftNumberMap).slice(0, 10);
  const captainNames = sortByFrequency(captainNameMap).slice(0, 10);
  const coPilotNames = sortByFrequency(coPilotNameMap).slice(0, 10);
  const missions = sortByFrequency(missionMap).slice(0, 10);

  // Get common aircraft pairs
  const commonPairs = Array.from(pairMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((pair) => ({
      aircraftType: pair.type,
      aircraftNumber: pair.number,
      count: pair.count,
    }));

  // Get recent flights (last 10)
  const recentFlights = flights.slice(-10).reverse();

  return {
    aircraftTypes,
    aircraftNumbers,
    captainNames,
    coPilotNames,
    missions,
    commonPairs,
    recentFlights,
  };
}

/**
 * Get suggestions for a specific field based on partial input
 */
export function getFieldSuggestions(
  field: keyof FlightInput,
  partialValue: string,
  suggestions: AutoFillSuggestion
): string[] {
  const normalized = partialValue.toUpperCase().trim();

  let options: string[] = [];
  switch (field) {
    case "aircraftType":
      options = suggestions.aircraftTypes;
      break;
    case "aircraftNumber":
      options = suggestions.aircraftNumbers;
      break;
    case "captainName":
      options = suggestions.captainNames;
      break;
    case "coPilotName":
      options = suggestions.coPilotNames;
      break;
    case "mission":
      options = suggestions.missions;
      break;
    default:
      return [];
  }

  if (!normalized) {
    return options.slice(0, 5);
  }

  // Filter by partial match
  return options.filter((option) => option.toUpperCase().includes(normalized)).slice(0, 5);
}

/**
 * Get aircraft number suggestions based on selected aircraft type
 */
export function getAircraftNumbersForType(
  aircraftType: string,
  flights: Flight[]
): string[] {
  const numbers = new Map<string, number>();

  for (const flight of flights) {
    if (flight.aircraftType === aircraftType) {
      numbers.set(flight.aircraftNumber, (numbers.get(flight.aircraftNumber) || 0) + 1);
    }
  }

  return Array.from(numbers.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0])
    .slice(0, 5);
}

/**
 * Suggest complete flight based on aircraft selection
 */
export function suggestFlightFromAircraft(
  aircraftType: string,
  aircraftNumber: string,
  flights: Flight[]
): Partial<FlightInput> | null {
  // Find most recent flight with this aircraft
  const matchingFlights = flights.filter(
    (f) => f.aircraftType === aircraftType && f.aircraftNumber === aircraftNumber
  );

  if (matchingFlights.length === 0) {
    return null;
  }

  const recent = matchingFlights[matchingFlights.length - 1];

  return {
    mission: recent.mission,
    condition: recent.condition,
    position: recent.position,
    countsAsCaptain: recent.countsAsCaptain,
  };
}

/**
 * Get most common crew pairing
 */
export function getCommonCrewPairing(
  captainName: string,
  flights: Flight[]
): string | null {
  const coPilots = new Map<string, number>();

  for (const flight of flights) {
    if (flight.captainName === captainName) {
      coPilots.set(flight.coPilotName, (coPilots.get(flight.coPilotName) || 0) + 1);
    }
  }

  if (coPilots.size === 0) {
    return null;
  }

  return Array.from(coPilots.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Predict likely flight time based on aircraft and mission
 */
export function predictFlightTime(
  aircraftType: string,
  mission: string,
  flights: Flight[]
): number | null {
  const matchingFlights = flights.filter(
    (f) => f.aircraftType === aircraftType && f.mission === mission
  );

  if (matchingFlights.length === 0) {
    return null;
  }

  // Calculate average
  const total = matchingFlights.reduce((sum, f) => sum + f.flightTime, 0);
  const average = total / matchingFlights.length;

  // Round to nearest 0.1
  return Math.round(average * 10) / 10;
}
