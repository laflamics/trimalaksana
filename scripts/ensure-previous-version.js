const fs = require('fs');
const path = require('path');

/**
 * Script untuk memastikan versi sebelumnya ada di release-build/
 * Ini diperlukan untuk generate patch file (differential package)
 */

const RELEASE_DIR = path.join(__dirname, '..', 'release-build');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');

// Read current version
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const currentVersion = packageJson.version;

console.log(`📦 Current version: ${currentVersion}`);

// Parse version (format: 1.0.6)
const versionParts = currentVersion.split('.');
const major = parseInt(versionParts[0]);
const minor = parseInt(versionParts[1]);
const patch = parseInt(versionParts[2]);

// Calculate previous version
let prevPatch = patch - 1;
let prevMinor = minor;
let prevMajor = major;

if (prevPatch < 0) {
  prevPatch = 9; // Assuming patch goes 0-9
  prevMinor = minor - 1;
  if (prevMinor < 0) {
    prevMinor = 9;
    prevMajor = major - 1;
  }
}

const previousVersion = `${prevMajor}.${prevMinor}.${prevPatch}`;
console.log(`🔍 Looking for previous version: ${previousVersion}`);

// Check if release-build directory exists
if (!fs.existsSync(RELEASE_DIR)) {
  console.log(`⚠️  Release directory doesn't exist: ${RELEASE_DIR}`);
  console.log(`   Creating directory...`);
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

// List files in release-build
const files = fs.readdirSync(RELEASE_DIR);
const previousInstaller = files.find(f => 
  f.endsWith('.exe') && 
  !f.includes('blockmap') &&
  !f.endsWith('.exe.patch') &&
  f.includes('PT.Trima Laksana Jaya Pratama') &&
  (f.includes(previousVersion) || f.includes(`Setup ${previousVersion}`))
);

if (previousInstaller) {
  console.log(`✅ Found previous version installer: ${previousInstaller}`);
  console.log(`   Patch file will be generated automatically during build.`);
} else {
  console.log(`⚠️  Previous version installer not found in ${RELEASE_DIR}`);
  console.log(`   Expected: Setup file with version ${previousVersion}`);
  console.log(`   Available files:`);
  files.filter(f => f.endsWith('.exe') && !f.includes('blockmap')).forEach(f => {
    console.log(`     - ${f}`);
  });
  console.log(`\n💡 To enable patch generation:`);
  console.log(`   1. Copy previous version installer to: ${RELEASE_DIR}`);
  console.log(`   2. Or download from server and place it there`);
  console.log(`   3. Then run: npm run build:app`);
  console.log(`\n⚠️  Without previous version, only full installer will be generated.`);
  console.log(`   Users will need to download full installer for updates.`);
}

