/**
 * License Manager
 * 
 * Handles license storage, validation, and expiration checks
 */

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

/**
 * Get stored license from AsyncStorage
 */
export async function getStoredLicense(): Promise<StoredLicense | null> {
  try {
    const stored = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error reading stored license:", error);
    return null;
  }
}

/**
 * Save license to AsyncStorage with Device ID
 */
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

/**
 * Clear stored license
 */
export async function clearLicense(): Promise<void> {
  await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
}

/**
 * Check if app has a valid license
 * Returns: { valid: boolean, expired: boolean, expiringSoon: boolean, daysRemaining: number, data: LicenseKeyData | null }
 */
export async function checkLicenseStatus(): Promise<{
  valid: boolean;
  expired: boolean;
  expiringSoon: boolean;
  daysRemaining: number;
  data: LicenseKeyData | null;
  error?: string;
}> {
  try {
    console.log("[LICENSE] checkLicenseStatus: Starting license check...");
    const stored = await getStoredLicense();

    if (!stored) {
      console.log("[LICENSE] checkLicenseStatus: No stored license found");
      return {
        valid: false,
        expired: false,
        expiringSoon: false,
        daysRemaining: 0,
        data: null,
        error: "No license found",
      };
    }
    
    console.log("[LICENSE] checkLicenseStatus: Stored license found");
    console.log("[LICENSE] checkLicenseStatus: License key:", stored.key);

    // Verify Device ID (Device Lock)
    const currentDeviceId = await getDeviceId();
    console.log("[LICENSE] checkLicenseStatus: Current Device ID:", currentDeviceId);
    console.log("[LICENSE] checkLicenseStatus: Stored Device ID:", stored.deviceId);
    
    if (stored.deviceId && stored.deviceId !== currentDeviceId) {
      console.log("[LICENSE] checkLicenseStatus: ❌ Device ID mismatch - License locked to another device");
      return {
        valid: false,
        expired: false,
        expiringSoon: false,
        daysRemaining: 0,
        data: null,
        error: "License activated on another device",
      };
    }
    
    console.log("[LICENSE] checkLicenseStatus: ✅ Device ID verified");

    // Re-verify the license key (in case it was tampered with)
    console.log("[LICENSE] checkLicenseStatus: Verifying license key...");
    const verifiedData = verifyLicenseKey(stored.key);

    if (!verifiedData) {
      console.log("[LICENSE] checkLicenseStatus: ❌ License verification FAILED");
      return {
        valid: false,
        expired: false,
        expiringSoon: false,
        daysRemaining: 0,
        data: null,
        error: "Invalid license key",
      };
    }
    
    console.log("[LICENSE] checkLicenseStatus: ✅ License verification PASSED");
    console.log("[LICENSE] checkLicenseStatus: Verified data:", verifiedData);

    const expired = isLicenseExpired(verifiedData);
    const expiringSoon = isLicenseExpiringSoon(verifiedData);
    const daysRemaining = getDaysRemaining(verifiedData);
    
    console.log("[LICENSE] checkLicenseStatus: Expired?", expired);
    console.log("[LICENSE] checkLicenseStatus: Days remaining:", daysRemaining);
    console.log("[LICENSE] checkLicenseStatus: Final result - Valid:", !expired);

    return {
      valid: !expired,
      expired,
      expiringSoon,
      daysRemaining,
      data: verifiedData,
    };
  } catch (error) {
    console.error("Error checking license status:", error);
    return {
      valid: false,
      expired: false,
      expiringSoon: false,
      daysRemaining: 0,
      data: null,
      error: "Failed to check license",
    };
  }
}

/**
 * Check if license needs activation (no license or expired)
 */
export async function needsLicenseActivation(): Promise<boolean> {
  const status = await checkLicenseStatus();
  return !status.valid;
}
