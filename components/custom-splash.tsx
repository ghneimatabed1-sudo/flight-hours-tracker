/**
 * Custom Splash Screen with Credits
 * Shows briefly on app startup before main content loads
 */

import { View, Text, Image, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function CustomSplash() {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* App Icon */}
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.icon}
        resizeMode="contain"
      />

      {/* App Name */}
      <Text
        style={[
          styles.appName,
          { color: colors.foreground },
        ]}
      >
        Flight Hours Tracker
      </Text>

      {/* Credits */}
      <View style={styles.creditsContainer}>
        <Text
          style={[
            styles.creditsLabel,
            { color: colors.muted },
          ]}
        >
          Programmed and designed by
        </Text>
        <Text
          style={[
            styles.creditsName,
            { color: colors.primary },
          ]}
        >
          CAPT. ABEDALQADER GHUNMAT
        </Text>
        <Text
          style={[
            styles.creditsSubtitle,
            { color: colors.muted },
          ]}
        >
          Final version – specifications locked
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
  creditsContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  creditsLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  creditsName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  creditsSubtitle: {
    fontSize: 12,
    marginTop: 8,
  },
});
