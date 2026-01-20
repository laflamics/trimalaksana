const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RELEASE_DIR = path.join(__dirname, '..', 'release-build');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const { getBuildNumber } = require('./get-build-number');

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const version = packageJson.version;
const buildNumber = getBuildNumber();

// CRITICAL FIX: Electron-updater requires valid semver format (MAJOR.MINOR.PATCH)
// Format dengan 4 bagian (1.0.6.4) tidak valid untuk semver
// Gunakan prerelease format: 1.0.6-build.4 atau build metadata: 1.0.6+4
// Untuk generic provider, gunakan prerelease format: 1.0.6-build.4
// Note: package.json.version sudah di-update dengan build number di update-build-version.js
// Jadi kita bisa langsung pakai version dari package.json, atau extract base version
let versionWithBuild;
if (version.includes('-build.')) {
  // Version sudah include build number, pakai langsung
  versionWithBuild = version;
} else {
  // Version belum include build number, tambahkan
  versionWithBuild = `${version}-build.${buildNumber}`;
}

// Find the AppImage file
const files = fs.readdirSync(RELEASE_DIR);
// Cari file .AppImage
let appImageFile = files.find(f => 
  f.endsWith('.AppImage') && 
  !f.includes('unpacked') &&
  f.includes('PT.Trima Laksana Jaya Pratama')
);

// Fallback: cari .AppImage apapun
if (!appImageFile) {
  appImageFile = files.find(f => 
    f.endsWith('.AppImage') && 
    !f.includes('unpacked')
  );
}

if (!appImageFile) {
  console.error(`⚠️  AppImage file not found in ${RELEASE_DIR}`);
  console.error(`   Available files: ${files.filter(f => f.endsWith('.AppImage')).join(', ') || 'none'}`);
  process.exit(0);
}

const appImagePath = path.join(RELEASE_DIR, appImageFile);
const stats = fs.statSync(appImagePath);
const fileSize = stats.size;

// Calculate SHA512 hash for AppImage
const fileBuffer = fs.readFileSync(appImagePath);
const hashSum = crypto.createHash('sha512');
hashSum.update(fileBuffer);
const sha512 = hashSum.digest('hex');

// Generate latest-linux.yml content
const latestLinuxYml = `version: ${versionWithBuild}
files:
  - url: ${appImageFile}
    sha512: ${sha512}
    size: ${fileSize}
path: ${appImageFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

// Write latest-linux.yml
const latestLinuxYmlPath = path.join(RELEASE_DIR, 'latest-linux.yml');
fs.writeFileSync(latestLinuxYmlPath, latestLinuxYml, 'utf8');

console.error(`✅ Generated latest-linux.yml for ${appImageFile}`);
console.error(`   Version: ${version}`);
console.error(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
console.error(`   SHA512: ${sha512.substring(0, 16)}...`);
