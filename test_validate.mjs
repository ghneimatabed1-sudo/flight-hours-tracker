import crypto from 'crypto';

const SECRET_KEY = "FHT_SECRET_2026_CHANGE_THIS_TO_YOUR_OWN_RANDOM_STRING_12345";

function base64Decode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

async function validateKey(licenseKey) {
  try {
    const parts = licenseKey.split('-');
    if (parts.length !== 3 || parts[0] !== 'FHT') {
      return { valid: false, error: 'Invalid format' };
    }

    const payloadEncoded = parts[1];
    const signatureShort = parts[2];

    const payload = base64Decode(payloadEncoded);
    const [expirationISO, username, generatedAt] = payload.split('|');

    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
    const expectedShort = expectedSignature.substring(0, 16);

    if (signatureShort !== expectedShort) {
      return { valid: false, error: 'Invalid signature' };
    }

    const expirationDate = new Date(expirationISO);
    const now = new Date();

    if (expirationDate < now) {
      return { valid: false, error: 'Expired' };
    }

    return {
      valid: true,
      username,
      expirationDate: expirationDate.toLocaleDateString(),
      daysRemaining: Math.floor((expirationDate - now) / (1000 * 60 * 60 * 24))
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

const testKey = "FHT-MjAyNy0wMS0yNVQxMDoxNDoxNy4wNThafFRFU1RfVVNFUnwyMDI2LTAxLTI1VDEwOjE0OjE3LjA1OFo-103fc5aa97b566b9";
const result = await validateKey(testKey);

console.log("\n=== VALIDATION RESULT ===");
console.log(JSON.stringify(result, null, 2));

if (result.valid) {
  console.log("\n✅ SUCCESS: Key is valid!");
} else {
  console.log(`\n❌ FAILED: ${result.error}`);
}
