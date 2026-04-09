import CryptoJS from 'crypto-js';
import { encode as base64EncodeLib, decode as base64DecodeLib } from 'base-64';

const _k = "FHT_SECRET_2026_CHANGE_THIS_TO_YOUR_OWN_RANDOM_STRING_12345";

/**
 * Convert string to hex
 */
function stringToHex(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Convert hex to string
 */
function hexToString(hex: string): string {
  let str = "";
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

/**
 * HMAC-SHA256 implementation using crypto-js (React Native compatible)
 */
function hmacSha256(message: string, key: string): string {
  // Use crypto-js for proper HMAC-SHA256 support in React Native
  // Generate HMAC-SHA256 signature
  const hmac = CryptoJS.HmacSHA256(message, key);
  
  // Convert to hex string
  const hashHex = hmac.toString(CryptoJS.enc.Hex);
  
  return hashHex;
}

/**
 * Base64 encode (URL-safe) - Buffer-based for React Native compatibility
 */
function base64Encode(str: string): string {
  console.log("[CRYPTO] base64Encode: Input:", str);
  // Use base-64 library for React Native compatibility
  const result = base64EncodeLib(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  console.log("[CRYPTO] base64Encode: Output:", result);
  return result;
}

/**
 * Base64 decode (URL-safe) - Buffer-based for React Native compatibility
 */
function base64Decode(str: string): string {
  console.log("[CRYPTO] base64Decode: Input:", str);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  console.log("[CRYPTO] base64Decode: Padded:", padded);
  
  // Use base-64 library for React Native compatibility
  const result = base64DecodeLib(padded);
  console.log("[CRYPTO] base64Decode: Output:", result);
  return result;
}

export interface LicenseKeyData {
  expirationDate: string; // ISO date string
  username?: string;
  generatedAt: string; // ISO date string
}

/**
 * Generate a license key
 * 
 * @param durationDays - Number of days until expiration
 * @param username - Optional username to embed in the key
 * @returns Promise<string> - The generated license key
 */
export function generateLicenseKey(
  durationDays: number,
  username?: string
): string {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const generatedAt = now.toISOString();
  const expirationISO = expirationDate.toISOString();

  // Create payload
  const payload = `${expirationISO}|${username || ""}|${generatedAt}`;
  const payloadEncoded = base64Encode(payload);

  // Sign payload
  const signature = hmacSha256(payload, _k);
  const signatureShort = signature.substring(0, 16); // Use first 16 chars for shorter key

  // Format: FHT-{PAYLOAD}-{SIGNATURE}
  const licenseKey = `FHT-${payloadEncoded}-${signatureShort}`;

  return licenseKey;
}

/**
 * Verify and parse a license key
 * 
 * @param licenseKey - The license key to verify
 * @returns LicenseKeyData | null - Parsed data if valid, null if invalid
 */
export function verifyLicenseKey(
  licenseKey: string
): LicenseKeyData | null {
  try {
    console.log("[CRYPTO] verifyLicenseKey: Input key:", licenseKey);
    
    // Check format
    if (!licenseKey.startsWith("FHT-")) {
      console.log("[CRYPTO] verifyLicenseKey: ❌ Key doesn't start with FHT-");
      return null;
    }

    const parts = licenseKey.split("-");
    console.log("[CRYPTO] verifyLicenseKey: Parts count:", parts.length);
    
    if (parts.length !== 3) {
      console.log("[CRYPTO] verifyLicenseKey: ❌ Invalid parts count (expected 3)");
      return null;
    }

    const [, payloadEncoded, signatureProvided] = parts;
    console.log("[CRYPTO] verifyLicenseKey: Payload (encoded):", payloadEncoded);
    console.log("[CRYPTO] verifyLicenseKey: Signature (provided):", signatureProvided);

    // Decode payload
    const payload = base64Decode(payloadEncoded);
    console.log("[CRYPTO] verifyLicenseKey: Payload (decoded):", payload);
    
    const [expirationISO, username, generatedAt] = payload.split("|");
    console.log("[CRYPTO] verifyLicenseKey: Expiration:", expirationISO);
    console.log("[CRYPTO] verifyLicenseKey: Username:", username);
    console.log("[CRYPTO] verifyLicenseKey: Generated at:", generatedAt);

    // Verify signature
    console.log("[CRYPTO] verifyLicenseKey: Computing expected signature...");
    const signatureExpected = hmacSha256(payload, _k);
    const signatureExpectedShort = signatureExpected.substring(0, 16);
    console.log("[CRYPTO] verifyLicenseKey: Signature (expected):", signatureExpectedShort);
    console.log("[CRYPTO] verifyLicenseKey: Signature (provided):", signatureProvided);
    console.log("[CRYPTO] verifyLicenseKey: Signatures match?", signatureProvided === signatureExpectedShort);

    if (signatureProvided !== signatureExpectedShort) {
      console.log("[CRYPTO] verifyLicenseKey: ❌ Signature mismatch!");
      return null; // Invalid signature
    }

    console.log("[CRYPTO] verifyLicenseKey: ✅ Signature verified successfully");
    
    // Return parsed data
    return {
      expirationDate: expirationISO,
      username: username || undefined,
      generatedAt,
    };
  } catch (error) {
    console.error("[CRYPTO] verifyLicenseKey: ❌ Exception:", error);
    return null;
  }
}

/**
 * Check if a license key is expired
 * 
 * @param licenseData - Parsed license key data
 * @returns boolean - True if expired, false if still valid
 */
export function isLicenseExpired(licenseData: LicenseKeyData): boolean {
  const now = new Date();
  const expiration = new Date(licenseData.expirationDate);
  return now > expiration;
}

/**
 * Get days remaining until expiration
 * 
 * @param licenseData - Parsed license key data
 * @returns number - Days remaining (negative if expired)
 */
export function getDaysRemaining(licenseData: LicenseKeyData): number {
  const now = new Date();
  const expiration = new Date(licenseData.expirationDate);
  const diffMs = expiration.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if license is expiring soon (within 5 days)
 * 
 * @param licenseData - Parsed license key data
 * @returns boolean - True if expiring within 5 days
 */
export function isLicenseExpiringSoon(licenseData: LicenseKeyData): boolean {
  const daysRemaining = getDaysRemaining(licenseData);
  return daysRemaining > 0 && daysRemaining <= 5;
}
