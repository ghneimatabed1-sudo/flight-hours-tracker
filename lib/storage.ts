/**
 * Storage utility for persisting flight data using AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Flight } from "@/types/flight";

const STORAGE_KEY = "flight_hours_data";

export interface StorageData {
  flights: Flight[];
  version: number;
}

/**
 * Load all flights from storage
 */
export async function loadFlights(): Promise<Flight[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed: StorageData = JSON.parse(data);
    return parsed.flights || [];
  } catch (error) {
    console.error("Failed to load flights:", error);
    return [];
  }
}

/**
 * Save all flights to storage
 */
export async function saveFlights(flights: Flight[]): Promise<void> {
  try {
    const data: StorageData = {
      flights,
      version: 1,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save flights:", error);
    throw error;
  }
}

/**
 * Add a new flight entry
 */
export async function addFlight(flight: Flight): Promise<void> {
  const flights = await loadFlights();
  flights.push(flight);
  await saveFlights(flights);
}

/**
 * Update an existing flight entry
 */
export async function updateFlight(id: string, updates: Partial<Flight>): Promise<void> {
  const flights = await loadFlights();
  const index = flights.findIndex((f) => f.id === id);
  if (index === -1) {
    throw new Error(`Flight with id ${id} not found`);
  }
  flights[index] = {
    ...flights[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveFlights(flights);
}

/**
 * Delete a flight entry
 */
export async function deleteFlight(id: string): Promise<void> {
  const flights = await loadFlights();
  const filtered = flights.filter((f) => f.id !== id);
  await saveFlights(filtered);
}

/**
 * Get flights for a specific month and year
 */
export async function getFlightsByMonth(year: number, month: number): Promise<Flight[]> {
  const flights = await loadFlights();
  return flights.filter((flight) => {
    const [_sy, _sm, _sd] = flight.date.split("-").map(Number); const date = new Date(_sy, _sm - 1, _sd);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
}

/**
 * Clear all flight data (for testing/reset)
 */
export async function clearAllFlights(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
