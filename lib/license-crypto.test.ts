/**
 * Tests for License Key Cryptography System
 */

import { describe, it, expect } from "vitest";
import {
  generateLicenseKey,
  verifyLicenseKey,
  isLicenseExpired,
  getDaysRemaining,
  isLicenseExpiringSoon,
} from "./license-crypto";

describe("License Key System", () => {
  describe("Key Generation", () => {
    it("should generate a valid license key", async () => {
      const key = await generateLicenseKey(30, "TEST_USER");
      expect(key).toMatch(/^FHT-[A-Za-z0-9_-]+-[a-f0-9]{16}$/);
    });

    it("should generate different keys for different users", async () => {
      const key1 = await generateLicenseKey(30, "USER1");
      const key2 = await generateLicenseKey(30, "USER2");
      expect(key1).not.toBe(key2);
    });

    it("should generate key without username", async () => {
      const key = await generateLicenseKey(30);
      expect(key).toMatch(/^FHT-[A-Za-z0-9_-]+-[a-f0-9]{16}$/);
    });
  });

  describe("Key Verification", () => {
    it("should verify a valid license key", async () => {
      const key = await generateLicenseKey(30, "TEST_USER");
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      expect(data?.username).toBe("TEST_USER");
      expect(data?.expirationDate).toBeDefined();
      expect(data?.generatedAt).toBeDefined();
    });

    it("should reject invalid license key format", async () => {
      const invalidKey = "INVALID-KEY-FORMAT";
      const data = verifyLicenseKey(invalidKey);
      expect(data).toBeNull();
    });

    it("should reject tampered license key", async () => {
      const key = await generateLicenseKey(30, "TEST_USER");
      const tamperedKey = key.replace(/[0-9]/, "X"); // Change one character
      const data = verifyLicenseKey(tamperedKey);
      expect(data).toBeNull();
    });

    it("should reject key with wrong prefix", async () => {
      const key = await generateLicenseKey(30);
      const wrongPrefix = key.replace("FHT-", "XXX-");
      const data = verifyLicenseKey(wrongPrefix);
      expect(data).toBeNull();
    });
  });

  describe("Expiration Checks", () => {
    it("should detect non-expired license", async () => {
      const key = await generateLicenseKey(30);
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      if (data) {
        expect(isLicenseExpired(data)).toBe(false);
      }
    });

    it("should calculate correct days remaining", async () => {
      const key = await generateLicenseKey(30);
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      if (data) {
        const daysRemaining = getDaysRemaining(data);
        expect(daysRemaining).toBeGreaterThanOrEqual(29);
        expect(daysRemaining).toBeLessThanOrEqual(30);
      }
    });

    it("should detect expiring soon (within 5 days)", async () => {
      const key = await generateLicenseKey(3); // 3 days
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      if (data) {
        expect(isLicenseExpiringSoon(data)).toBe(true);
      }
    });

    it("should not flag as expiring soon if more than 5 days", async () => {
      const key = await generateLicenseKey(10); // 10 days
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      if (data) {
        expect(isLicenseExpiringSoon(data)).toBe(false);
      }
    });

    it("should handle expired license", async () => {
      // Generate a key that expires in -1 days (already expired)
      const key = await generateLicenseKey(-1);
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      if (data) {
        expect(isLicenseExpired(data)).toBe(true);
        expect(getDaysRemaining(data)).toBeLessThan(0);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long duration", async () => {
      const key = await generateLicenseKey(365 * 10); // 10 years
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      if (data) {
        expect(isLicenseExpired(data)).toBe(false);
        const daysRemaining = getDaysRemaining(data);
        expect(daysRemaining).toBeGreaterThan(3600);
      }
    });

    it("should handle username with special characters", async () => {
      const key = await generateLicenseKey(30, "USER@EMAIL.COM");
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      expect(data?.username).toBe("USER@EMAIL.COM");
    });

    it("should handle empty string as invalid key", async () => {
      const data = verifyLicenseKey("");
      expect(data).toBeNull();
    });

    it("should handle very short duration (1 day)", async () => {
      const key = await generateLicenseKey(1);
      const data = verifyLicenseKey(key);
      
      expect(data).not.toBeNull();
      if (data) {
        const daysRemaining = getDaysRemaining(data);
        expect(daysRemaining).toBeGreaterThanOrEqual(0);
        expect(daysRemaining).toBeLessThanOrEqual(1);
      }
    });
  });
});
