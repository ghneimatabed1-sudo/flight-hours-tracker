const crypto = require('crypto');

const SECRET_KEY = "FHT_SECRET_2026_CHANGE_THIS_TO_YOUR_OWN_RANDOM_STRING_12345";

// Generate key (HTML generator logic)
function generateKey(days, username) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const generatedAt = now.toISOString();
  const expirationISO = expirationDate.toISOString();

  const payload = `${expirationISO}|${username}|${generatedAt}`;
  const payloadEncoded = Buffer.from(payload).toString('base64')
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')
    .substring(0, 16);

  return `FHT-${payloadEncoded}-${signature}`;
}

// Verify key (App logic)
function verifyKey(licenseKey) {
  if (!licenseKey.startsWith("FHT-")) {
    return { valid: false, reason: "Invalid format" };
  }

  const parts = licenseKey.split("-");
  if (parts.length !== 3) {
    return { valid: false, reason: "Invalid parts count" };
  }

  const [, payloadEncoded, signatureProvided] = parts;

  // Decode payload
  const base64 = payloadEncoded.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const payload = Buffer.from(base64 + padding, 'base64').toString('utf-8');
  
  const [expirationISO, username, generatedAt] = payload.split("|");

  // Verify signature
  const signatureExpected = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')
    .substring(0, 16);

  if (signatureProvided !== signatureExpected) {
    return { 
      valid: false, 
      reason: "Invalid signature",
      expected: signatureExpected,
      provided: signatureProvided
    };
  }

  return {
    valid: true,
    expirationDate: expirationISO,
    username: username || "N/A",
    generatedAt: generatedAt
  };
}

// Test
console.log("=== License Key Test ===\n");

const testKey = generateKey(365, "TEST_USER");
console.log("Generated Key:");
console.log(testKey);
console.log("\nKey Length:", testKey.length);

console.log("\n--- Validation Result ---");
const result = verifyKey(testKey);
console.log(JSON.stringify(result, null, 2));

if (result.valid) {
  console.log("\n✅ SUCCESS: Key is valid!");
} else {
  console.log("\n❌ FAILED:", result.reason);
}
