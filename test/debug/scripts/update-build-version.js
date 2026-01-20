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

// Extract base version (without build number) if version already includes build number
let baseVersion = packageJson.version;
if (baseVersion.includes('-build.')) {
  baseVersion = baseVersion.split('-build.')[0];
}
const versionWithBuild = `${baseVersion}-build.${buildNumber}`;

// Update buildVersion
if (!packageJson.build) {
  packageJson.build = {};
}
packageJson.build.buildVersion = buildNumber.toString();

// CRITICAL: Update package.json.version with build number
// This ensures electron-updater can correctly compare versions
// Format: 1.0.6-build.14 (prerelease format for semver)
packageJson.version = versionWithBuild;

// Write back
fs.writeFileSync(PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

console.log(`✅ Updated package.json buildVersion to: ${buildNumber}`);
console.log(`✅ Updated package.json.version to: ${versionWithBuild}`);
console.log(`   Base version: ${baseVersion}`);
console.log(`   Full version: ${versionWithBuild}`);
