import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// SecureStore keys — iOS Keychain / Android Keystore
// Survive app deletion/reinstall, ensuring stable device binding
const DEVICE_ID_SECURE_KEY = "fht_device_id_v1";
const DEVICE_ID_LEGACY_KEY = "@device_id";
const INSTALLATION_ID_KEY = "@installation_id";

/**
 * Get a unique device identifier that persists across app reinstalls.
 *
 * Security design:
 * - Primary: iOS Keychain / Android Keystore (expo-secure-store)
 *   Survives app deletion and reinstall on the SAME device.
 * - Fallback: AsyncStorage (web only or if SecureStore unavailable)
 *
 * Device binding:
 * - Same device + reinstall → same ID → new license key works
 * - Different device → different ID → license blocked
 */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === "web") return await getWebDeviceId();

    // Check SecureStore first (persists across reinstalls)
    const secureId = await SecureStore.getItemAsync(DEVICE_ID_SECURE_KEY);
    if (secureId) return secureId;

    // Generate from hardware identifiers
    const hardwareId = await getHardwareDeviceId();

    // Store in Keychain for future calls
    await SecureStore.setItemAsync(DEVICE_ID_SECURE_KEY, hardwareId);

    // Clean up legacy AsyncStorage entries
    await AsyncStorage.removeItem(DEVICE_ID_LEGACY_KEY).catch(() => {});
    await AsyncStorage.removeItem(INSTALLATION_ID_KEY).catch(() => {});

    return hardwareId;
  } catch (error) {
    console.error("Error getting device ID:", error);
    return await getFallbackDeviceId();
  }
}

async function getHardwareDeviceId(): Promise<string> {
  try {
    if (Platform.OS === "ios") {
      const Application = await import("expo-application");
      const vendorId = await Application.getIosIdForVendorAsync();
      if (vendorId) return `ios_${vendorId}`;
      return `ios_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
    }
    if (Platform.OS === "android") {
      const Application = await import("expo-application");
      const androidId = Application.getAndroidId();
      if (androidId) return `android_${androidId}`;
      return `android_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
    }
    return await getFallbackDeviceId();
  } catch {
    return await getFallbackDeviceId();
  }
}

async function getWebDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_LEGACY_KEY);
  if (!deviceId) {
    deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await AsyncStorage.setItem(DEVICE_ID_LEGACY_KEY, deviceId);
  }
  return deviceId;
}

async function getFallbackDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_SECURE_KEY);
    if (existing) return existing;
    const newId = `fallback_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
    await SecureStore.setItemAsync(DEVICE_ID_SECURE_KEY, newId);
    return newId;
  } catch {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_LEGACY_KEY);
    if (!deviceId) {
      deviceId = `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await AsyncStorage.setItem(DEVICE_ID_LEGACY_KEY, deviceId);
    }
    return deviceId as string;
  }
}

/** Clear stored device ID — for testing only, DO NOT use in production */
export async function clearDeviceId(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_ID_SECURE_KEY);
  await AsyncStorage.removeItem(DEVICE_ID_LEGACY_KEY).catch(() => {});
  await AsyncStorage.removeItem(INSTALLATION_ID_KEY).catch(() => {});
}
