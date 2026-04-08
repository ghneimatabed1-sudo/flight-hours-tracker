import { generateLicenseKey, verifyLicenseKey } from './lib/license-crypto';

async function test() {
  console.log("=== Testing App License System ===\n");
  
  // Generate key using app code
  console.log("1. Generating license key (365 days)...");
  const key = await generateLicenseKey(365, "TEST_USER");
  console.log("Generated:", key);
  console.log("Length:", key.length);
  
  // Verify key using app code
  console.log("\n2. Verifying license key...");
  const result = verifyLicenseKey(key);
  
  if (result) {
    console.log("✅ VALID!");
    console.log("Expiration:", result.expirationDate);
    console.log("Username:", result.username);
    console.log("Generated At:", result.generatedAt);
  } else {
    console.log("❌ INVALID!");
  }
  
  // Test with HTML generator format
  console.log("\n3. Testing HTML generator key format...");
  const htmlKey = "FHT-MjAyNy0wMS0yNVQwOTozMTo1My41MjJafFRFU1RfVVNFUnwyMDI2LTAxLTI1VDA5OjMxOjUzLjUyMlo-788bfb2e08152f3b";
  const htmlResult = verifyLicenseKey(htmlKey);
  
  if (htmlResult) {
    console.log("✅ HTML key VALID!");
    console.log("Expiration:", htmlResult.expirationDate);
  } else {
    console.log("❌ HTML key INVALID!");
  }
}

test().catch(console.error);
