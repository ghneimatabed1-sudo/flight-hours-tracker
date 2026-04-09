import { ScrollView, Text, View, ActivityIndicator } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useSettings } from "@/lib/settings-context";
import { useFlights } from "@/lib/flight-context";
import { useInitialHours } from "@/lib/initial-hours-context";
import { calculateAllCurrencyStatuses, type CurrencyStatus } from "@/lib/currency-calculator";
import { rescheduleAllNotifications } from "@/lib/notifications";
import { useEffect, useMemo } from "react";
import type { CurrencyType } from "@/types/currency";

export default function HomeScreen() {
  const { settings, loading: settingsLoading } = useSettings();
  const { flights, loading: flightsLoading } = useFlights();
  const { initialHours } = useInitialHours();

  const loading = settingsLoading || flightsLoading;

  // Calculate currency statuses from actual flight data
  // Use useMemo to avoid recalculating on every render
  const currencyStatuses = useMemo(() => {
    if (loading) return [];
    return calculateAllCurrencyStatuses(settings.currencies, flights, settings.dayCurrencyRefreshMode, initialHours);
  }, [settings.currencies, flights, settings.dayCurrencyRefreshMode, initialHours, loading]);

  // Reschedule notifications when currency status or settings change
  // MUST be before any early returns (Rules of Hooks)
  useEffect(() => {
    if (loading || currencyStatuses.length === 0) return;

    const reminderDaysMap: Record<CurrencyType, number> = {
      day: 0,
      night: 0,
      nvg: 0,
      medical: 0,
      irt: 0,
    };
    settings.currencies.forEach((currency) => {
      reminderDaysMap[currency.type] = currency.reminderDays;
    });

    // Convert array to record using type names (not positions)
    const statusMap: Record<CurrencyType, CurrencyStatus> = {};
    currencyStatuses.forEach((status) => {
      statusMap[status.type as CurrencyType] = status;
    });

    rescheduleAllNotifications(statusMap);
  }, [currencyStatuses, settings.currencies, loading]);

  // Early return AFTER all Hooks
  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALID":
        return "text-success";
      case "EXPIRING SOON":
        return "text-warning";
      case "EXPIRED":
        return "text-error";
      default:
        return "text-muted";
    }
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Flight Name Header */}
          {settings.flightName && (
            <View className="items-center py-4 border-b border-border">
              <Text className="text-2xl font-bold text-primary">
                {settings.flightName}
              </Text>
            </View>
          )}

          {/* Page Title */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Currency Status</Text>
            <Text className="text-base text-muted mt-1">
              Track your flight currency requirements
            </Text>
          </View>

          {/* Currency Cards */}
          <View className="gap-4">
            {currencyStatuses.map((currency) => (
              <View
                key={currency.type}
                className="bg-surface rounded-2xl p-5 border border-border"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-lg font-semibold text-foreground">
                    {currency.name}
                  </Text>
                  <Text className={`text-sm font-bold ${getStatusColor(currency.status)}`}>
                    {currency.status}
                  </Text>
                </View>

                <View className="flex-row justify-between items-baseline">
                  <Text className="text-sm text-muted">Days Remaining</Text>
                  <Text
                    className={`text-3xl font-bold ${
                      currency.daysRemaining < 0
                        ? "text-error"
                        : currency.daysRemaining < 30
                        ? "text-warning"
                        : "text-success"
                    }`}
                  >
                    {currency.daysRemaining < 0
                      ? Math.abs(currency.daysRemaining)
                      : currency.daysRemaining}
                  </Text>
                </View>

                {currency.daysRemaining < 0 && (
                  <Text className="text-xs text-error mt-2">
                    Expired {Math.abs(currency.daysRemaining)} days ago
                  </Text>
                )}

                {currency.testDate && (
                  <Text className="text-xs text-muted mt-2">
                    Test date: {new Date(currency.testDate).toLocaleDateString()}
                  </Text>
                )}

                {currency.lastFlightDate && (
                  <Text className="text-xs text-muted mt-2">
                    Last flight: {new Date(currency.lastFlightDate).toLocaleDateString()}
                  </Text>
                )}

                {currency.expirationDate && (
                  <Text className="text-xs text-muted mt-1">
                    Expiry date: {new Date(currency.expirationDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
