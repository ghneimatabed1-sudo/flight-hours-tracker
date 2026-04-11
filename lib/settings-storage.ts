/**
 * Settings storage utility for app configuration
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, Currency } from "@/types/currency";

const SETTINGS_KEY = "app_settings";

const DEFAULT_CURRENCIES: Currency[] = [
  {
    type: "day",
    validityDays: 30,
    reminderDays: 7,
    status: "expired",
  },
  {
    type: "night",
    validityDays: 30,
    reminderDays: 7,
    status: "expired",
  },
  {
    type: "nvg",
    validityDays: 30,
    reminderDays: 7,
    status: "expired",
  },
  {
    type: "medical",
    validityDays: 365,
    reminderDays: 30,
    status: "expired",
  },
  {
    type: "irt",
    validityDays: 365,
    reminderDays: 30,
    status: "expired",
  },
];

/**
 * Load app settings from storage
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!data) {
      return {
        flightName: "",
        currencies: DEFAULT_CURRENCIES,
        theme: "default",
        dayCurrencyRefreshMode: "day_flight_only",
      };
    }
    const stored = JSON.parse(data);
    // Merge stored currencies with defaults to handle missing fields from older versions
    const flightBased = ["day", "night", "nvg"];
    let migrated = false;
    stored.currencies = DEFAULT_CURRENCIES.map((def) => {
      const found = (stored.currencies as Currency[] | undefined)?.find(
        (c) => c.type === def.type
      );
      if (!found) return def;
      const merged = { ...def, ...found };
      // Migration: flight-based currencies should never carry the old 365-day default.
      // Reset to current default AND flag for re-save so it persists.
      if (flightBased.includes(def.type) && merged.validityDays === 365) {
        merged.validityDays = def.validityDays;
        migrated = true;
      }
      return merged;
    });
    // Persist migrated values immediately so they survive the next cold start
    if (migrated) {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
    }
    return stored;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return {
      flightName: "",
      currencies: DEFAULT_CURRENCIES,
      theme: "default",
      dayCurrencyRefreshMode: "day_flight_only",
    };
  }
}

/**
 * Save app settings to storage
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}

/**
 * Update flight name (automatically converted to uppercase)
 */
export async function updateFlightName(name: string): Promise<void> {
  const settings = await loadSettings();
  settings.flightName = name.toUpperCase();
  await saveSettings(settings);
}

/**
 * Update currency settings
 */
export async function updateCurrencies(currencies: Currency[]): Promise<void> {
  const settings = await loadSettings();
  settings.currencies = currencies;
  await saveSettings(settings);
}
