import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { verifyLicenseKey, isLicenseExpired, getDaysRemaining, isLicenseExpiringSoon, type LicenseKeyData } from "./license-crypto";
import { getDeviceId } from "./device-id";

const LICENSE_STORAGE_KEY = "flight_hours_tracker_license";
// SecureStore key — stored in iOS Keychain, survives app deletion/reinstall
const LICENSE_SECURE_KEY = "fht_license_v1";

export interface StoredLicense {
  key: string;
  data: LicenseKeyData;
  activatedAt: string;
  deviceId: string;
}

/**
 * Read license from SecureStore (Keychain), with AsyncStorage as legacy fallback.
 * SecureStore survives app deletion/reinstall on iOS.
 */
export async function getStoredLicense(): Promise<StoredLicense | null> {
  try {
    // Primary: iOS Keychain via SecureStore
    const secure = await SecureStore.getItemAsync(LICENSE_SECURE_KEY);
    if (secure) return JSON.parse(secure);

    // Legacy fallback: AsyncStorage (older app versions)
    const legacy = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
    if (legacy) {
      // Migrate to SecureStore and remove from AsyncStorage
      await SecureStore.setItemAsync(LICENSE_SECURE_KEY, legacy);
      await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
      return JSON.parse(legacy);
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveLicense(key: string, data: LicenseKeyData): Promise<void> {
  const deviceId = await getDeviceId();
  const license: StoredLicense = {
    key,
    data,
    activatedAt: new Date().toISOString(),
    deviceId,
  };
  const serialized = JSON.stringify(license);
  // Save to Keychain (survives reinstall) AND keep AsyncStorage in sync
  await SecureStore.setItemAsync(LICENSE_SECURE_KEY, serialized);
  await AsyncStorage.setItem(LICENSE_STORAGE_KEY, serialized);
}

export async function clearLicense(): Promise<void> {
  await SecureStore.deleteItemAsync(LICENSE_SECURE_KEY);
  await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
}

export async function checkLicenseStatus(): Promise<{
  valid: boolean;
  expired: boolean;
  expiringSoon: boolean;
  daysRemaining: number;
  data: LicenseKeyData | null;
  error?: string;
}> {
  try {
    const stored = await getStoredLicense();

    if (!stored) {
      return { valid: false, expired: false, expiringSoon: false, daysRemaining: 0, data: null, error: "No license found" };
    }

    const currentDeviceId = await getDeviceId();
    if (stored.deviceId && stored.deviceId !== currentDeviceId) {
      return { valid: false, expired: false, expiringSoon: false, daysRemaining: 0, data: null, error: "License activated on another device" };
    }

    const verifiedData = verifyLicenseKey(stored.key);
    if (!verifiedData) {
      return { valid: false, expired: false, expiringSoon: false, daysRemaining: 0, data: null, error: "Invalid license key" };
    }

    const expired = isLicenseExpired(verifiedData);
    const expiringSoon = isLicenseExpiringSoon(verifiedData);
    const daysRemaining = getDaysRemaining(verifiedData);

    return { valid: !expired, expired, expiringSoon, daysRemaining, data: verifiedData };
  } catch {
    return { valid: false, expired: false, expiringSoon: false, daysRemaining: 0, data: null, error: "Failed to check license" };
  }
}

export async function needsLicenseActivation(): Promise<boolean> {
  const status = await checkLicenseStatus();
  return !status.valid;
}
