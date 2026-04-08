/**
 * Currency tracking types
 */

export type CurrencyType = "day" | "night" | "nvg" | "medical" | "irt";

export interface Currency {
  type: CurrencyType;
  lastFlightDate?: string; // ISO date string (for flight-based currencies: day, night, nvg)
  testDate?: string; // ISO date string (for date-based currencies: medical, irt, instrument)
  validityDays: number; // User-defined validity period (for flight-based currencies)
  reminderDays: number; // Days before expiration to remind
  expirationDate?: string; // Auto-calculated
  daysRemaining?: number; // Auto-calculated
  status: "current" | "expiring_soon" | "expired"; // Auto-calculated
}

export interface CurrencySettings {
  currencies: Currency[];
}

export type DayCurrencyRefreshMode = "day_flight_only" | "duration_half_hour";

export interface AppSettings {
  flightName: string; // Flight/aircraft identifier (uppercase)
  currencies: Currency[];
  theme: "default" | "dark"; // Theme selection
  dayCurrencyRefreshMode: DayCurrencyRefreshMode; // How Day Currency is refreshed
}
