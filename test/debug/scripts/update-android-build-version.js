const fs = require('fs');
const path = require('path');
const { getBuildNumber } = require('./get-build-number');

/**
 * Script untuk update versionCode dan versionName di Android build.gradle
 * Sync build number dari package.json ke Android build configuration
 */

const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const ANDROID_BUILD_GRADLE = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

// Read package.json untuk get version
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const version = packageJson.version;
const buildNumber = getBuildNumber();

// Extract base version (without build number) if version includes build number
let baseVersion = version;
if (baseVersion.includes('-build.')) {
  baseVersion = baseVersion.split('-build.')[0];
}

// Format version name: 1.0.6-build.22
const versionName = `${baseVersion}-build.${buildNumber}`;
const versionCode = buildNumber;

console.log(`📱 Updating Android build.gradle:`);
console.log(`   versionCode: ${versionCode}`);
console.log(`   versionName: ${versionName}`);

// Read Android build.gradle
let buildGradleContent = fs.readFileSync(ANDROID_BUILD_GRADLE, 'utf8');

// Update versionCode
buildGradleContent = buildGradleContent.replace(
  /versionCode\s+\d+/,
  `versionCode ${versionCode}`
);

// Update versionName
buildGradleContent = buildGradleContent.replace(
  /versionName\s+"[^"]+"/,
  `versionName "${versionName}"`
);

// Write back
fs.writeFileSync(ANDROID_BUILD_GRADLE, buildGradleContent, 'utf8');

console.log(`✅ Updated Android build.gradle successfully`);
