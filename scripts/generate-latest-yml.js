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
const versionWithBuild = `${version}-build.${buildNumber}`;

// Find the installer exe file
const files = fs.readdirSync(RELEASE_DIR);
// Lebih fleksibel: cari semua .exe yang bukan blockmap atau patch
let installerFile = files.find(f => 
  f.endsWith('.exe') && 
  !f.includes('blockmap') &&
  !f.endsWith('.exe.patch') &&
  f.includes('PT.Trima Laksana Jaya Pratama')
);

// Fallback: cari .exe apapun yang bukan blockmap atau patch
if (!installerFile) {
  installerFile = files.find(f => 
    f.endsWith('.exe') && 
    !f.includes('blockmap') &&
    !f.endsWith('.exe.patch')
  );
}

if (!installerFile) {
  console.error(`⚠️  Installer .exe file not found in ${RELEASE_DIR}`);
  console.error(`   Available files: ${files.filter(f => f.endsWith('.exe')).join(', ') || 'none'}`);
  process.exit(0);
}

const installerPath = path.join(RELEASE_DIR, installerFile);
const stats = fs.statSync(installerPath);
const fileSize = stats.size;

// Calculate SHA512 hash for main installer
const fileBuffer = fs.readFileSync(installerPath);
const hashSum = crypto.createHash('sha512');
hashSum.update(fileBuffer);
const sha512 = hashSum.digest('hex');

// Find patch file if exists (for differential updates)
let patchFile = files.find(f => 
  f.endsWith('.exe.patch') &&
  f.includes('PT.Trima Laksana Jaya Pratama')
);

// Fallback: cari patch file apapun
if (!patchFile) {
  patchFile = files.find(f => f.endsWith('.exe.patch'));
}

let patchFileInfo = null;
if (patchFile) {
  const patchPath = path.join(RELEASE_DIR, patchFile);
  const patchStats = fs.statSync(patchPath);
  const patchBuffer = fs.readFileSync(patchPath);
  const patchHashSum = crypto.createHash('sha512');
  patchHashSum.update(patchBuffer);
  const patchSha512 = patchHashSum.digest('hex');
  
  patchFileInfo = {
    url: patchFile,
    sha512: patchSha512,
    size: patchStats.size
  };
}

// Generate latest.yml content with patch file support
let filesSection = `  - url: ${installerFile}
    sha512: ${sha512}
    size: ${fileSize}`;

if (patchFileInfo) {
  filesSection += `
  - url: ${patchFileInfo.url}
    sha512: ${patchFileInfo.sha512}
    size: ${patchFileInfo.size}`;
}

const latestYml = `version: ${versionWithBuild}
files:
${filesSection}
path: ${installerFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

// Write latest.yml
const latestYmlPath = path.join(RELEASE_DIR, 'latest.yml');
fs.writeFileSync(latestYmlPath, latestYml, 'utf8');

