const fs = require('fs');
const path = require('path');
const { incrementBuildNumber, getBuildNumber } = require('./get-build-number');

/**
 * Script untuk update buildVersion di package.json sebelum build
 * Build number akan di-increment setiap kali build, sehingga aplikasi bisa di-update
 * meskipun version tetap sama (misalnya tetap 1.0.6)
 */

const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');

// Increment build number
const buildNumber = incrementBuildNumber();
console.log(`📦 Build number incremented to: ${buildNumber}`);

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

// Update buildVersion
if (!packageJson.build) {
  packageJson.build = {};
}
packageJson.build.buildVersion = buildNumber.toString();

// Write back
fs.writeFileSync(PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

console.log(`✅ Updated package.json buildVersion to: ${buildNumber}`);
console.log(`   Version: ${packageJson.version}.${buildNumber}`);
