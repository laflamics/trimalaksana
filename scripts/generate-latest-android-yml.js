const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ANDROID_APK_DIR = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const { getBuildNumber } = require('./get-build-number');

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const version = packageJson.version;
const buildNumber = getBuildNumber();

// Extract base version (without build number) if version includes build number
let baseVersion = version;
if (baseVersion.includes('-build.')) {
  baseVersion = baseVersion.split('-build.')[0];
}

// Format version name: 1.0.6-build.22
const versionWithBuild = `${baseVersion}-build.${buildNumber}`;

// Find APK file
if (!fs.existsSync(ANDROID_APK_DIR)) {
  console.error(`❌ Android APK directory tidak ditemukan: ${ANDROID_APK_DIR}`);
  console.error(`   Pastikan sudah build APK terlebih dahulu: npm run build:android`);
  process.exit(1);
}

const files = fs.readdirSync(ANDROID_APK_DIR);
const apkFiles = files.filter(f => f.endsWith('.apk') && !f.includes('unaligned'));

if (apkFiles.length === 0) {
  console.error(`❌ Tidak ada APK file ditemukan di ${ANDROID_APK_DIR}`);
  console.error(`   Available files: ${files.join(', ') || 'none'}`);
  console.error(`   Pastikan sudah build APK terlebih dahulu: npm run build:android`);
  process.exit(1);
}

// Ambil APK file yang pertama (biasanya app-release.apk)
const apkFile = apkFiles[0];
const apkPath = path.join(ANDROID_APK_DIR, apkFile);

console.log(`📦 Found APK: ${apkFile}`);

const stats = fs.statSync(apkPath);
const fileSize = stats.size;

// Calculate SHA512 hash for APK
const fileBuffer = fs.readFileSync(apkPath);
const hashSum = crypto.createHash('sha512');
hashSum.update(fileBuffer);
const sha512 = hashSum.digest('hex');

// Generate latest.yml content untuk Android APK
const latestYml = `version: ${versionWithBuild}
files:
  - url: ${apkFile}
    sha512: ${sha512}
    size: ${fileSize}
path: ${apkFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

// Write latest.yml ke release-build directory (sama dengan Windows)
const RELEASE_DIR = path.join(__dirname, '..', 'release-build');
if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

const latestYmlPath = path.join(RELEASE_DIR, 'latest.yml');
fs.writeFileSync(latestYmlPath, latestYml, 'utf8');

console.log(`✅ Generated latest.yml for Android APK:`);
console.log(`   Version: ${versionWithBuild}`);
console.log(`   APK file: ${apkFile}`);
console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Saved to: ${latestYmlPath}`);
