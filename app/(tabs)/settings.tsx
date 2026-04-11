import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Switch,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "@/hooks/use-colors";

import { ScreenContainer } from "@/components/screen-container";
import { useSettings } from "@/lib/settings-context";
import { useFlights } from "@/lib/flight-context";
import { useInitialHours } from "@/lib/initial-hours-context";
import type { Currency } from "@/types/currency";
import { checkLicenseStatus, clearLicense, saveLicense } from "@/lib/license-manager";
import { verifyLicenseKey, isLicenseExpired } from "@/lib/license-crypto";

export default function SettingsScreen() {
  const router = useRouter();
  const { setColorScheme } = useThemeContext();
  const colors = useColors();
  const { settings, loading, updateFlightName, updateCurrencies, updateTheme, updateDayCurrencyRefreshMode } = useSettings();
  const { integrityReport } = useFlights();
  const { initialHours, updateInitialHours } = useInitialHours();
  const [flightName, setFlightName] = useState("");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<"default" | "dark">("default");
  const [selectedDayMode, setSelectedDayMode] = useState<"day_flight_only" | "duration_half_hour">("day_flight_only");
  const [saving, setSaving] = useState(false);
  const [editingInitialHours, setEditingInitialHours] = useState(false);
  const [tempInitialHours, setTempInitialHours] = useState(initialHours);
  const [dayDateRaw, setDayDateRaw] = useState("");
  const [nightDateRaw, setNightDateRaw] = useState("");
  const [nvgDateRaw, setNvgDateRaw] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<{
    valid: boolean;
    expired: boolean;
    expiringSoon: boolean;
    daysRemaining: number;
    username?: string;
    expirationDate?: string;
  } | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState("");
  const [renewingLicense, setRenewingLicense] = useState(false);

  useEffect(() => {
    setFlightName(settings.flightName);
    setCurrencies(settings.currencies);
    setSelectedTheme(settings.theme);
    setSelectedDayMode(settings.dayCurrencyRefreshMode);
    // Apply the saved theme
    setColorScheme(settings.theme === "dark" ? "dark" : "light");
  }, [settings, setColorScheme]);

  useEffect(() => {
    setTempInitialHours(initialHours);
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    };
    setDayDateRaw(initialHours.lastDayFlyingDate ? fmt(initialHours.lastDayFlyingDate) : "");
    setNightDateRaw(initialHours.lastNightFlyingDate ? fmt(initialHours.lastNightFlyingDate) : "");
    setNvgDateRaw(initialHours.lastNVGFlyingDate ? fmt(initialHours.lastNVGFlyingDate) : "");
  }, [initialHours]);

  useEffect(() => {
    const fetchLicenseStatus = async () => {
      const status = await checkLicenseStatus();
      setLicenseStatus({
        valid: status.valid,
        expired: status.expired,
        expiringSoon: status.expiringSoon,
        daysRemaining: status.daysRemaining,
        username: status.data?.username,
        expirationDate: status.data?.expirationDate,
      });
    };
    fetchLicenseStatus();
  }, []);

  const handleSaveFlightName = async () => {
    setSaving(true);
    try {
      await updateFlightName(flightName);
      Alert.alert("Success", "Flight name updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update flight name");
    } finally {
      setSaving(false);
    }
  };

  // Debounce timer ref — auto-saves 600ms after the user stops typing
  const currencyAutoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdateCurrency = useCallback((index: number, field: "validityDays" | "reminderDays", value: string) => {
    const newCurrencies = [...currencies];
    const numValue = parseInt(value) || 0;
    newCurrencies[index] = {
      ...newCurrencies[index],
      [field]: numValue,
    };
    setCurrencies(newCurrencies);
    // Auto-save after 600ms of inactivity so every keystroke doesn't spam storage
    if (currencyAutoSaveTimer.current) clearTimeout(currencyAutoSaveTimer.current);
    currencyAutoSaveTimer.current = setTimeout(async () => {
      try {
        await updateCurrencies(newCurrencies);
      } catch (error) {
        console.error("Failed to auto-save currency settings:", error);
      }
    }, 600);
  }, [currencies, updateCurrencies]);

  const handleToggleCurrencyVisibility = async (index: number) => {
    const newCurrencies = [...currencies];
    newCurrencies[index] = {
      ...newCurrencies[index],
      hidden: !newCurrencies[index].hidden,
    };
    setCurrencies(newCurrencies);
    // Auto-save immediately so the change persists without requiring "Save" button
    try {
      await updateCurrencies(newCurrencies);
    } catch (error) {
      console.error("Failed to save currency visibility:", error);
    }
  };

  const handleUpdateTestDate = (index: number, date: Date) => {
    const newCurrencies = [...currencies];
    newCurrencies[index] = {
      ...newCurrencies[index],
      testDate: date.toISOString(),
    };
    setCurrencies(newCurrencies);
  };

  const [dateInputs, setDateInputs] = useState<{[key: number]: string}>({});
  const [dateErrors, setDateErrors] = useState<{[key: number]: string}>({});

  // Format date input as DD/MM/YYYY
  const formatDateInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");
    
    // Add slashes at appropriate positions
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  // Validate date format and value
  const validateDate = (dateStr: string): { valid: boolean; error?: string; date?: Date } => {
    // Check format
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(dateRegex);
    
    if (!match) {
      return { valid: false, error: "Invalid format. Use DD/MM/YYYY" };
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validate ranges
    if (day < 1 || day > 31) {
      return { valid: false, error: "Day must be between 1 and 31" };
    }
    if (month < 1 || month > 12) {
      return { valid: false, error: "Month must be between 1 and 12" };
    }
    if (year < 1900 || year > 2100) {
      return { valid: false, error: "Year must be between 1900 and 2100" };
    }

    // Create date object (month is 0-indexed in JS)
    const date = new Date(year, month - 1, day);
    
    // Check if date is valid (handles leap years and month lengths)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return { valid: false, error: "Invalid date. Check day/month/year." };
    }

    return { valid: true, date };
  };

  const handleDateInputChange = (index: number, value: string) => {
    const formatted = formatDateInput(value);
    setDateInputs(prev => ({ ...prev, [index]: formatted }));
    // Clear error when user starts typing
    if (dateErrors[index]) {
      setDateErrors(prev => ({ ...prev, [index]: "" }));
    }
  };

  const handleDateInputBlur = (index: number) => {
    const input = dateInputs[index];
    if (!input) {
      setDateErrors(prev => ({ ...prev, [index]: "" }));
      return;
    }

    const validation = validateDate(input);
    if (!validation.valid) {
      setDateErrors(prev => ({ ...prev, [index]: validation.error || "Invalid date" }));
    } else if (validation.date) {
      // Valid date - update currency
      handleUpdateTestDate(index, validation.date);
      setDateErrors(prev => ({ ...prev, [index]: "" }));
    }
  };

  // Initialize date inputs from currency test dates
  useEffect(() => {
    const newDateInputs: {[key: number]: string} = {};
    currencies.forEach((currency, index) => {
      if (currency.testDate) {
        const date = new Date(currency.testDate);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        newDateInputs[index] = `${day}/${month}/${year}`;
      }
    });
    setDateInputs(newDateInputs);
  }, [currencies]);

  const handleSaveTheme = async (theme: "default" | "dark") => {
    setSaving(true);
    try {
      await updateTheme(theme);
      setSelectedTheme(theme);
      // Apply theme immediately
      setColorScheme(theme === "dark" ? "dark" : "light");
      Alert.alert("Success", "Theme updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update theme");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDayCurrencyMode = async (mode: "day_flight_only" | "duration_half_hour") => {
    setSaving(true);
    try {
      await updateDayCurrencyRefreshMode(mode);
      setSelectedDayMode(mode);
      Alert.alert("Success", "Day Currency refresh mode updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update Day Currency mode");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInitialHours = async () => {
    setSaving(true);
    try {
      await updateInitialHours(tempInitialHours);
      setEditingInitialHours(false);
      Alert.alert("Saved", "Initial hours updated successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to save initial hours.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelInitialHours = () => {
    setTempInitialHours(initialHours);
    setDayDateRaw(initialHours.lastDayFlyingDate ? (() => { const d = new Date(initialHours.lastDayFlyingDate!); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; })() : "");
    setNightDateRaw(initialHours.lastNightFlyingDate ? (() => { const d = new Date(initialHours.lastNightFlyingDate!); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; })() : "");
    setEditingInitialHours(false);
  };

  const handleUpdateInitialHour = (field: keyof typeof initialHours, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTempInitialHours(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSaveCurrencies = async () => {
    setSaving(true);
    try {
      await updateCurrencies(currencies);
      Alert.alert("Success", "Currency settings updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update currency settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRenewLicense = async () => {
    if (!newLicenseKey.trim()) {
      Alert.alert("Error", "Please enter a license key");
      return;
    }

    setRenewingLicense(true);

    try {
      // Verify the new license key
      const licenseData = verifyLicenseKey(newLicenseKey.trim());

      if (!licenseData) {
        Alert.alert(
          "Invalid License Key",
          "The license key you entered is invalid. Please check and try again."
        );
        setRenewingLicense(false);
        return;
      }

      // Check if expired
      if (isLicenseExpired(licenseData)) {
        Alert.alert(
          "License Expired",
          `This license key expired on ${new Date(licenseData.expirationDate).toLocaleDateString()}.`
        );
        setRenewingLicense(false);
        return;
      }

      // Save the new license
      await saveLicense(newLicenseKey.trim(), licenseData);

      // Refresh license status
      const status = await checkLicenseStatus();
      setLicenseStatus({
        valid: status.valid,
        expired: status.expired,
        expiringSoon: status.expiringSoon,
        daysRemaining: status.daysRemaining,
        username: status.data?.username,
        expirationDate: status.data?.expirationDate,
      });

      // Show success message
      Alert.alert(
        "License Renewed",
        `Your license has been successfully renewed!\n\nNew expiration date: ${new Date(licenseData.expirationDate).toLocaleDateString()}`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowRenewModal(false);
              setNewLicenseKey("");
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to renew license. Please try again.");
      console.error("License renewal error:", error);
    } finally {
      setRenewingLicense(false);
    }
  };

  const getCurrencyLabel = (type: string) => {
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
  };

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
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Settings</Text>
            <Text className="text-base text-muted mt-1">Configure your flight tracker</Text>
          </View>

          {/* Pilot Name Section */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-4">
              Pilot Name
            </Text>
            <Text className="text-sm text-muted mb-3">
              Your name will be displayed at the top of all screens. All characters will be
              automatically converted to UPPERCASE.
            </Text>
            <TextInput
              value={flightName}
              onChangeText={(text) => setFlightName(text.toUpperCase())}
              placeholder="Enter pilot name (e.g., CAPT. SMITH)"
              className="bg-background border border-border rounded-lg px-4 py-3 text-foreground text-lg font-bold mb-4"
              placeholderTextColor={colors.muted}
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              onPress={handleSaveFlightName}
              disabled={saving}
              className={`rounded-full py-3 items-center ${
                saving ? "bg-muted" : "bg-primary"
              }`}
            >
              <Text className="text-background font-bold">
                {saving ? "Saving..." : "Save Pilot Name"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* License Information Section */}
          {licenseStatus && (
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-lg font-semibold text-foreground mb-4">
                📜 License Information
              </Text>
              
              <View className="gap-3">
                {/* License Status */}
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-muted">Status</Text>
                  <View className={`px-3 py-1 rounded-full ${
                    licenseStatus.expired
                      ? "bg-error/20"
                      : licenseStatus.expiringSoon
                      ? "bg-warning/20"
                      : "bg-success/20"
                  }`}>
                    <Text className={`text-xs font-semibold ${
                      licenseStatus.expired
                        ? "text-error"
                        : licenseStatus.expiringSoon
                        ? "text-warning"
                        : "text-success"
                    }`}>
                      {licenseStatus.expired
                        ? "EXPIRED"
                        : licenseStatus.expiringSoon
                        ? "EXPIRING SOON"
                        : "ACTIVE"}
                    </Text>
                  </View>
                </View>

                {/* Username */}
                {licenseStatus.username && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-muted">Licensed To</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {licenseStatus.username}
                    </Text>
                  </View>
                )}

                {/* Expiration Date */}
                {licenseStatus.expirationDate && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-muted">Expires On</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {new Date(licenseStatus.expirationDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {/* Days Remaining */}
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-muted">Days Remaining</Text>
                  <Text className={`text-sm font-semibold ${
                    licenseStatus.daysRemaining <= 0
                      ? "text-error"
                      : licenseStatus.daysRemaining <= 5
                      ? "text-warning"
                      : "text-foreground"
                  }`}>
                    {licenseStatus.daysRemaining <= 0
                      ? "Expired"
                      : `${licenseStatus.daysRemaining} days`}
                  </Text>
                </View>
              </View>

              {/* Warning for expiring/expired license */}
              {(licenseStatus.expired || licenseStatus.expiringSoon) && (
                <View className={`mt-4 p-3 rounded-xl border ${
                  licenseStatus.expired
                    ? "bg-error/10 border-error/30"
                    : "bg-warning/10 border-warning/30"
                }`}>
                  <Text className={`text-xs font-semibold mb-1 ${
                    licenseStatus.expired ? "text-error" : "text-warning"
                  }`}>
                    {licenseStatus.expired ? "⚠️ License Expired" : "⏰ License Expiring Soon"}
                  </Text>
                  <Text className="text-xs text-muted">
                    {licenseStatus.expired
                      ? "Your license has expired. Please use the Renew License button below."
                      : `Your license will expire in ${licenseStatus.daysRemaining} days. Please renew soon.`}
                  </Text>
                </View>
              )}

              {/* Renew License Button */}
              <TouchableOpacity
                onPress={() => setShowRenewModal(true)}
                className="mt-4 bg-primary px-6 py-3 rounded-full active:opacity-80"
              >
                <Text className="text-background font-semibold text-center">
                  🔄 Renew License
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Data Integrity Section */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-4">
              Data Integrity
            </Text>
            <Text className="text-sm text-muted mb-4">
              Check and repair your flight data for corruption or validation errors.
            </Text>
            
            {integrityReport && (
              <View className="mb-4 p-3 rounded-xl bg-background border border-border">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-muted">Status</Text>
                  <Text className={`text-sm font-semibold ${integrityReport.valid ? "text-success" : "text-error"}`}>
                    {integrityReport.valid ? "✓ Valid" : "⚠ Issues Found"}
                  </Text>
                </View>
                {!integrityReport.valid && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Errors</Text>
                    <Text className="text-sm font-semibold text-error">
                      {integrityReport.errors.length}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.push("/data-integrity")}
              className="bg-primary rounded-full py-3 items-center"
            >
              <Text className="text-background font-bold">View Data Integrity</Text>
            </TouchableOpacity>
          </View>

          {/* Theme Settings Section */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-4">
              Theme Selection
            </Text>
            <Text className="text-sm text-muted mb-4">
              Choose your preferred theme. The selected theme will be applied across the entire app.
            </Text>

            <View className="gap-3">
              <TouchableOpacity
                onPress={() => handleSaveTheme("default")}
                disabled={saving}
                className={`rounded-xl p-4 border-2 ${
                  selectedTheme === "default"
                    ? "border-primary bg-primary bg-opacity-10"
                    : "border-border bg-background"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-semibold text-foreground">Default Theme</Text>
                    <Text className="text-sm text-muted mt-1">Military camouflage colors</Text>
                  </View>
                  {selectedTheme === "default" && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                      <Text className="text-background font-bold">✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSaveTheme("dark")}
                disabled={saving}
                className={`rounded-xl p-4 border-2 ${
                  selectedTheme === "dark"
                    ? "border-primary bg-primary bg-opacity-10"
                    : "border-border bg-background"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-semibold text-foreground">Dark Theme</Text>
                    <Text className="text-sm text-muted mt-1">Dark mode for low-light conditions</Text>
                  </View>
                  {selectedTheme === "dark" && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                      <Text className="text-background font-bold">✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Day Currency Refresh Mode Section */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-2">
              Day Currency Refresh
            </Text>
            <Text className="text-sm text-muted mb-4">
              Choose how Day Currency is refreshed when logging flights.
            </Text>

            <View className="gap-3">
              <TouchableOpacity
                onPress={() => handleSaveDayCurrencyMode("day_flight_only")}
                disabled={saving}
                className={`rounded-xl p-4 border-2 ${
                  selectedDayMode === "day_flight_only"
                    ? "border-primary bg-primary bg-opacity-10"
                    : "border-border bg-background"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">Day Flight Only</Text>
                    <Text className="text-sm text-muted mt-1">Only flights marked as DAY refresh Day Currency</Text>
                  </View>
                  {selectedDayMode === "day_flight_only" && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center ml-3">
                      <Text className="text-background font-bold">✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSaveDayCurrencyMode("duration_half_hour")}
                disabled={saving}
                className={`rounded-xl p-4 border-2 ${
                  selectedDayMode === "duration_half_hour"
                    ? "border-primary bg-primary bg-opacity-10"
                    : "border-border bg-background"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">Duration ≥ 0.5 Hours</Text>
                    <Text className="text-sm text-muted mt-1">Any flight of 0.5 hours or more refreshes Day Currency</Text>
                  </View>
                  {selectedDayMode === "duration_half_hour" && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center ml-3">
                      <Text className="text-background font-bold">✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Currency Settings Section */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-4">
              Currency Configuration
            </Text>
            <Text className="text-sm text-muted mb-4">
              Configure validity periods and reminder days for each currency type.
            </Text>

            {currencies.map((currency, index) => {
              const isDateBased = currency.type === "medical" || currency.type === "irt";
              return (
                <View key={currency.type} className="mb-5 pb-5 border-b border-border last:border-b-0">
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-base font-semibold text-foreground">
                      {getCurrencyLabel(currency.type)}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-muted">
                        {currency.hidden ? "Hidden" : "Visible"}
                      </Text>
                      <Switch
                        value={!currency.hidden}
                        onValueChange={() => handleToggleCurrencyVisibility(index)}
                        trackColor={{ false: colors.muted, true: colors.primary }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>

                  <View className="gap-3">
                    {isDateBased ? (
                      <>
                        {/* Date-based currency (Medical, IRT) */}
                        <View>
                          <Text className="text-sm text-muted mb-2">
                            {currency.type === "medical" ? "Medical Test Date" : "IRT Test Date"}
                          </Text>
                          <TextInput
                            value={dateInputs[index] || ""}
                            onChangeText={(value) => handleDateInputChange(index, value)}
                            onBlur={() => handleDateInputBlur(index)}
                            placeholder="DD/MM/YYYY"
                            keyboardType="number-pad"
                            maxLength={10}
                            className={`bg-background border rounded-lg px-4 py-3 text-foreground ${
                              dateErrors[index] ? "border-error" : "border-border"
                            }`}
                            placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="none"
                          />
                          {dateErrors[index] ? (
                            <Text className="text-xs text-error mt-1">
                              ⚠️ {dateErrors[index]}
                            </Text>
                          ) : (
                            <Text className="text-xs text-muted mt-1">
                              Format: DD/MM/YYYY (e.g., 15/01/2025)
                            </Text>
                          )}
                          <Text className="text-xs text-muted mt-1">
                            Fixed 1-year validity (365 days) from test date
                          </Text>
                        </View>

                        {/* Reminder Days for date-based currencies */}
                        <View>
                          <Text className="text-sm text-muted mb-2">Reminder Days (before expiration)</Text>
                          <TextInput
                            value={currency.reminderDays.toString()}
                            onChangeText={(value) => handleUpdateCurrency(index, "reminderDays", value)}
                            placeholder="e.g., 30"
                            keyboardType="number-pad"
                            className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                            placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                          />
                          <Text className="text-xs text-muted mt-1">
                            Default: 30 days. Status shows &quot;EXPIRING SOON&quot; when within this window.
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        {/* Flight-based currency (Day, Night, NVG) */}
                        <View>
                          <Text className="text-sm text-muted mb-2">Validity Duration (days)</Text>
                          <TextInput
                            value={currency.validityDays.toString()}
                            onChangeText={(value) => handleUpdateCurrency(index, "validityDays", value)}
                            placeholder="e.g., 30"
                            keyboardType="number-pad"
                            className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                            placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                          />
                        </View>

                        <View>
                          <Text className="text-sm text-muted mb-2">Reminder Days (before expiration)</Text>
                          <TextInput
                            value={currency.reminderDays.toString()}
                            onChangeText={(value) => handleUpdateCurrency(index, "reminderDays", value)}
                            placeholder="e.g., 7"
                            keyboardType="number-pad"
                            className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                            placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                          />
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={handleSaveCurrencies}
              disabled={saving}
              className={`rounded-full py-3 items-center mt-2 ${
                saving ? "bg-muted" : "bg-primary"
              }`}
            >
              <Text className="text-background font-bold">
                {saving ? "Saving..." : "Save Currency Settings"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Initial Hours Section */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-3">
              INITIAL HOURS
            </Text>
            <Text className="text-sm text-muted mb-4">
              Enter baseline flight hours accumulated before using this app. These values add to totals but do NOT affect currency or expiration calculations.
            </Text>

            {!editingInitialHours ? (
              <>
                <View className="space-y-2">
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Total Flight Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.totalHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Day Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.dayHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Night Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.nightHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">NVG Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.nvgHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Instrument Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.instrumentHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">CAP (Captain Hours):</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.captainHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">1st PLT Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.captainHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">2nd PLT Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.copilotHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Dual Day Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.dualDayHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Dual Night Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.dualNightHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Dual NVG Hours:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.dualNVGHours.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Day 1st PLT:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.day1stPlt.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Day 2nd PLT:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.day2ndPlt.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Night 1st PLT:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.night1stPlt.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">Night 2nd PLT:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.night2ndPlt.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">NVG 1st PLT:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.nvg1stPlt.toFixed(1)}</Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">NVG 2nd PLT:</Text>
                    <Text className="text-sm font-semibold text-foreground">{initialHours.nvg2ndPlt.toFixed(1)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  className="bg-primary py-3 rounded-lg mt-4"
                  onPress={() => setEditingInitialHours(true)}
                >
                  <Text className="text-background text-center font-semibold">Edit Initial Hours</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View className="space-y-3">
                  <View>
                    <Text className="text-sm text-muted mb-1">Total Flight Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.totalHours)}
                      onChangeText={(value) => handleUpdateInitialHour("totalHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Day Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.dayHours)}
                      onChangeText={(value) => handleUpdateInitialHour("dayHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Night Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.nightHours)}
                      onChangeText={(value) => handleUpdateInitialHour("nightHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">NVG Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.nvgHours)}
                      onChangeText={(value) => handleUpdateInitialHour("nvgHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Instrument Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.instrumentHours)}
                      onChangeText={(value) => handleUpdateInitialHour("instrumentHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">CAP (Captain Hours)</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.captainHours)}
                      onChangeText={(value) => handleUpdateInitialHour("captainHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">1st PLT Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.captainHours)}
                      onChangeText={(value) => handleUpdateInitialHour("captainHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">2nd PLT Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.copilotHours)}
                      onChangeText={(value) => handleUpdateInitialHour("copilotHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Dual Day Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.dualDayHours)}
                      onChangeText={(value) => handleUpdateInitialHour("dualDayHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Dual Night Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.dualNightHours)}
                      onChangeText={(value) => handleUpdateInitialHour("dualNightHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Dual NVG Hours</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.dualNVGHours)}
                      onChangeText={(value) => handleUpdateInitialHour("dualNVGHours", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Day 1st PLT</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.day1stPlt)}
                      onChangeText={(value) => handleUpdateInitialHour("day1stPlt", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Day 2nd PLT</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.day2ndPlt)}
                      onChangeText={(value) => handleUpdateInitialHour("day2ndPlt", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Night 1st PLT</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.night1stPlt)}
                      onChangeText={(value) => handleUpdateInitialHour("night1stPlt", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">Night 2nd PLT</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.night2ndPlt)}
                      onChangeText={(value) => handleUpdateInitialHour("night2ndPlt", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">NVG 1st PLT</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.nvg1stPlt)}
                      onChangeText={(value) => handleUpdateInitialHour("nvg1stPlt", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>
                  <View>
                    <Text className="text-sm text-muted mb-1">NVG 2nd PLT</Text>
                    <TextInput
                      className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                      value={String(tempInitialHours.nvg2ndPlt)}
                      onChangeText={(value) => handleUpdateInitialHour("nvg2ndPlt", value)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={colors.muted}
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="characters"
                    />
                  </View>

                  {/* Currency Baseline Dates */}
                  <View className="border-t border-border pt-4 mt-4">
                    <Text className="text-base font-semibold text-foreground mb-3">Currency Baseline Dates</Text>

                    {/* Last Day Flying Date */}
                    <View>
                      <Text className="text-sm text-muted mb-1">When was your last day flying? (DD/MM/YYYY)</Text>
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        value={dayDateRaw}
                        onChangeText={(text) => {
                          const digits = text.replace(/\D/g, "").slice(0, 8);
                          if (digits.length >= 2 && parseInt(digits.slice(0,2), 10) > 31) return;
                          if (digits.length >= 4 && parseInt(digits.slice(2,4), 10) > 12) return;
                          let formatted = digits;
                          if (digits.length > 4) formatted = digits.slice(0,2) + "/" + digits.slice(2,4) + "/" + digits.slice(4);
                          else if (digits.length > 2) formatted = digits.slice(0,2) + "/" + digits.slice(2);
                          setDayDateRaw(formatted);
                          if (digits.length === 0) {
                            setTempInitialHours(prev => ({ ...prev, lastDayFlyingDate: undefined }));
                          } else if (digits.length === 8) {
                            const d = parseInt(digits.slice(0,2), 10);
                            const m = parseInt(digits.slice(2,4), 10);
                            const y = parseInt(digits.slice(4,8), 10);
                            if (d >= 1 && m >= 1 && m <= 12 && y > 1900) {
                              const parsed = new Date(y, m-1, d);
                              if (parsed.getDate() !== d || parsed.getMonth() !== m-1) return;
                              setTempInitialHours(prev => ({ ...prev, lastDayFlyingDate: parsed.toISOString().split("T")[0] }));
                            }
                          }
                        }}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={colors.muted}
                        keyboardType="number-pad"
                      />
                    </View>

                    {/* Last Night Flying Date */}
                    <View className="mt-3">
                      <Text className="text-sm text-muted mb-1">When was your last NIGHT flying? (DD/MM/YYYY)</Text>
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        value={nightDateRaw}
                        onChangeText={(text) => {
                          const digits = text.replace(/\D/g, "").slice(0, 8);
                          if (digits.length >= 2 && parseInt(digits.slice(0,2), 10) > 31) return;
                          if (digits.length >= 4 && parseInt(digits.slice(2,4), 10) > 12) return;
                          let formatted = digits;
                          if (digits.length > 4) formatted = digits.slice(0,2) + "/" + digits.slice(2,4) + "/" + digits.slice(4);
                          else if (digits.length > 2) formatted = digits.slice(0,2) + "/" + digits.slice(2);
                          setNightDateRaw(formatted);
                          if (digits.length === 0) {
                            setTempInitialHours(prev => ({ ...prev, lastNightFlyingDate: undefined }));
                          } else if (digits.length === 8) {
                            const d = parseInt(digits.slice(0,2), 10);
                            const m = parseInt(digits.slice(2,4), 10);
                            const y = parseInt(digits.slice(4,8), 10);
                            if (d >= 1 && m >= 1 && m <= 12 && y > 1900) {
                              const parsed = new Date(y, m-1, d);
                              if (parsed.getDate() !== d || parsed.getMonth() !== m-1) return;
                              setTempInitialHours(prev => ({ ...prev, lastNightFlyingDate: parsed.toISOString().split("T")[0] }));
                            }
                          }
                        }}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={colors.muted}
                        keyboardType="number-pad"
                      />
                    </View>

                    {/* Last NVG Flying Date */}
                    <View className="mt-3">
                      <Text className="text-sm text-muted mb-1">When was your last NVG flying? (DD/MM/YYYY)</Text>
                      <TextInput
                        className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        value={nvgDateRaw}
                        onChangeText={(text) => {
                          const digits = text.replace(/\D/g, "").slice(0, 8);
                          if (digits.length >= 2 && parseInt(digits.slice(0,2), 10) > 31) return;
                          if (digits.length >= 4 && parseInt(digits.slice(2,4), 10) > 12) return;
                          let formatted = digits;
                          if (digits.length > 4) formatted = digits.slice(0,2) + "/" + digits.slice(2,4) + "/" + digits.slice(4);
                          else if (digits.length > 2) formatted = digits.slice(0,2) + "/" + digits.slice(2);
                          setNvgDateRaw(formatted);
                          if (digits.length === 0) {
                            setTempInitialHours(prev => ({ ...prev, lastNVGFlyingDate: undefined }));
                          } else if (digits.length === 8) {
                            const d = parseInt(digits.slice(0,2), 10);
                            const m = parseInt(digits.slice(2,4), 10);
                            const y = parseInt(digits.slice(4,8), 10);
                            if (d >= 1 && m >= 1 && m <= 12 && y > 1900) {
                              const parsed = new Date(y, m-1, d);
                              if (parsed.getDate() !== d || parsed.getMonth() !== m-1) return;
                              setTempInitialHours(prev => ({ ...prev, lastNVGFlyingDate: parsed.toISOString().split("T")[0] }));
                            }
                          }
                        }}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={colors.muted}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                </View>

                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    className="flex-1 bg-error py-3 rounded-lg"
                    onPress={handleCancelInitialHours}
                  >
                    <Text className="text-background text-center font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary py-3 rounded-lg"
                    onPress={handleSaveInitialHours}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text className="text-background text-center font-semibold">Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Credits Section */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-3 text-center">
              App Credits
            </Text>
            <Text className="text-sm text-foreground text-center">
              Programmed and designed by
            </Text>
            <Text className="text-base font-bold text-primary text-center mt-2">
              CAPT. ABEDALQADER GHUNMAT
            </Text>
            <Text className="text-xs text-muted text-center mt-2">
              Final version – specifications locked
            </Text>
          </View>

          {/* App Info */}
          <View className="items-center mt-4">
            <Text className="text-sm text-muted">Flight Hours Tracker v1.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Renew License Modal */}
      <Modal
        visible={showRenewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenewModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-foreground/50 p-6">
          <View className="bg-background rounded-2xl p-6 w-full max-w-md border border-border">
            <Text className="text-xl font-bold text-foreground mb-4 text-center">
              🔄 Renew License
            </Text>

            <Text className="text-sm text-muted mb-4">
              Enter your new license key to renew or extend your license.
            </Text>

            <TextInput
              value={newLicenseKey}
              onChangeText={setNewLicenseKey}
              placeholder="Enter license key"
              placeholderTextColor={colors.muted}
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
              multiline
              numberOfLines={3}
              className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground mb-4"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowRenewModal(false);
                  setNewLicenseKey("");
                }}
                disabled={renewingLicense}
                className="flex-1 bg-surface px-6 py-3 rounded-full active:opacity-80 border border-border"
              >
                <Text className="text-foreground font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRenewLicense}
                disabled={renewingLicense || !newLicenseKey.trim()}
                className={`flex-1 px-6 py-3 rounded-full ${
                  renewingLicense || !newLicenseKey.trim()
                    ? "bg-primary/50"
                    : "bg-primary active:opacity-80"
                }`}
              >
                <Text className="text-background font-semibold text-center">
                  {renewingLicense ? "Renewing..." : "Renew"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
