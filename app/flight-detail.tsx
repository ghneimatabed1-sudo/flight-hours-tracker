import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useFlights } from "@/lib/flight-context";
import type { FlightCondition, FlightPosition, FlightType, Flight } from "@/types/flight";

export default function FlightDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { flights, updateFlight, deleteFlight } = useFlights();

  const [loading, setLoading] = useState(true);
  const [flight, setFlight] = useState<Flight | null>(null);

  const [date, setDate] = useState("");
  const [aircraftType, setAircraftType] = useState("UH-60M");
  const [aircraftNumber, setAircraftNumber] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [coPilotName, setCoPilotName] = useState("");
  const [mission, setMission] = useState("");
  const [condition, setCondition] = useState<FlightCondition>("day");
  const [nvg, setNvg] = useState(false);
  const [position, setPosition] = useState<FlightPosition>("1st_plt");
  const [countsAsCaptain, setCountsAsCaptain] = useState(false);
  const [flightTime, setFlightTime] = useState("");
  const [dualHours, setDualHours] = useState("");
  const [type, setType] = useState<FlightType>("act");
  const [instrumentFlight, setInstrumentFlight] = useState(false);
  const [simulationTime, setSimulationTime] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [ilsCount, setIlsCount] = useState("");
  const [vorCount, setVorCount] = useState("");
  const [saving, setSaving] = useState(false);

  

  useEffect(() => {
    const foundFlight = flights.find((f) => f.id === id);
    if (foundFlight) {
      setFlight(foundFlight);
      setDate(foundFlight.date);
      setAircraftType(foundFlight.aircraftType);
      setAircraftNumber(foundFlight.aircraftNumber);
      setCaptainName(foundFlight.captainName);
      setCoPilotName(foundFlight.coPilotName);
      setMission(foundFlight.mission);
      setCondition(foundFlight.condition);
      setNvg(foundFlight.nvg);
      setPosition(foundFlight.position);
      setCountsAsCaptain(foundFlight.countsAsCaptain);
      setFlightTime(foundFlight.flightTime.toString());
      setDualHours(foundFlight.dualHours.toString());
      setType(foundFlight.type);
      setInstrumentFlight(foundFlight.instrumentFlight);
      setSimulationTime(foundFlight.simulationTime?.toString() || "");
      setActualHours(foundFlight.actualHours?.toString() || "");
      setIlsCount(foundFlight.ilsCount?.toString() || "");
      setVorCount(foundFlight.vorCount?.toString() || "");
    }
    setLoading(false);
  }, [id, flights]);

  const handleSave = async () => {
    // Validate inputs
    if (!date || !aircraftType || !aircraftNumber || !captainName || !coPilotName) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    const timeValue = flightTime ? parseFloat(flightTime) : 0;
    const dualValue = dualHours ? parseFloat(dualHours) : 0;

    // At least one of Flight Hours or Dual Hours must be provided
    if (timeValue === 0 && dualValue === 0) {
      Alert.alert("Missing Hours", "Please enter either Flight Hours or Dual Hours (or both).");
      return;
    }

    if (flightTime && (isNaN(timeValue) || timeValue < 0)) {
      Alert.alert("Invalid Flight Time", "Please enter a valid flight time (e.g., 1.5, 2.3)");
      return;
    }

    if (dualHours && (isNaN(dualValue) || dualValue < 0)) {
      Alert.alert("Invalid Dual Hours", "Please enter a valid dual hours value (e.g., 0.5, 1.0)");
      return;
    }

    setSaving(true);
    try {
      if (!flight) return;

    await updateFlight(flight.id, {
        date,
        aircraftType,
        aircraftNumber,
        captainName,
        coPilotName,
        mission,
        condition,
        nvg,
        position,
        countsAsCaptain,
        flightTime: timeValue,
        dualHours: dualValue,
        type,
        instrumentFlight,
        simulationTime: simulationTime ? parseFloat(simulationTime) : undefined,
        actualHours: actualHours ? parseFloat(actualHours) : undefined,
        ilsCount: ilsCount ? parseInt(ilsCount) : undefined,
        vorCount: vorCount ? parseInt(vorCount) : undefined,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Reset form
      setDate(new Date().toISOString().split("T")[0]);
      setAircraftType("UH-60M");
      setAircraftNumber("");
      setCaptainName("");
      setCoPilotName("");
      setMission("");
      setCondition("day");
      setNvg(false);
      setPosition("1st_plt");
      setCountsAsCaptain(false);
      setFlightTime("");
      setDualHours("");
      setType("act");
      setInstrumentFlight(false);
      setSimulationTime("");
      setIlsCount("");
      setVorCount("");

      Alert.alert("Success", "Flight updated successfully!", [
        {
          text: "OK",
          onPress: () => router.push("/"),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save flight. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text className="text-muted mt-4">Loading flight details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!flight) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground text-lg">Flight not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 px-6 py-3 bg-primary rounded-lg"
          >
            <Text className="text-background font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6 pb-8">
          {/* Header with Back Button */}
          <View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-4 flex-row items-center"
            >
              <Text className="text-primary text-lg font-semibold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">Edit Flight</Text>
            <Text className="text-base text-muted mt-1">
              Edit flight details - totals calculated automatically
            </Text>
          </View>

          {/* Flight Info Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Flight Information</Text>

            <View>
              <Text className="text-sm text-muted mb-2">Date *</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>

            <View>
              <Text className="text-sm text-muted mb-2">Aircraft Type *</Text>
              <TextInput
                value={aircraftType}
                onChangeText={(text) => setAircraftType(text.toUpperCase())}
                placeholder="e.g., UH-60M"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>

            <View>
              <Text className="text-sm text-muted mb-2">Aircraft Number *</Text>
              <TextInput
                value={aircraftNumber}
                onChangeText={(text) => setAircraftNumber(text.toUpperCase())}
                placeholder="e.g., 12345"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Crew Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Crew</Text>

            <View>
              <Text className="text-sm text-muted mb-2">Captain Name *</Text>
              <TextInput
                value={captainName}
                onChangeText={(text) => setCaptainName(text.toUpperCase())}
                placeholder="Enter captain name"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>

            <View>
              <Text className="text-sm text-muted mb-2">Co-Pilot Name *</Text>
              <TextInput
                value={coPilotName}
                onChangeText={(text) => setCoPilotName(text.toUpperCase())}
                placeholder="Enter co-pilot name"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>

            <View>
              <Text className="text-sm text-muted mb-2">Mission/Duty</Text>
              <TextInput
                value={mission}
                onChangeText={(text) => setMission(text.toUpperCase())}
                placeholder="e.g., MTP CRS 1, training, operational"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Flight Details Section */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Flight Details</Text>

            <View>
              <Text className="text-sm text-muted mb-2">Flight Condition</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setCondition("day")}
                  className={`flex-1 py-3 rounded-lg border ${
                    condition === "day"
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      condition === "day" ? "text-background" : "text-foreground"
                    }`}
                  >
                    Day
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCondition("night")}
                  className={`flex-1 py-3 rounded-lg border ${
                    condition === "night"
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      condition === "night" ? "text-background" : "text-foreground"
                    }`}
                  >
                    Night
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-sm text-muted mb-2">NVG (Night Vision Goggles)</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setNvg(false)}
                  className={`flex-1 py-3 rounded-lg border ${
                    !nvg ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      !nvg ? "text-background" : "text-foreground"
                    }`}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNvg(true)}
                  className={`flex-1 py-3 rounded-lg border ${
                    nvg ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      nvg ? "text-background" : "text-foreground"
                    }`}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Position Selection */}
            <View>
              <Text className="text-sm text-muted mb-2">Position (Who is flying)</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setPosition("1st_plt")}
                  className={`flex-1 py-3 rounded-lg border ${
                    position === "1st_plt"
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      position === "1st_plt" ? "text-background" : "text-foreground"
                    }`}
                  >
                    1st PLT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPosition("2nd_plt")}
                  className={`flex-1 py-3 rounded-lg border ${
                    position === "2nd_plt"
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      position === "2nd_plt" ? "text-background" : "text-foreground"
                    }`}
                  >
                    2nd PLT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Count as Captain checkbox - only visible for 1st PLT */}
            {position === "1st_plt" && (
              <View>
                <TouchableOpacity
                  onPress={() => setCountsAsCaptain(!countsAsCaptain)}
                  className="flex-row items-center gap-3 py-2"
                >
                  <View
                    className={`w-6 h-6 rounded border-2 items-center justify-center ${
                      countsAsCaptain ? "bg-primary border-primary" : "bg-surface border-border"
                    }`}
                  >
                    {countsAsCaptain && (
                      <Text className="text-background font-bold text-sm">✓</Text>
                    )}
                  </View>
                  <Text className="text-foreground text-base font-semibold">
                    Count as Captain Hours (CAP)
                  </Text>
                </TouchableOpacity>
                <Text className="text-muted text-xs mt-1 ml-9">
                  Check this if you are qualified as captain on this aircraft type
                </Text>
              </View>
            )}

            <View>
              <Text className="text-sm text-muted mb-2">Flight Time (hours) *</Text>
              <TextInput
                value={flightTime}
                onChangeText={setFlightTime}
                placeholder="e.g., 1.5, 2.3"
                keyboardType="decimal-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-lg"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
            </View>

            {/* Dual Hours - Independent field */}
            <View>
              <Text className="text-sm text-muted mb-2">Dual Hours</Text>
              <TextInput
                value={dualHours}
                onChangeText={setDualHours}
                placeholder="e.g., 0.5, 1.0"
                keyboardType="decimal-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground text-lg"
                placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
              />
              <Text className="text-muted text-xs mt-1">
                Enter dual hours if applicable (added to total independently)
              </Text>
            </View>

            {/* Instrument Flight Section */}
            <View>
              <Text className="text-sm text-muted mb-2">Instrument Flight</Text>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => {
                    setInstrumentFlight(false);
                    setType("act");
                  }}
                  className={`flex-1 py-3 rounded-lg border ${
                    !instrumentFlight ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      !instrumentFlight ? "text-background" : "text-foreground"
                    }`}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setInstrumentFlight(true);
                    setType("sim");
                  }}
                  className={`flex-1 py-3 rounded-lg border ${
                    instrumentFlight ? "bg-primary border-primary" : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      instrumentFlight ? "text-background" : "text-foreground"
                    }`}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>

              {instrumentFlight && (
                <View className="gap-4 mt-2">
                  <View>
                    <Text className="text-sm text-muted mb-2">SIM Hours</Text>
                    <TextInput
                      value={simulationTime}
                      onChangeText={setSimulationTime}
                      placeholder="e.g., 1.0, 1.5"
                      keyboardType="decimal-pad"
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>

                  <View>
                    <Text className="text-sm text-muted mb-2">Actual Hours</Text>
                    <TextInput
                      value={actualHours}
                      onChangeText={setActualHours}
                      placeholder="e.g., 0.5, 1.0"
                      keyboardType="decimal-pad"
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>

                  <View>
                    <Text className="text-sm text-muted mb-2">ILS Approaches</Text>
                    <TextInput
                      value={ilsCount}
                      onChangeText={setIlsCount}
                      placeholder="Number of ILS approaches"
                      keyboardType="number-pad"
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>

                  <View>
                    <Text className="text-sm text-muted mb-2">VOR Approaches</Text>
                    <TextInput
                      value={vorCount}
                      onChangeText={setVorCount}
                      placeholder="Number of VOR approaches"
                      keyboardType="number-pad"
                      className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      placeholderTextColor="#9BA1A6"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>


          {/* Delete Button */}
          <TouchableOpacity
            onPress={async () => {
              Alert.alert(
                "Delete Flight",
                "Are you sure you want to delete this flight? This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      const wasIRTFlight = await deleteFlight(flight.id);
                      
                      if (Platform.OS !== "web") {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                      
                      router.back();
                      
                      // Show IRT alert if deleted flight was an IRT flight
                      if (wasIRTFlight) {
                        setTimeout(() => {
                          Alert.alert(
                            "IRT Flight Deleted",
                            "تم حذف رحلة IRT. يرجى تحديث تاريخ IRT Currency يدويًا في Settings.",
                            [{ text: "OK" }]
                          );
                        }, 500);
                      }
                    },
                  },
                ]
              );
            }}
            className="py-4 rounded-lg bg-error"
          >
            <Text className="text-center text-background font-bold text-lg">
              Delete Flight
            </Text>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`py-4 rounded-lg ${saving ? "bg-muted" : "bg-primary"}`}
          >
            <Text className="text-center text-background font-bold text-lg">
              {saving ? "Saving..." : "Update Flight"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
