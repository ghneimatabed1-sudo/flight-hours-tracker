/**
 * Currency calculation utilities
 * Calculates currency status based on flight data and settings
 */

import type { Currency } from "@/types/currency";
import type { Flight } from "@/types/flight";
import type { InitialHours } from "@/types/initial-hours";

export interface CurrencyStatus {
  type: string;
  name: string;
  daysRemaining: number;
  status: "VALID" | "EXPIRING SOON" | "EXPIRED";
  expirationDate?: Date;
  lastFlightDate?: Date;
  testDate?: Date; // For date-based currencies (medical, irt)
}

/**
 * Calculate currency status for a given currency type
 * @param dayCurrencyRefreshMode - "day_flight_only" (any day flight) or "duration_half_hour" (day flights >= 0.5 hours only)
 * @param initialHours - Initial hours with baseline dates for currency calculations
 */
export function calculateCurrencyStatus(
  currency: Currency,
  flights: Flight[],
  dayCurrencyRefreshMode: "day_flight_only" | "duration_half_hour" = "day_flight_only",
  initialHours?: InitialHours
): CurrencyStatus {
  const name = getCurrencyName(currency.type);
  const isDateBased = currency.type === "medical" || currency.type === "irt";

  // DATE-BASED CURRENCIES (Medical, IRT)
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
        // Day currency filtering with optional duration threshold
        if (flight.condition !== "day") return false;

        // If duration_half_hour mode: only count flights >= 0.5 hours
        if (dayCurrencyRefreshMode === "duration_half_hour") {
          return flight.flightTime >= 0.5;
        }
        // Otherwise: any day flight counts (default mode)
        return true;

      case "night":
        return flight.condition === "night" && !flight.nvg;
      case "nvg":
        return flight.nvg === true && flight.condition === "night";
      case "irt":
        return flight.mission.toUpperCase() === "IRT" && flight.instrumentFlight;
      default:
        return false;
    }
  });

  // Determine the most recent flight date (from flights OR initial hours)
  let lastFlightDate: Date | null = null;

  if (relevantFlights.length > 0) {
    // Get the most recent logged flight
    const sortedFlights = relevantFlights.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    lastFlightDate = new Date(sortedFlights[0].date);
  }

  // Also check initialHours baseline — use whichever is more recent
  if (initialHours) {
    let baselineDate: Date | null = null;
    if (currency.type === "day" && initialHours.lastDayFlyingDate) {
      baselineDate = new Date(initialHours.lastDayFlyingDate);
    } else if (currency.type === "night" && initialHours.lastNightFlying === "night" && initialHours.lastNightFlyingDate) {
      baselineDate = new Date(initialHours.lastNightFlyingDate);
    } else if (currency.type === "nvg" && initialHours.lastNightFlying === "nvg" && initialHours.lastNightFlyingDate) {
      baselineDate = new Date(initialHours.lastNightFlyingDate);
    }
    if (baselineDate && (!lastFlightDate || baselineDate > lastFlightDate)) {
      lastFlightDate = baselineDate;
    }
  }

  if (!lastFlightDate) {
    // No flights and no initial hours baseline, currency is expired
    return {
      type: currency.type,
      name,
      daysRemaining: -999,
      status: "EXPIRED",
    };
  }
  
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
 * @param dayCurrencyRefreshMode - "day_flight_only" (any day flight) or "duration_half_hour" (day flights >= 0.5 hours only)
 * @param initialHours - Initial hours with baseline dates for currency calculations
 */
export function calculateAllCurrencyStatuses(
  currencies: Currency[],
  flights: Flight[],
  dayCurrencyRefreshMode: "day_flight_only" | "duration_half_hour" = "day_flight_only",
  initialHours?: InitialHours
): CurrencyStatus[] {
  return currencies.map((currency) => calculateCurrencyStatus(currency, flights, dayCurrencyRefreshMode, initialHours));
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
