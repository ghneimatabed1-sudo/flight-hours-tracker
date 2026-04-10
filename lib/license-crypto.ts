import CryptoJS from 'crypto-js';
import { encode as base64EncodeLib, decode as base64DecodeLib } from 'base-64';

const _k = "FHT_SECRET_2026_CHANGE_THIS_TO_YOUR_OWN_RANDOM_STRING_12345";

function hmacSha256(message: string, key: string): string {
  const hmac = CryptoJS.HmacSHA256(message, key);
  return hmac.toString(CryptoJS.enc.Hex);
}

function base64Encode(str: string): string {
  return base64EncodeLib(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64Decode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  return base64DecodeLib(padded);
}

export interface LicenseKeyData {
  expirationDate: string;
  username?: string;
  generatedAt: string;
}

export function generateLicenseKey(
  durationDays: number,
  username?: string
): string {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const payload = `${expirationDate.toISOString()}|${username || ""}|${now.toISOString()}`;
  const payloadEncoded = base64Encode(payload);
  const signature = hmacSha256(payload, _k).substring(0, 16);
  return `FHT-${payloadEncoded}-${signature}`;
}

export function verifyLicenseKey(licenseKey: string): LicenseKeyData | null {
  try {
    if (!licenseKey.startsWith("FHT-")) return null;
    const withoutPrefix = licenseKey.slice(4); // remove "FHT-"
    const lastDash = withoutPrefix.lastIndexOf("-");
    if (lastDash === -1) return null;

    const payloadEncoded = withoutPrefix.slice(0, lastDash);
    const signatureProvided = withoutPrefix.slice(lastDash + 1);
    const payload = base64Decode(payloadEncoded);
    const [expirationISO, username, generatedAt] = payload.split("|");

    const signatureExpected = hmacSha256(payload, _k).substring(0, 16);
    if (signatureProvided !== signatureExpected) return null;

    return {
      expirationDate: expirationISO,
      username: username || undefined,
      generatedAt,
    };
  } catch {
    return null;
  }
}

export function isLicenseExpired(licenseData: LicenseKeyData): boolean {
  return new Date() > new Date(licenseData.expirationDate);
}

export function getDaysRemaining(licenseData: LicenseKeyData): number {
  const diffMs = new Date(licenseData.expirationDate).getTime() - new Date().getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isLicenseExpiringSoon(licenseData: LicenseKeyData): boolean {
  const days = getDaysRemaining(licenseData);
  return days > 0 && days <= 5;
}
