const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RELEASE_DIR = path.join(__dirname, '..', 'release-build');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const version = packageJson.version;

// Find the installer exe file
const files = fs.readdirSync(RELEASE_DIR);
const installerFile = files.find(f => 
  f.endsWith('.exe') && 
  !f.includes('blockmap') &&
  !f.endsWith('.exe.patch') && // Exclude patch files from main installer search
  f.includes('PT.Trima Laksana Jaya Pratama')
);

if (!installerFile) {
  console.error('❌ Installer file not found in release directory');
  process.exit(1);
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
const patchFile = files.find(f => 
  f.endsWith('.exe.patch') &&
  f.includes('PT.Trima Laksana Jaya Pratama')
);

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
  
  console.log(`📦 Found patch file: ${patchFile} (${(patchStats.size / 1024 / 1024).toFixed(2)} MB)`);
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

const latestYml = `version: ${version}
files:
${filesSection}
path: ${installerFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

// Write latest.yml
const latestYmlPath = path.join(RELEASE_DIR, 'latest.yml');
fs.writeFileSync(latestYmlPath, latestYml, 'utf8');

console.log('✅ Generated latest.yml');
console.log(`   Version: ${version}`);
console.log(`   Installer: ${installerFile} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
if (patchFileInfo) {
  console.log(`   Patch: ${patchFileInfo.url} (${(patchFileInfo.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   💡 Users updating from previous version will download patch file only!`);
}
console.log(`   SHA512: ${sha512.substring(0, 16)}...`);

