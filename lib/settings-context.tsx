/**
 * Settings context provider for app configuration
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AppSettings, Currency } from "@/types/currency";
import { loadSettings, saveSettings, updateFlightName as updateFlightNameStorage } from "./settings-storage";

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  updateFlightName: (name: string) => Promise<void>;
  updateCurrencies: (currencies: Currency[]) => Promise<void>;
  updateTheme: (theme: "default" | "dark") => Promise<void>;
  updateDayCurrencyRefreshMode: (mode: "day_flight_only" | "duration_half_hour") => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    flightName: "",
    currencies: [],
    theme: "default",
    dayCurrencyRefreshMode: "day_flight_only",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettingsFromStorage();
  }, []);

  const loadSettingsFromStorage = async () => {
    setLoading(true);
    try {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = useCallback(async () => {
    await loadSettingsFromStorage();
  }, []);

  const updateFlightName = useCallback(async (name: string) => {
    const uppercaseName = name.toUpperCase();
    const newSettings = { ...settings, flightName: uppercaseName };
    await saveSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  const updateCurrencies = useCallback(async (currencies: Currency[]) => {
    const newSettings = { ...settings, currencies };
    await saveSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  const updateTheme = useCallback(async (theme: "default" | "dark") => {
    const newSettings = { ...settings, theme };
    await saveSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  const updateDayCurrencyRefreshMode = useCallback(async (mode: "day_flight_only" | "duration_half_hour") => {
    const newSettings = { ...settings, dayCurrencyRefreshMode: mode };
    await saveSettings(newSettings);
    setSettings(newSettings);
  }, [settings]);

  const value: SettingsContextValue = {
    settings,
    loading,
    updateFlightName,
    updateCurrencies,
    updateTheme,
    updateDayCurrencyRefreshMode,
    refreshSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
