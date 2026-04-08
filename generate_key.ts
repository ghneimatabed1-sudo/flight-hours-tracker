import { generateLicenseKey } from "./lib/license-crypto";

async function main() {
  const days = 365;
  const username = "TEST_USER";
  
  // Correct order: durationDays first, then username
  const key = await generateLicenseKey(days, username);
  
  console.log("\n=== FRESH LICENSE KEY ===");
  console.log(key);
  console.log("\n=== KEY DETAILS ===");
  console.log(`Username: ${username}`);
  console.log(`Valid for: ${days} days`);
  console.log(`Expires: ${new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
}

main();
