import crypto from 'crypto';

const SECRET_KEY = "FHT_SECRET_2026_CHANGE_THIS_TO_YOUR_OWN_RANDOM_STRING_12345";

function base64Encode(str) {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateKey(days, username) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const generatedAt = now.toISOString();
  const expirationISO = expirationDate.toISOString();

  const payload = `${expirationISO}|${username || ""}|${generatedAt}`;
  const payloadEncoded = base64Encode(payload);

  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  const signatureShort = signature.substring(0, 16);

  return `FHT-${payloadEncoded}-${signatureShort}`;
}

const key = await generateKey(365, "TEST_USER");
console.log("\n=== FRESH LICENSE KEY ===");
console.log(key);
console.log("\n=== EXPIRES ===");
console.log(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString());
