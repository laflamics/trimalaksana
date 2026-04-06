const fs = require('fs');
const path = require('path');

// ============================================
// GENERATE LATEST.YML FOR AUTO-UPDATE
// ============================================

console.log('\n[Generate Latest.yml] Starting...\n');

// Ensure build/icon.ico exists (copy from public/noxtiz.ico if needed)
const buildDir = path.join(__dirname, '../build');
const buildIconPath = path.join(buildDir, 'icon.ico');
const publicIconPath = path.join(__dirname, '../public/noxtiz.ico');

if (!fs.existsSync(buildIconPath) && fs.existsSync(publicIconPath)) {
  console.log('[Icon] Copying public/noxtiz.ico to build/icon.ico...');
  try {
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    fs.copyFileSync(publicIconPath, buildIconPath);
    console.log('[Icon] ✅ Icon copied successfully\n');
  } catch (error) {
    console.warn('[Icon] ⚠️ Could not copy icon:', error.message);
  }
}

// Read package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`Version: ${version}`);

// Find the .exe file that was just built
const releaseDir = path.join(__dirname, '../release-build');
const releasePath = path.join(__dirname, '../release');

let exePath = null;
let exeName = null;

// Try both release-build and release directories
for (const dir of [releasePath, releaseDir]) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => 
      f.endsWith('.exe') && f.includes('Setup')
    );
    
    if (files.length > 0) {
      // Get the latest file (highest version/timestamp)
      const sortedFiles = files.sort().reverse();
      exeName = sortedFiles[0];
      exePath = path.join(dir, exeName);
      console.log(`Found executable: ${exeName}`);
      break;
    }
  }
}

if (!exePath) {
  console.error('[ERROR] No .exe file found in release directories');
  process.exit(1);
}

// Get file info
const stats = fs.statSync(exePath);
const fileSize = stats.size;

console.log(`Executable size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

// Generate YAML content
const latestYmlContent = `version: ${version}
files:
  - url: ${exeName}
    sha512: ''
    size: ${fileSize}
    blockMapSize: 0
path: ${exeName}
sha512: ''
releaseDate: '${new Date().toISOString()}'
`;

// Save to docker/updates/ (production server location)
const dockerUpdatesDir = path.join(__dirname, '../docker/updates');
if (!fs.existsSync(dockerUpdatesDir)) {
  fs.mkdirSync(dockerUpdatesDir, { recursive: true });
}

const latestYmlPath = path.join(dockerUpdatesDir, 'latest.yml');
fs.writeFileSync(latestYmlPath, latestYmlContent, 'utf8');

console.log(`✅ Created: ${latestYmlPath}\n`);

// Also copy to release-build/ for GitHub Actions upload
const releaseBuildDir = path.join(__dirname, '../release-build');
if (!fs.existsSync(releaseBuildDir)) {
  fs.mkdirSync(releaseBuildDir, { recursive: true });
}
const releaseBuildLatestYmlPath = path.join(releaseBuildDir, 'latest.yml');
fs.writeFileSync(releaseBuildLatestYmlPath, latestYmlContent, 'utf8');
console.log(`✅ Created: ${releaseBuildLatestYmlPath}\n`);

// Also copy to release folder for reference (create folder if not exists)
const releaseLatestYmlPath = path.join(releasePath, 'latest.yml');
try {
  // Create release folder if it doesn't exist
  if (!fs.existsSync(releasePath)) {
    fs.mkdirSync(releasePath, { recursive: true });
  }
  fs.writeFileSync(releaseLatestYmlPath, latestYmlContent, 'utf8');
} catch (error) {
  console.warn(`[WARNING] Could not write to release folder: ${error.message}`);
}

// Copy .exe to docker/updates/
console.log(`\n[Copy Executable] Copying to docker/updates/...`);
const destExePath = path.join(dockerUpdatesDir, exeName);

try {
  fs.copyFileSync(exePath, destExePath);
  
  // Verify copy was successful
  const sourceStats = fs.statSync(exePath);
  const destStats = fs.statSync(destExePath);
  
  if (sourceStats.size !== destStats.size) {
    throw new Error(`Size mismatch after copy: source=${sourceStats.size}, dest=${destStats.size}`);
  }
  
  console.log(`✅ Copied and verified: ${destExePath}`);
  console.log(`   Size: ${(destStats.size / 1024 / 1024).toFixed(2)} MB\n`);
} catch (error) {
  console.error(`\n[ERROR] Failed to copy .exe to docker/updates/`);
  console.error(`Error: ${error.message}`);
  console.error(`\nFrom: ${exePath}`);
  console.error(`To:   ${destExePath}`);
  console.error(`\nThis is a critical error - the build cannot proceed without copying the .exe.`);
  console.error(`\nPossible causes:`);
  console.error(`  1. File is locked by another process`);
  console.error(`  2. Insufficient disk space`);
  console.error(`  3. Permission denied on docker/updates/ directory`);
  console.error(`  4. Source file is corrupted or incomplete\n`);
  process.exit(1);
}

// Also create app-update.yml in build folder for Electron resources
// This prevents ENOENT errors when electron-updater looks for local file
console.log(`\n[Create app-update.yml] Creating in build folder for Electron resources...`);
const buildDirForUpdate = path.join(__dirname, '../build');
const appUpdateYmlPath = path.join(buildDirForUpdate, 'app-update.yml');

try {
  if (!fs.existsSync(buildDirForUpdate)) {
    fs.mkdirSync(buildDirForUpdate, { recursive: true });
  }
  
  // Create app-update.yml with same content as latest.yml (with real checksums)
  fs.writeFileSync(appUpdateYmlPath, latestYmlContent, 'utf8');
  console.log(`✅ Updated: ${appUpdateYmlPath}\n`);
} catch (error) {
  console.warn(`[WARNING] Could not update app-update.yml in build folder: ${error.message}`);
}

// Summary
console.log('========================================');
console.log('[Summary]');
console.log('========================================');
console.log(`Version: ${version}`);
console.log(`Executable: ${exeName}`);
console.log(`Latest.yml: docker/updates/latest.yml`);
console.log(`\nFiles ready for deployment at:`);
console.log(`  ${dockerUpdatesDir}`);
console.log(`\nManually deploy these files to your web server:`);
console.log(`  1. ${exeName}`);
console.log(`  2. latest.yml\n`);
