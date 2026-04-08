const CryptoJS = require('crypto-js');
const { encode, decode } = require('base-64');

const SECRET_KEY = 'FHT_2024_SECRET_KEY_DO_NOT_SHARE';

function verifyLicenseKey(key) {
  if (!key.startsWith('FHT-')) {
    return { valid: false, error: 'Invalid key format' };
  }

  const parts = key.split('-');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid key structure' };
  }

  const encodedPayload = parts[1];
  const providedSignature = parts[2];

  // Decode payload
  const padding = (4 - (encodedPayload.length % 4)) % 4;
  const paddedPayload = encodedPayload + '='.repeat(padding);
  const payload = decode(paddedPayload);

  // Verify signature
  const hash = CryptoJS.HmacSHA256(payload, SECRET_KEY);
  const expectedSignature = hash.toString(CryptoJS.enc.Hex).substring(0, 16);

  if (expectedSignature !== providedSignature) {
    return { valid: false, error: 'Signature mismatch' };
  }

  // Parse payload
  const [expirationDateStr, username, generatedAtStr] = payload.split('|');
  const expirationDate = new Date(expirationDateStr);
  const now = new Date();
  const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

  return {
    valid: true,
    expirationDate: expirationDateStr,
    username,
    generatedAt: generatedAtStr,
    daysRemaining,
    isExpired: daysRemaining <= 0
  };
}

const testKey = 'FHT-MjAyNy0wMS0yNVQyMDo0ODoxMS41ODFafFRFU1RfVVNFUnwyMDI2LTAxLTI1VDIwOjQ4OjExLjU4MVo-241273196330859a';
console.log('Testing License Key Validation...\n');
console.log('Test Key:', testKey);
console.log('\nValidation Result:');
const result = verifyLicenseKey(testKey);
console.log(JSON.stringify(result, null, 2));

if (result.valid) {
  console.log('\n✅ License key is VALID');
  console.log('Days remaining:', result.daysRemaining);
} else {
  console.log('\n❌ License key is INVALID');
  console.log('Error:', result.error);
}
