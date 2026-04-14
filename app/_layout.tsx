import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Rect } from "react-native-safe-area-context";

import { FlightProvider } from "@/lib/flight-context";
import { SettingsProvider } from "@/lib/settings-context";
import { InitialHoursProvider } from "@/lib/initial-hours-context";
import { requestNotificationPermissions } from "@/lib/notifications";
import { CustomSplash } from "@/components/custom-splash";
import { needsLicenseActivation } from "@/lib/license-manager";
import { router } from "expo-router";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  useEffect(() => {
    let licenseTimer: ReturnType<typeof setTimeout> | undefined;
    const safetyTimer = setTimeout(() => setShowSplash(false), 3000);

    const checkLicense = async () => {
      try {
        const needsActivation = await needsLicenseActivation();
        licenseTimer = setTimeout(() => {
          setShowSplash(false);
          if (needsActivation) {
            setTimeout(() => router.replace("/license-activation"), 100);
          }
        }, 2000);
      } catch {
        setShowSplash(false);
      }
    };

    checkLicense();

    return () => {
      if (licenseTimer) clearTimeout(licenseTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <InitialHoursProvider>
          <FlightProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="license-activation" options={{ gestureEnabled: false }} />
            </Stack>
            <StatusBar style="auto" />
          </FlightProvider>
        </InitialHoursProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );

  if (showSplash) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <CustomSplash />
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  if (Platform.OS === "web") {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={initialFrame}>
            <SafeAreaInsetsContext.Provider value={initialInsets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
