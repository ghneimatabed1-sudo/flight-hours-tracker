import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { verifyLicenseKey, isLicenseExpired } from "@/lib/license-crypto";
import { saveLicense } from "@/lib/license-manager";
import { useColors } from "@/hooks/use-colors";

export default function LicenseActivationScreen() {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const colors = useColors();

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      Alert.alert("Error", "Please enter a license key");
      return;
    }

    setLoading(true);
    try {
      const licenseData = verifyLicenseKey(licenseKey.trim());

      if (!licenseData) {
        Alert.alert("Invalid License Key", "The license key you entered is invalid. Please check and try again.");
        return;
      }

      if (isLicenseExpired(licenseData)) {
        Alert.alert("License Expired", `This license key expired on ${new Date(licenseData.expirationDate).toLocaleDateString()}.`);
        return;
      }

      await saveLicense(licenseKey.trim(), licenseData);

      Alert.alert(
        "License Activated",
        `Welcome${licenseData.username ? `, ${licenseData.username}` : ""}!\n\nYour license is valid until ${new Date(licenseData.expirationDate).toLocaleDateString()}.`,
        [{ text: "Continue", onPress: () => router.replace("/(tabs)") }]
      );
    } catch {
      Alert.alert("Error", "Failed to activate license. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="p-6 bg-gradient-to-b from-primary/10 to-background">
      <View className="flex-1 justify-center">
        {/* Logo */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-primary rounded-3xl items-center justify-center mb-4">
            <Text className="text-5xl">🚁</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground text-center">
            Flight Hours Tracker
          </Text>
          <Text className="text-base text-muted text-center mt-2">
            Professional Pilot Logbook
          </Text>
        </View>

        {/* Activation Card */}
        <View className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
          <Text className="text-xl font-semibold text-foreground mb-2">
            Activate License
          </Text>
          <Text className="text-sm text-muted mb-6">
            Enter your license key to activate the app
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-2">
              License Key
            </Text>
            <TextInput
              value={licenseKey}
              onChangeText={setLicenseKey}
              placeholder="FHT-XXXXX-XXXXX-XXXXX"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              className="bg-background border-2 border-border rounded-xl px-4 py-3 text-foreground font-mono"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            onPress={handleActivate}
            disabled={loading}
            className="bg-primary rounded-xl py-4 items-center"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold text-base">
                🔐 Activate License
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View className="mt-6 bg-surface/50 rounded-xl p-4 border border-border/50">
          <Text className="text-xs text-muted text-center">
            💡 Need a license key? Contact the developer:
          </Text>
          <Text className="text-xs font-semibold text-foreground text-center mt-2">
            CAPT. ABEDALQADER GHUNMAT
          </Text>
          <Text className="text-xs text-primary text-center mt-1">
            Phone: 0775008345
          </Text>
        </View>

        <Text className="text-xs text-muted text-center mt-8">
          Flight Hours Tracker © 2026
        </Text>
      </View>
    </ScreenContainer>
  );
}
