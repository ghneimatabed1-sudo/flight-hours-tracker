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

  const getStatusBg = (status: string) => {
    switch (status) {
      case "VALID":      return "bg-success";
      case "EXPIRING SOON": return "bg-warning";
      case "EXPIRED":    return "bg-error";
      default:           return "bg-muted";
    }
  };

  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  // Currencies expiring within 7 days (but not already expired)
  const urgentWarnings = currencyStatuses.filter(
    (c) => c.daysRemaining >= 0 && c.daysRemaining <= 7
  );

  // Expired currencies
  const expiredCurrencies = currencyStatuses.filter((c) => c.daysRemaining < 0);

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

          {/* ⚠️ Smart Warning Banner — expired */}
          {expiredCurrencies.length > 0 && (
            <View className="bg-error/10 border border-error rounded-2xl p-4 gap-1">
              <Text className="text-error font-bold text-base">
                ⛔ {expiredCurrencies.length === 1 ? "1 currency expired" : `${expiredCurrencies.length} currencies expired`}
              </Text>
              {expiredCurrencies.map((c) => (
                <Text key={c.type} className="text-error text-sm">
                  • {c.name} — expired {Math.abs(c.daysRemaining)} day{Math.abs(c.daysRemaining) !== 1 ? "s" : ""} ago
                </Text>
              ))}
              <Text className="text-error/70 text-xs mt-1">
                You are not current. Log a qualifying flight to restore currency.
              </Text>
            </View>
          )}

          {/* ⚠️ Smart Warning Banner — expiring soon */}
          {urgentWarnings.length > 0 && (
            <View className="bg-warning/10 border border-warning rounded-2xl p-4 gap-1">
              <Text className="text-warning font-bold text-base">
                ⚠️ {urgentWarnings.length === 1 ? "1 currency expiring soon" : `${urgentWarnings.length} currencies expiring soon`}
              </Text>
              {urgentWarnings.map((c) => (
                <Text key={c.type} className="text-warning text-sm">
                  • {c.name} — {c.daysRemaining === 0 ? "expires today" : `${c.daysRemaining} day${c.daysRemaining !== 1 ? "s" : ""} left`}
                </Text>
              ))}
              <Text className="text-warning/70 text-xs mt-1">
                Log a qualifying flight before your currency lapses.
              </Text>
            </View>
          )}

          {/* Currency Cards */}
          <View className="gap-4">
            {currencyStatuses.map((currency) => (
              <View
                key={currency.type}
                className="bg-surface rounded-2xl p-5 border border-border"
              >
                {/* Header row: name + status badge */}
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-semibold text-foreground">
                    {currency.name}
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${getStatusBg(currency.status)}`}>
                    <Text className="text-background text-xs font-bold">
                      {currency.status}
                    </Text>
                  </View>
                </View>

                {/* Days remaining */}
                <View className="flex-row justify-between items-baseline mb-3">
                  <Text className="text-sm text-muted">Days Remaining</Text>
                  <Text
                    className={`text-3xl font-bold ${
                      currency.daysRemaining < 0
                        ? "text-error"
                        : currency.daysRemaining <= 7
                        ? "text-error"
                        : currency.daysRemaining <= 30
                        ? "text-warning"
                        : "text-success"
                    }`}
                  >
                    {currency.daysRemaining < 0
                      ? `−${Math.abs(currency.daysRemaining)}`
                      : currency.daysRemaining}
                  </Text>
                </View>

                {/* Divider */}
                <View className="border-t border-border mb-3" />

                {/* Last qualifying flight date */}
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-muted">Last qualifying flight</Text>
                  <Text className="text-xs font-semibold text-foreground">
                    {currency.lastFlightDate
                      ? formatDate(new Date(currency.lastFlightDate))
                      : "—"}
                  </Text>
                </View>

                {/* Expiry date */}
                {currency.expirationDate && (
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-xs text-muted">Expires on</Text>
                    <Text className={`text-xs font-semibold ${getStatusColor(currency.status)}`}>
                      {formatDate(new Date(currency.expirationDate))}
                    </Text>
                  </View>
                )}

                {/* Test date (medical) */}
                {currency.testDate && (
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-xs text-muted">Test date</Text>
                    <Text className="text-xs font-semibold text-foreground">
                      {formatDate(new Date(currency.testDate))}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
