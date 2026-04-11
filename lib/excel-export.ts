/**
 * Excel export utility for flight data
 * Matches Excel logbook format with detailed breakdown
 */

import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { Flight } from "@/types/flight";
import type { StructuredTotals } from "./structured-totals";
import { formatHours } from "./calculations";

export interface ExportOptions {
  flights: Flight[];
  totals: StructuredTotals;
  title: string;
  filename: string;
}

/**
 * Export flight data to Excel (.xlsx)
 * Format matches Excel logbook with detailed breakdown
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { flights, totals, title, filename } = options;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Prepare totals data with detailed breakdown matching Excel format
  const totalsData = [
    ["Flight Hours Summary - " + title, ""],
    ["", ""],
    ["Total Flight Hours", formatHours(totals.totalHours)],
    ["Number of Flights", totals.flightCount.toString()],
    ["", ""],
    
    // Day Flying Breakdown
    ["Day Flying", ""],
    ["  1st PLT", formatHours(totals.day1stPlt)],
    ["  2nd PLT", formatHours(totals.day2ndPlt)],
    ["  DUAL", formatHours(totals.dayDual)],
    ["", ""],
    
    // Night Flying Breakdown
    ["Night Flying", ""],
    ["  1st PLT", formatHours(totals.night1stPlt)],
    ["  2nd PLT", formatHours(totals.night2ndPlt)],
    ["  DUAL", formatHours(totals.nightDual)],
    ["", ""],
    
    // NVG Breakdown
    ["NVG", ""],
    ["  1st PLT", formatHours(totals.nvg1stPlt)],
    ["  2nd PLT", formatHours(totals.nvg2ndPlt)],
    ["  DUAL", formatHours(totals.nvgDual)],
    ["", ""],
    
    // Instrument Flight Breakdown
    ["I.F (Instrument Flight)", ""],
    ["  SIM", formatHours(totals.ifSim)],
    ["  ACT", formatHours(totals.ifAct)],
    ["", ""],
    
    // Captain Hours
    ["CAP (Captain Hours)", formatHours(totals.captainHours)],
    ["", ""],
    
    // Dual Hours Summary
    ["Dual Hours Summary", ""],
    ["  Day Dual", formatHours(totals.dualDayHours)],
    ["  Night Dual", formatHours(totals.dualNightHours)],
    ["  NVG Dual", formatHours(totals.dualNVGHours)],
    ["  Instrument Dual", formatHours(totals.dualInstrumentHours)],
    ["", ""],

    // Approach Counts
    ["Approach Counts", ""],
    ["  ILS Approaches", totals.totalILSApproaches.toString()],
    ["  VOR Approaches", totals.totalVORApproaches.toString()],
  ];

  // Create totals worksheet
  const totalsWorksheet = XLSX.utils.aoa_to_sheet(totalsData);
  
  // Set column widths
  totalsWorksheet["!cols"] = [
    { wch: 30 }, // Column A (labels)
    { wch: 15 }, // Column B (values)
  ];
  
  XLSX.utils.book_append_sheet(workbook, totalsWorksheet, "Summary");

  // Prepare flight details data with all fields
  const flightHeaders = [
    "Date",
    "Aircraft Type",
    "Aircraft #",
    "Captain Name",
    "Co-Pilot Name",
    "Mission",
    "Condition",
    "NVG",
    "Position",
    "CAP",
    "Flight Time",
    "Dual Hours",
    "I.F",
    "SIM",
    "ACT",
    "ILS",
    "VOR",
  ];

  const flightRows = flights
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((flight) => [
      (() => { const d = new Date(flight.date); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; })(),
      flight.aircraftType,
      flight.aircraftNumber,
      flight.captainName,
      flight.coPilotName,
      flight.mission,
      flight.condition.toUpperCase(),
      flight.nvg ? "YES" : "NO",
      flight.position === "1st_plt" ? "1ST PLT" : "2ND PLT",
      flight.countsAsCaptain ? "YES" : "NO",
      formatHours(flight.flightTime),
      formatHours(flight.dualHours),
      flight.instrumentFlight ? "YES" : "NO",
      flight.simulationTime ? formatHours(flight.simulationTime) : "-",
      flight.actualHours ? formatHours(flight.actualHours) : "-",
      flight.ilsCount || 0,
      flight.vorCount || 0,
    ]);

  const totalRow = [
    "TOTAL",
    "", "", "", "", "", "", "", "", "",
    formatHours(flights.reduce((s, f) => s + (f.flightTime || 0), 0)),
    formatHours(flights.reduce((s, f) => s + (f.dualHours || 0), 0)),
    "", "", "",
    flights.reduce((s, f) => s + (f.ilsCount || 0), 0),
    flights.reduce((s, f) => s + (f.vorCount || 0), 0),
  ];

  const flightData = [flightHeaders, ...flightRows, [], totalRow];

  // Create flights worksheet
  const flightsWorksheet = XLSX.utils.aoa_to_sheet(flightData);
  
  // Set column widths for flights sheet
  flightsWorksheet["!cols"] = [
    { wch: 12 }, // Date
    { wch: 15 }, // Aircraft Type
    { wch: 12 }, // Aircraft #
    { wch: 20 }, // Captain Name
    { wch: 20 }, // Co-Pilot Name
    { wch: 15 }, // Mission
    { wch: 10 }, // Condition
    { wch: 8 },  // NVG
    { wch: 10 }, // Position
    { wch: 8 },  // CAP
    { wch: 12 }, // Flight Time
    { wch: 12 }, // Dual Hours
    { wch: 8 },  // I.F
    { wch: 10 }, // SIM
    { wch: 10 }, // ACT
    { wch: 8 },  // ILS
    { wch: 8 },  // VOR
  ];
  
  XLSX.utils.book_append_sheet(workbook, flightsWorksheet, "Flights");

  // Generate Excel file
  const wbout = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

  // Save and share file
  const fileUri = `${FileSystem.documentDirectory!}${filename}.xlsx`;
  
  try {
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: "base64" as any,
    });

    if (Platform.OS === "web") {
      // For web, trigger download
      const blob = base64ToBlob(wbout, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // For mobile, use sharing
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: `Export ${title}`,
          UTI: "com.microsoft.excel.xlsx",
        });
      }
    }
  } catch (error) {
    console.error("Failed to export Excel:", error);
    throw new Error("Failed to export Excel file");
  }
}

/**
 * Convert base64 to Blob (for web)
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
