import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  verifyLicenseKey,
  isLicenseExpiringSoon,
  type LicenseKeyData,
} from "./license-crypto";

const LICENSE_STORAGE_KEY = "flight_hours_tracker_license";
const LICENSE_SECURE_KEY = "fht_license_v1";

/**
 * Activation history — stored separately and NEVER erased by clearLicense().
 * This is the core of the replay-attack defense: even if a user clears their
 * license and re-enters the same key, the original first-activation date is
 * preserved here, so the effective expiry never moves forward.
 *
 * Key: "fht_act_hist_v1"  (intentionally different from LICENSE_SECURE_KEY)
 * Value: JSON array of ActivationRecord
 */
const ACTIVATION_HISTORY_KEY = "fht_act_hist_v1";

interface ActivationRecord {
  fingerprint: string;  // unique portion of the key string (not the full key)
  firstActivatedAt: string; // ISO — when this key was FIRST entered on this device
  durationMs: number;       // how long the key was issued for (ms)
  username?: string;
}

export interface StoredLicense {
  key: string;
  data: LicenseKeyData;
  activatedAt: string;
}

// ─── Activation history helpers ───────────────────────────────────────────────

/**
 * Extract a stable fingerprint from the raw key string.
 * We use the base64 payload portion (between the first and last dash segments).
 * This uniquely identifies the key without exposing secrets.
 */
function keyFingerprint(rawKey: string): string {
  const stripped = rawKey.replace(/\s/g, "");
  if (!stripped.startsWith("FHT-")) return stripped.slice(0, 32);
  const withoutPrefix = stripped.slice(4);
  const lastDash = withoutPrefix.lastIndexOf("-");
  return lastDash === -1 ? withoutPrefix.slice(0, 48) : withoutPrefix.slice(0, lastDash);
}

async function loadActivationHistory(): Promise<ActivationRecord[]> {
  try {
    const raw = await SecureStore.getItemAsync(ACTIVATION_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivationRecord[];
  } catch {
    return [];
  }
}

async function saveActivationHistory(records: ActivationRecord[]): Promise<void> {
  await SecureStore.setItemAsync(ACTIVATION_HISTORY_KEY, JSON.stringify(records));
}

/**
 * Find the activation record for the given raw key, if one exists.
 */
async function findActivationRecord(rawKey: string): Promise<ActivationRecord | null> {
  const fp = keyFingerprint(rawKey);
  const history = await loadActivationHistory();
  return history.find((r) => r.fingerprint === fp) ?? null;
}

/**
 * Record the first activation of a key. If the key has been seen before,
 * the existing record is kept intact — this is the key to preventing the exploit.
 */
async function recordFirstActivation(
  rawKey: string,
  licenseData: LicenseKeyData
): Promise<ActivationRecord> {
  const fp = keyFingerprint(rawKey);
  const history = await loadActivationHistory();
  const existing = history.find((r) => r.fingerprint === fp);

  if (existing) {
    return existing;
  }

  const durationMs =
    new Date(licenseData.expirationDate).getTime() -
    new Date(licenseData.generatedAt).getTime();

  const record: ActivationRecord = {
    fingerprint: fp,
    firstActivatedAt: new Date().toISOString(),
    durationMs,
    username: licenseData.username,
  };

  history.push(record);
  await saveActivationHistory(history);
  return record;
}

// ─── Effective expiry calculation ─────────────────────────────────────────────

/**
 * Compute the EFFECTIVE expiry for a key, enforcing the first-activation date.
 *
 * effectiveExpiry = min(
 *   key.expirationDate,                  — what the key says
 *   firstActivatedAt + durationMs        — what the device says
 * )
 *
 * This means:
 * - If you clear the license on Day 29 and re-enter the same key, the system
 *   remembers Day 0 as the first activation and your expiry is still Day 30
 *   (1 day left), not Day 29 + 30 = Day 59.
 * - A key shared between two people on different devices works, but each device
 *   is independently locked to the expiry it started with.
 */
function computeEffectiveExpiry(
  licenseData: LicenseKeyData,
  record: ActivationRecord
): Date {
  const keyExpiry = new Date(licenseData.expirationDate).getTime();
  const deviceExpiry = new Date(record.firstActivatedAt).getTime() + record.durationMs;
  return new Date(Math.min(keyExpiry, deviceExpiry));
}

function effectiveDaysRemaining(licenseData: LicenseKeyData, record: ActivationRecord): number {
  const diffMs = computeEffectiveExpiry(licenseData, record).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function isEffectivelyExpired(licenseData: LicenseKeyData, record: ActivationRecord): boolean {
  return Date.now() > computeEffectiveExpiry(licenseData, record).getTime();
}

function isEffectivelyExpiringSoon(
  licenseData: LicenseKeyData,
  record: ActivationRecord
): boolean {
  const days = effectiveDaysRemaining(licenseData, record);
  return days > 0 && days <= 5;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read license from SecureStore (Keychain), with AsyncStorage as legacy fallback.
 * SecureStore survives app deletion/reinstall on iOS.
 */
export async function getStoredLicense(): Promise<StoredLicense | null> {
  try {
    const secure = await SecureStore.getItemAsync(LICENSE_SECURE_KEY);
    if (secure) return JSON.parse(secure);

    const legacy = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
    if (legacy) {
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
  // Record the first activation BEFORE saving. If the key was already activated
  // on this device, the existing record is returned and preserved.
  await recordFirstActivation(key, data);

  const license: StoredLicense = {
    key,
    data,
    activatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(license);
  await SecureStore.setItemAsync(LICENSE_SECURE_KEY, serialized);
  await AsyncStorage.setItem(LICENSE_STORAGE_KEY, serialized);
}

/**
 * Clear the visible license only.
 * The activation history is intentionally NOT cleared — this prevents the
 * "clear + re-enter same key to get more days" exploit.
 */
export async function clearLicense(): Promise<void> {
  await SecureStore.deleteItemAsync(LICENSE_SECURE_KEY);
  await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
  // ACTIVATION_HISTORY_KEY is deliberately left untouched.
}

export async function checkLicenseStatus(): Promise<{
  valid: boolean;
  expired: boolean;
  expiringSoon: boolean;
  daysRemaining: number;
  data: LicenseKeyData | null;
  effectiveExpiryDate?: string;
  error?: string;
}> {
  try {
    const stored = await getStoredLicense();
    if (!stored) {
      return { valid: false, expired: false, expiringSoon: false, daysRemaining: 0, data: null, error: "No license found" };
    }

    const verifiedData = verifyLicenseKey(stored.key);
    if (!verifiedData) {
      return { valid: false, expired: false, expiringSoon: false, daysRemaining: 0, data: null, error: "Invalid license key" };
    }

    // Look up the activation record for this key.
    // If somehow there's no record (e.g. older install), fall back gracefully
    // by creating one now with activatedAt = stored.activatedAt.
    let record = await findActivationRecord(stored.key);
    if (!record) {
      const durationMs =
        new Date(verifiedData.expirationDate).getTime() -
        new Date(verifiedData.generatedAt).getTime();
      record = {
        fingerprint: keyFingerprint(stored.key),
        firstActivatedAt: stored.activatedAt,
        durationMs,
        username: verifiedData.username,
      };
      const history = await loadActivationHistory();
      history.push(record);
      await saveActivationHistory(history);
    }

    const expired = isEffectivelyExpired(verifiedData, record);
    const expiringSoon = isEffectivelyExpiringSoon(verifiedData, record);
    const daysRemaining = effectiveDaysRemaining(verifiedData, record);
    const effectiveExpiryDate = computeEffectiveExpiry(verifiedData, record).toISOString();

    return {
      valid: !expired,
      expired,
      expiringSoon,
      daysRemaining,
      data: verifiedData,
      effectiveExpiryDate,
    };
  } catch {
    return { valid: false, expired: false, expiringSoon: false, daysRemaining: 0, data: null, error: "Failed to check license" };
  }
}

export async function needsLicenseActivation(): Promise<boolean> {
  const status = await checkLicenseStatus();
  return !status.valid;
}
