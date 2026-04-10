import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useFlights } from "@/lib/flight-context";
import { useSettings } from "@/lib/settings-context";
import { useInitialHours } from "@/lib/initial-hours-context";
import { formatHours } from "@/lib/calculations";
import { getAllStructuredTotals, type StructuredTotals, calculateMonthTotals, calculateYearTotals, calculateGrandTotals } from "@/lib/structured-totals";
import { exportToExcel } from "@/lib/excel-export";
import type { Flight } from "@/types/flight";

const FLIGHTS_PER_PAGE = 10;

export default function TrackingScreen() {
  const router = useRouter();
  const { flights, loading, deleteFlight, getMonthlyReport } = useFlights();
  const { settings } = useSettings();
  const { initialHours } = useInitialHours();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Period selection (default to current month)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // Get all structured totals
  const allTotals = getAllStructuredTotals(flights, selectedYear, selectedMonth, initialHours);

  // Get report for selected period (for flight list)
  const report = getMonthlyReport(selectedYear, selectedMonth);

  // Sort flights by date (most recent first)
  const sortedFlights = [...report.flights].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Pagination
  const totalPages = Math.ceil(sortedFlights.length / FLIGHTS_PER_PAGE);
  const startIndex = (currentPage - 1) * FLIGHTS_PER_PAGE;
  const endIndex = startIndex + FLIGHTS_PER_PAGE;
  const paginatedFlights = sortedFlights.slice(startIndex, endIndex);

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setCurrentPage(1); // Reset to first page when changing period
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setCurrentPage(1); // Reset to first page when changing period
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handleDeleteFlight = (flight: Flight) => {
    Alert.alert(
      "Delete Flight",
      `Delete flight on ${new Date(flight.date).toLocaleDateString()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            await deleteFlight(flight.id);
          },
        },
      ]
    );
  };

  const handleEditFlight = (flightId: string) => {
    router.push(`/flight-detail?id=${flightId}`);
  };

  const handleExportMonth = async () => {
    try {
      const monthFlights = flights.filter((f) => {
        const date = new Date(f.date);
        return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
      });
      const totals = calculateMonthTotals(flights, selectedYear, selectedMonth);
      await exportToExcel({
        flights: monthFlights,
        totals,
        title: `${monthName}`,
        filename: `FlightHours_${selectedYear}_${selectedMonth.toString().padStart(2, "0")}`,
      });
      Alert.alert("Success", "Monthly report exported successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to export monthly report");
    }
  };

  const handleExportYear = async () => {
    try {
      const yearFlights = flights.filter((f) => {
        const date = new Date(f.date);
        return date.getFullYear() === selectedYear;
      });
      const totals = calculateYearTotals(flights, selectedYear);
      await exportToExcel({
        flights: yearFlights,
        totals,
        title: `Year ${selectedYear}`,
        filename: `FlightHours_${selectedYear}`,
      });
      Alert.alert("Success", "Yearly report exported successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to export yearly report");
    }
  };

  const handleExportGrandTotal = async () => {
    try {
      const totals = calculateGrandTotals(flights, initialHours);
      await exportToExcel({
        flights,
        totals,
        title: "Grand Total",
        filename: `FlightHours_GrandTotal`,
      });
      Alert.alert("Success", "Grand total report exported successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to export grand total report");
    }
  };

  const renderTotalsCard = (title: string, totals: StructuredTotals, highlight: boolean = false) => (
    <View className={`rounded-2xl p-5 border ${highlight ? "bg-primary border-primary" : "bg-surface border-border"}`}>
      <Text className={`text-sm mb-3 font-semibold ${highlight ? "text-background opacity-90" : "text-muted"}`}>
        {title}
      </Text>
      
      <View className="gap-2">
        {/* Total Hours and Flights */}
        <View className="flex-row justify-between">
          <Text className={`text-sm ${highlight ? "text-background opacity-80" : "text-muted"}`}>Total Hours</Text>
          <Text className={`text-lg font-bold ${highlight ? "text-background" : "text-foreground"}`}>
            {formatHours(totals.totalHours)}
          </Text>
        </View>
        
        <View className="flex-row justify-between">
          <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>Flights</Text>
          <Text className={`text-sm font-semibold ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
            {totals.flightCount}
          </Text>
        </View>

        <View className={`h-px ${highlight ? "bg-background opacity-20" : "bg-border"} my-2`} />

        {/* DAY FLYING */}
        <Text className={`text-xs font-bold ${highlight ? "text-background opacity-90" : "text-primary"}`}>DAY FLYING</Text>
        <View className="pl-3 gap-1">
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>1st PLT</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.day1stPlt)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>2nd PLT</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.day2ndPlt)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>DUAL</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.dayDual)}
            </Text>
          </View>
          <View className="flex-row justify-between border-t border-border pt-1 mt-1">
            <Text className={`text-xs font-semibold ${highlight ? "text-background opacity-80" : "text-foreground"}`}>Total Day</Text>
            <Text className={`text-sm font-bold ${highlight ? "text-background" : "text-foreground"}`}>
              {formatHours(totals.dayHours)}
            </Text>
          </View>
        </View>

        <View className={`h-px ${highlight ? "bg-background opacity-20" : "bg-border"} my-1`} />

        {/* NIGHT FLYING */}
        <Text className={`text-xs font-bold ${highlight ? "text-background opacity-90" : "text-primary"}`}>NIGHT FLYING</Text>
        <View className="pl-3 gap-1">
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>1st PLT</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.night1stPlt)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>2nd PLT</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.night2ndPlt)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>DUAL</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.nightDual)}
            </Text>
          </View>
          <View className="flex-row justify-between border-t border-border pt-1 mt-1">
            <Text className={`text-xs font-semibold ${highlight ? "text-background opacity-80" : "text-foreground"}`}>Total Night</Text>
            <Text className={`text-sm font-bold ${highlight ? "text-background" : "text-foreground"}`}>
              {formatHours(totals.nightHours)}
            </Text>
          </View>
        </View>

        <View className={`h-px ${highlight ? "bg-background opacity-20" : "bg-border"} my-1`} />

        {/* NVG */}
        <Text className={`text-xs font-bold ${highlight ? "text-background opacity-90" : "text-primary"}`}>NVG</Text>
        <View className="pl-3 gap-1">
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>1st PLT</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.nvg1stPlt)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>2nd PLT</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.nvg2ndPlt)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>DUAL</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.nvgDual)}
            </Text>
          </View>
          <View className="flex-row justify-between border-t border-border pt-1 mt-1">
            <Text className={`text-xs font-semibold ${highlight ? "text-background opacity-80" : "text-foreground"}`}>Total NVG</Text>
            <Text className={`text-sm font-bold ${highlight ? "text-background" : "text-foreground"}`}>
              {formatHours(totals.nvgHours)}
            </Text>
          </View>
        </View>

        <View className={`h-px ${highlight ? "bg-background opacity-20" : "bg-border"} my-1`} />

        {/* INSTRUMENT FLIGHT */}
        <Text className={`text-xs font-bold ${highlight ? "text-background opacity-90" : "text-primary"}`}>I.F (Instrument Flight)</Text>
        <View className="pl-3 gap-1">
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>SIM</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.ifSim)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className={`text-xs ${highlight ? "text-background opacity-70" : "text-muted"}`}>ACT</Text>
            <Text className={`text-sm ${highlight ? "text-background opacity-90" : "text-foreground"}`}>
              {formatHours(totals.ifAct)}
            </Text>
          </View>
          <View className="flex-row justify-between border-t border-border pt-1 mt-1">
            <Text className={`text-xs font-semibold ${highlight ? "text-background opacity-80" : "text-foreground"}`}>Total I.F</Text>
            <Text className={`text-sm font-bold ${highlight ? "text-background" : "text-foreground"}`}>
              {formatHours(totals.instrumentFlightHours)}
            </Text>
          </View>
        </View>

        <View className={`h-px ${highlight ? "bg-background opacity-20" : "bg-border"} my-1`} />

        {/* CAPTAIN HOURS */}
        <View className="flex-row justify-between">
          <Text className={`text-xs font-bold ${highlight ? "text-background opacity-90" : "text-primary"}`}>CAP (Captain Hours)</Text>
          <Text className={`text-sm font-bold ${highlight ? "text-background" : "text-foreground"}`}>
            {formatHours(totals.captainHours)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Flight Name Header */}
          {settings.flightName && (
            <View className="items-center py-2 border-b border-border">
              <Text className="text-xl font-bold text-primary">
                {settings.flightName}
              </Text>
            </View>
          )}

          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Flight Tracking</Text>
            <Text className="text-base text-muted mt-1">
              View totals and flights by period
            </Text>
          </View>

          {/* Month/Year Selector */}
          <View className="flex-row items-center justify-between bg-surface rounded-xl p-4 border border-border">
            <TouchableOpacity
              onPress={handlePreviousMonth}
              className="px-4 py-2 bg-background rounded-lg"
            >
              <Text className="text-foreground font-semibold text-lg">{"<"}</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-foreground">{monthName}</Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              className="px-4 py-2 bg-background rounded-lg"
            >
              <Text className="text-foreground font-semibold text-lg">{">"}</Text>
            </TouchableOpacity>
          </View>

          {/* Export Buttons */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Export to Excel</Text>
            
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleExportMonth}
                className="flex-1 bg-primary rounded-xl py-3 items-center"
              >
                <Text className="text-background font-semibold">Export Month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExportYear}
                className="flex-1 bg-primary rounded-xl py-3 items-center"
              >
                <Text className="text-background font-semibold">Export Year</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleExportGrandTotal}
              className="bg-surface border border-primary rounded-xl py-3 items-center"
            >
              <Text className="text-primary font-semibold">Export Grand Total</Text>
            </TouchableOpacity>
          </View>

          {/* Structured Totals */}
          <View className="gap-4">
            <Text className="text-xl font-semibold text-foreground">Totals Summary</Text>
            
            {/* Grand Total - Highlighted */}
            {renderTotalsCard("Grand Total (All Flights)", allTotals.grandTotal, true)}

            {/* Selected Month */}
            {renderTotalsCard(`Selected Month (${monthName})`, allTotals.selectedMonth)}

            {/* Full Year */}
            {renderTotalsCard(`Full Year (${selectedYear})`, allTotals.fullYear)}

            {/* First Half */}
            {renderTotalsCard(`First Half (Jan-Jun ${selectedYear})`, allTotals.firstHalf)}

            {/* Second Half */}
            {renderTotalsCard(`Second Half (Jul-Dec ${selectedYear})`, allTotals.secondHalf)}
          </View>

          {/* Flight List */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">
              Flights ({sortedFlights.length})
            </Text>

            {paginatedFlights.length === 0 ? (
              <View className="bg-surface rounded-xl p-6 items-center border border-border">
                <Text className="text-muted">No flights recorded for this period</Text>
              </View>
            ) : (
              <>
                {paginatedFlights.map((flight) => (
                  <TouchableOpacity
                    key={flight.id}
                    onPress={() => handleEditFlight(flight.id)}
                    onLongPress={() => handleDeleteFlight(flight)}
                    className="bg-surface rounded-xl p-4 border border-border"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {flight.aircraftType} - {flight.aircraftNumber}
                        </Text>
                        <Text className="text-sm text-muted mt-1">
                          {new Date(flight.date).toLocaleDateString()}
                        </Text>
                        {flight.mission && (
                          <Text className="text-sm text-foreground mt-1" numberOfLines={1}>
                            {flight.mission}
                          </Text>
                        )}
                        <View className="flex-row gap-2 mt-1">
                          {flight.captainName && (
                            <Text className="text-xs text-muted" numberOfLines={1}>
                              CAP: {flight.captainName}
                            </Text>
                          )}
                          {flight.coPilotName && (
                            <Text className="text-xs text-muted" numberOfLines={1}>
                              CO-P: {flight.coPilotName}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-xl font-bold text-primary">
                          {formatHours(flight.flightTime)}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          {flight.position === "1st_plt" ? "1st PLT" : "2nd PLT"}
                          {flight.countsAsCaptain && " (CAP)"}
                          {flight.dualHours > 0 && ` + ${formatHours(flight.dualHours)} DUAL`}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row gap-2 flex-wrap mt-2">
                      <View className="px-2 py-1 bg-background rounded">
                        <Text className="text-xs text-muted">
                          {flight.condition.toUpperCase()}
                        </Text>
                      </View>
                      {flight.nvg && (
                        <View className="px-2 py-1 bg-background rounded">
                          <Text className="text-xs text-success">NVG</Text>
                        </View>
                      )}
                      {flight.instrumentFlight && (
                        <View className="px-2 py-1 bg-background rounded">
                          <Text className="text-xs text-warning">IF</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <View className="flex-row justify-between items-center mt-4">
                    <TouchableOpacity
                      onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === 1 ? "bg-surface opacity-50" : "bg-primary"
                      }`}
                    >
                      <Text
                        className={`font-semibold ${
                          currentPage === 1 ? "text-muted" : "text-background"
                        }`}
                      >
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <Text className="text-sm text-muted">
                      Page {currentPage} of {totalPages}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === totalPages ? "bg-surface opacity-50" : "bg-primary"
                      }`}
                    >
                      <Text
                        className={`font-semibold ${
                          currentPage === totalPages ? "text-muted" : "text-background"
                        }`}
                      >
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
