import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyLicenseKey, isLicenseExpired, getDaysRemaining, isLicenseExpiringSoon, type LicenseKeyData } from "./license-crypto";
import { getDeviceId } from "./device-id";

const LICENSE_STORAGE_KEY = "flight_hours_tracker_license";

export interface StoredLicense {
  key: string;
  data: LicenseKeyData;
  activatedAt: string;
  deviceId: string;
}

export async function getStoredLicense(): Promise<StoredLicense | null> {
  try {
    const stored = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
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
  await AsyncStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
}

export async function clearLicense(): Promise<void> {
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
