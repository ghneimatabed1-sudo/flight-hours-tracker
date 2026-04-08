import { ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useFlights } from "@/lib/flight-context";
import { repairFlight, type ValidationError } from "@/lib/data-integrity";

export default function DataIntegrityScreen() {
  const router = useRouter();
  const { integrityReport, runIntegrityCheck, flights, updateFlight, refreshFlights } = useFlights();
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const handleRunCheck = async () => {
    setChecking(true);
    try {
      await runIntegrityCheck();
      Alert.alert("Check Complete", "Data integrity check completed successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to run integrity check");
    } finally {
      setChecking(false);
    }
  };

  const handleRepairData = async () => {
    if (!integrityReport) return;

    Alert.alert(
      "Repair Data",
      `This will attempt to repair ${integrityReport.errors.length} error(s). A backup will be created first. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Repair",
          style: "destructive",
          onPress: async () => {
            setRepairing(true);
            try {
              let repairedCount = 0;
              const allChanges: string[] = [];

              for (const flight of flights) {
                const { repaired, changes } = repairFlight(flight);
                if (changes.length > 0) {
                  await updateFlight(flight.id, repaired);
                  repairedCount++;
                  allChanges.push(...changes);
                }
              }

              await refreshFlights();
              await runIntegrityCheck();

              Alert.alert(
                "Repair Complete",
                `Repaired ${repairedCount} flight(s).\n\nChanges:\n${allChanges.slice(0, 10).join("\n")}${allChanges.length > 10 ? `\n...and ${allChanges.length - 10} more` : ""}`
              );
            } catch (error) {
              Alert.alert("Error", "Failed to repair data");
            } finally {
              setRepairing(false);
            }
          },
        },
      ]
    );
  };

  const renderErrorItem = (error: ValidationError, index: number) => (
    <View key={index} className="bg-surface rounded-xl p-4 border border-border">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-sm font-semibold text-foreground flex-1">
          Flight ID: {error.flightId.slice(0, 8)}...
        </Text>
        <View
          className={`px-2 py-1 rounded ${error.severity === "error" ? "bg-error" : "bg-warning"}`}
        >
          <Text className="text-xs font-semibold text-background uppercase">
            {error.severity}
          </Text>
        </View>
      </View>
      <Text className="text-sm text-muted mb-1">Field: {error.field}</Text>
      <Text className="text-sm text-foreground">{error.error}</Text>
      {error.recoverable && (
        <Text className="text-xs text-success mt-2">✓ Recoverable</Text>
      )}
    </View>
  );

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Header */}
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="px-4 py-2 bg-surface rounded-lg border border-border"
            >
              <Text className="text-foreground font-semibold">Back</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">Data Integrity</Text>
            </View>
          </View>

          {/* Summary Card */}
          {integrityReport && (
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-lg font-semibold text-foreground mb-4">
                Integrity Summary
              </Text>
              
              <View className="gap-3">
                <View className="flex-row justify-between">
                  <Text className="text-muted">Total Flights</Text>
                  <Text className="text-foreground font-semibold">
                    {integrityReport.totalFlights}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-muted">Valid Flights</Text>
                  <Text className="text-success font-semibold">
                    {integrityReport.validFlights}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-muted">Errors</Text>
                  <Text className="text-error font-semibold">
                    {integrityReport.errors.length}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-muted">Warnings</Text>
                  <Text className="text-warning font-semibold">
                    {integrityReport.warnings.length}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-muted">Corrupted Flights</Text>
                  <Text className="text-error font-semibold">
                    {integrityReport.corruptedFlights.length}
                  </Text>
                </View>
              </View>

              <View
                className={`mt-4 p-3 rounded-xl ${integrityReport.valid ? "bg-success" : "bg-error"}`}
              >
                <Text className="text-background font-semibold text-center">
                  {integrityReport.valid ? "✓ DATA VALID" : "⚠ ISSUES DETECTED"}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleRunCheck}
              disabled={checking}
              className="bg-primary rounded-xl py-4 items-center"
            >
              {checking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-background font-semibold text-base">
                  Run Integrity Check
                </Text>
              )}
            </TouchableOpacity>

            {integrityReport && integrityReport.errors.length > 0 && (
              <TouchableOpacity
                onPress={handleRepairData}
                disabled={repairing}
                className="bg-surface border border-primary rounded-xl py-4 items-center"
              >
                {repairing ? (
                  <ActivityIndicator color="#6B7F5F" />
                ) : (
                  <Text className="text-primary font-semibold text-base">
                    Attempt Automatic Repair
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Errors List */}
          {integrityReport && integrityReport.errors.length > 0 && (
            <View className="gap-4">
              <Text className="text-xl font-semibold text-foreground">
                Errors ({integrityReport.errors.length})
              </Text>
              {integrityReport.errors.map(renderErrorItem)}
            </View>
          )}

          {/* Warnings List */}
          {integrityReport && integrityReport.warnings.length > 0 && (
            <View className="gap-4">
              <Text className="text-xl font-semibold text-foreground">
                Warnings ({integrityReport.warnings.length})
              </Text>
              {integrityReport.warnings.map(renderErrorItem)}
            </View>
          )}

          {!integrityReport && (
            <View className="items-center py-12">
              <Text className="text-muted text-center">
                Run an integrity check to see the status of your flight data
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
