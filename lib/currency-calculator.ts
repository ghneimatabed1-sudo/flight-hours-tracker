/**
 * Currency calculation utilities
 * Calculates currency status based on flight data and settings
 */

import type { Currency } from "@/types/currency";
import type { Flight } from "@/types/flight";

export interface CurrencyStatus {
  type: string;
  name: string;
  daysRemaining: number;
  status: "VALID" | "EXPIRING SOON" | "EXPIRED";
  expirationDate?: Date;
  lastFlightDate?: Date;
  testDate?: Date; // For date-based currencies (medical only)
}

/**
 * Calculate currency status for a given currency type
 */
export function calculateCurrencyStatus(
  currency: Currency,
  flights: Flight[]
): CurrencyStatus {
  const name = getCurrencyName(currency.type);
  const isDateBased = currency.type === "medical"; // Only Medical is date-based now
  
  // DATE-BASED CURRENCIES (Medical only)
  if (isDateBased) {
    if (!currency.testDate) {
      // No test date set, currency is expired
      return {
        type: currency.type,
        name,
        daysRemaining: -999,
        status: "EXPIRED",
      };
    }

    const testDate = new Date(currency.testDate);
    const expirationDate = new Date(testDate);
    expirationDate.setDate(expirationDate.getDate() + 365); // Fixed 1-year validity

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysRemaining = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine status using currency's reminder days threshold
    let status: "VALID" | "EXPIRING SOON" | "EXPIRED";
    if (daysRemaining <= 0) {
      status = "EXPIRED";
    } else if (daysRemaining <= currency.reminderDays) {
      status = "EXPIRING SOON";
    } else {
      status = "VALID";
    }

    return {
      type: currency.type,
      name,
      daysRemaining,
      status,
      expirationDate,
      testDate,
    };
  }
  
  // FLIGHT-BASED CURRENCIES (Day, Night, NVG, IRT)
  // Find the most recent flight for this currency type
  const relevantFlights = flights.filter((flight) => {
    switch (currency.type) {
      case "day":
        return flight.condition === "day";
      case "night":
        return flight.condition === "night" && !flight.nvg;
      case "nvg":
        return flight.nvg;
      case "irt":
        return flight.mission.toUpperCase() === "IRT" && flight.instrumentFlight;
      default:
        return false;
    }
  });

  if (relevantFlights.length === 0) {
    // No relevant flights, currency is expired
    return {
      type: currency.type,
      name,
      daysRemaining: -999, // Arbitrary large negative number
      status: "EXPIRED",
    };
  }

  // Get the most recent flight date
  const sortedFlights = relevantFlights.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastFlightDate = new Date(sortedFlights[0].date);
  
  // Calculate expiration date
  const expirationDate = new Date(lastFlightDate);
  expirationDate.setDate(expirationDate.getDate() + currency.validityDays);
  
  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.floor(
    (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine status
  let status: "VALID" | "EXPIRING SOON" | "EXPIRED";
  if (daysRemaining < 0) {
    status = "EXPIRED";
  } else if (daysRemaining <= currency.reminderDays) {
    status = "EXPIRING SOON";
  } else {
    status = "VALID";
  }

  return {
    type: currency.type,
    name,
    daysRemaining,
    status,
    expirationDate,
    lastFlightDate,
  };
}

/**
 * Calculate all currency statuses
 */
export function calculateAllCurrencyStatuses(
  currencies: Currency[],
  flights: Flight[]
): CurrencyStatus[] {
  return currencies.map((currency) => calculateCurrencyStatus(currency, flights));
}

/**
 * Get human-readable currency name
 */
function getCurrencyName(type: string): string {
  switch (type) {
    case "day":
      return "Day Currency";
    case "night":
      return "Night Currency";
    case "nvg":
      return "NVG Currency";
    case "medical":
      return "Medical Currency";
    case "irt":
      return "IRT Currency";
    default:
      return type;
  }
}
