import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { InitialHours, DEFAULT_INITIAL_HOURS } from "@/types/initial-hours";

const STORAGE_KEY = "@flight_hours_tracker:initial_hours";

interface InitialHoursContextType {
  initialHours: InitialHours;
  updateInitialHours: (hours: InitialHours) => Promise<void>;
  isLoading: boolean;
}

const InitialHoursContext = createContext<InitialHoursContextType | undefined>(undefined);

export function InitialHoursProvider({ children }: { children: ReactNode }) {
  const [initialHours, setInitialHours] = useState<InitialHours>(DEFAULT_INITIAL_HOURS);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial hours from storage on mount
  useEffect(() => {
    loadInitialHours();
  }, []);

  const loadInitialHours = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        setInitialHours({ ...DEFAULT_INITIAL_HOURS, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load initial hours:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateInitialHours = async (hours: InitialHours) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hours));
      setInitialHours(hours);
    } catch (error) {
      console.error("Failed to save initial hours:", error);
      throw error;
    }
  };

  return (
    <InitialHoursContext.Provider value={{ initialHours, updateInitialHours, isLoading }}>
      {children}
    </InitialHoursContext.Provider>
  );
}

export function useInitialHours() {
  const context = useContext(InitialHoursContext);
  if (context === undefined) {
    throw new Error("useInitialHours must be used within an InitialHoursProvider");
  }
  return context;
}
