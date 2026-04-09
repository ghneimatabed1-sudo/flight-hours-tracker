import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@device_id';
const INSTALLATION_ID_KEY = '@installation_id';

/**
 * Get a unique device identifier that persists across app reinstalls.
 * 
 * Uses multiple factors to ensure uniqueness:
 * - Platform-specific ID (androidId on Android, identifierForVendor on iOS)
 * - Installation ID (random, generated once per install)
 * - Device model and brand (for additional uniqueness)
 * 
 * @returns Promise<string> - Unique device identifier
 */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return await getWebDeviceId();
    }

    if (Platform.OS === 'ios') {
      return await getIOSDeviceId();
    }

    if (Platform.OS === 'android') {
      return await getAndroidDeviceId();
    }

    // Fallback for other platforms
    return await getFallbackDeviceId();
  } catch (error) {
    console.error('Error getting device ID:', error);
    return await getFallbackDeviceId();
  }
}

/**
 * Get device ID for Web platform
 */
async function getWebDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get device ID for iOS platform
 * Uses identifierForVendor which is stable across app reinstalls
 */
async function getIOSDeviceId(): Promise<string> {
  // Dynamic import to avoid loading on web
  const Application = await import('expo-application');
  const Device = await import('expo-device');
  
  // Try to get identifierForVendor (stable across reinstalls)
  const vendorId = await Application.getIosIdForVendorAsync();
  
  if (vendorId) {
    // Use vendor ID only - stable across Expo Go and standalone builds
    return `ios_${vendorId}`;
  }
  
  // Fallback: use device model (less reliable but better than nothing)
  const deviceModel = Device.modelName || 'unknown';
  return `ios_${deviceModel}`;
}

/**
 * Get device ID for Android platform
 * Uses Android ID which is stable across app reinstalls and builds
 */
async function getAndroidDeviceId(): Promise<string> {
  // Dynamic import to avoid loading on web
  const Application = await import('expo-application');
  const Device = await import('expo-device');
  
  // Get Android ID (stable across reinstalls)
  const androidId = await Application.getAndroidIdAsync();
  
  if (androidId) {
    // Use Android ID only - stable across Expo Go and standalone builds
    return `android_${androidId}`;
  }
  
  // Fallback: use device info (less reliable but better than nothing)
  const deviceBrand = Device.brand || 'unknown';
  const deviceModel = Device.modelName || 'unknown';
  return `android_${deviceBrand}_${deviceModel}`;
}

/**
 * Get or create installation ID
 * This ID is unique per app installation and persists in AsyncStorage
 */
async function getOrCreateInstallationId(): Promise<string> {
  let installationId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  
  if (!installationId) {
    // Generate new installation ID
    installationId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
  }
  
  return installationId;
}

/**
 * Fallback method to generate a device ID when platform-specific methods fail.
 */
async function getFallbackDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    const installationId = await getOrCreateInstallationId();
    deviceId = `fallback_${installationId}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Clear the stored device ID (for testing purposes only).
 * DO NOT use in production code.
 */
export async function clearDeviceId(): Promise<void> {
  await AsyncStorage.removeItem(DEVICE_ID_KEY);
  await AsyncStorage.removeItem(INSTALLATION_ID_KEY);
}
