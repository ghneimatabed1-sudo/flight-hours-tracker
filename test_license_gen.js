const crypto = require('crypto');

const SECRET_KEY = "FHT_SECRET_2026_CHANGE_THIS_TO_YOUR_OWN_RANDOM_STRING_12345";

function generateLicenseKey(days, username) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  const timestamp = Date.now();
  
  const payload = `${expirationDate.toISOString()}|${username}|${timestamp}`;
  const payloadBase64 = Buffer.from(payload).toString('base64');
  
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('hex');
  
  return `FHT-${payloadBase64}-${signature}`;
}

// Generate test key for 365 days
const testKey = generateLicenseKey(365, "TEST_USER");
console.log("Test License Key (365 days):");
console.log(testKey);
console.log("\nKey Length:", testKey.length);
console.log("Format: FHT-{base64}-{signature}");
