/**
 * Flight data context provider for managing flight entries and automatic calculations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Flight, FlightInput, FlightTotals, MonthlyReport } from "@/types/flight";
import {
  loadFlights,
  saveFlights,
  addFlight as addFlightToStorage,
  updateFlight as updateFlightInStorage,
  deleteFlight as deleteFlightFromStorage,
} from "@/lib/storage";
import {
  calculateTotals,
  generateMonthlyReport,
  calculateGrandTotals,
  type GrandTotals,
} from "@/lib/calculations";
import { checkDataIntegrity, type IntegrityReport } from "@/lib/data-integrity";
import { useInitialHours } from "@/lib/initial-hours-context";

interface FlightContextValue {
  flights: Flight[];
  loading: boolean;
  integrityReport: IntegrityReport | null;
  addFlight: (input: FlightInput) => Promise<void>;
  updateFlight: (id: string, updates: Partial<FlightInput>) => Promise<void>;
  deleteFlight: (id: string) => Promise<boolean | undefined>;
  getMonthlyReport: (year: number, month: number) => MonthlyReport;
  getCurrentMonthTotals: () => FlightTotals;
  getGrandTotals: () => GrandTotals;
  refreshFlights: () => Promise<void>;
  runIntegrityCheck: () => Promise<IntegrityReport>;
}

const FlightContext = createContext<FlightContextValue | undefined>(undefined);

export function FlightProvider({ children }: { children: React.ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const { initialHours } = useInitialHours();

  // Load flights on mount
  useEffect(() => {
    loadFlightsFromStorage();
  }, []);

  const loadFlightsFromStorage = async () => {
    setLoading(true);
    try {
      const loadedFlights = await loadFlights();
      setFlights(loadedFlights);
      
      // Run integrity check on loaded data
      const report = await checkDataIntegrity(loadedFlights);
      setIntegrityReport(report);
      
      if (!report.valid) {
        console.warn("Data integrity issues detected:", {
          errors: report.errors.length,
          warnings: report.warnings.length,
          corrupted: report.corruptedFlights.length,
        });
      }
    } catch (error) {
      console.error("Failed to load flights:", error);
    } finally {
      setLoading(false);
    }
  };

  const runIntegrityCheck = useCallback(async (): Promise<IntegrityReport> => {
    const report = await checkDataIntegrity(flights);
    setIntegrityReport(report);
    return report;
  }, [flights]);

  const refreshFlights = useCallback(async () => {
    await loadFlightsFromStorage();
  }, []);

  const addFlight = useCallback(async (input: FlightInput) => {
    const newFlight: Flight = {
      id: `flight_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addFlightToStorage(newFlight);
    await refreshFlights();
  }, [refreshFlights]);

  const updateFlight = useCallback(async (id: string, updates: Partial<FlightInput>) => {
    await updateFlightInStorage(id, updates);
    await refreshFlights();
  }, [refreshFlights]);

  const deleteFlight = useCallback(async (id: string) => {
    // Check if deleting an IRT flight
    const flightToDelete = flights.find(f => f.id === id);
    const isIRTFlight = flightToDelete && 
      flightToDelete.instrumentFlight && 
      flightToDelete.mission?.toUpperCase() === "IRT" && 
      (flightToDelete.dualHours || 0) > 0;
    
    await deleteFlightFromStorage(id);
    await refreshFlights();
    
    // Return IRT flag so caller can show alert
    return isIRTFlight;
  }, [flights, refreshFlights]);

  // Filter out corrupted flights so they never affect totals or reports
  const safeFlights = useCallback((): Flight[] => {
    if (!integrityReport || integrityReport.corruptedFlights.length === 0) return flights;
    const corruptedSet = new Set(integrityReport.corruptedFlights);
    return flights.filter((f) => !corruptedSet.has(f.id));
  }, [flights, integrityReport]);

  const getMonthlyReport = useCallback((year: number, month: number): MonthlyReport => {
    return generateMonthlyReport(safeFlights(), year, month, initialHours);
  }, [safeFlights, initialHours]);

  const getCurrentMonthTotals = useCallback((): FlightTotals => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const report = generateMonthlyReport(safeFlights(), year, month, initialHours);
    return report.totals;
  }, [safeFlights, initialHours]);

  const getGrandTotals = useCallback((): GrandTotals => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return calculateGrandTotals(safeFlights(), year, month, initialHours);
  }, [safeFlights, initialHours]);

  const value: FlightContextValue = {
    flights,
    loading,
    integrityReport,
    addFlight,
    updateFlight,
    deleteFlight,
    getMonthlyReport,
    getCurrentMonthTotals,
    getGrandTotals,
    refreshFlights,
    runIntegrityCheck,
  };

  return <FlightContext.Provider value={value}>{children}</FlightContext.Provider>;
}

export function useFlights() {
  const context = useContext(FlightContext);
  if (!context) {
    throw new Error("useFlights must be used within FlightProvider");
  }
  return context;
}
