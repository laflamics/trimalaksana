#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n[Pre-Build] Generating app-update.yml for Electron resources...\n');

const buildDir = path.join(__dirname, '../build');
const appUpdateYmlPath = path.join(buildDir, 'app-update.yml');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
  console.log(`[Pre-Build] Created build directory: ${buildDir}`);
}

// Read package.json to get version
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`[Pre-Build] Version: ${version}`);

// Create a minimal app-update.yml
// This file will be updated with real checksums after build
const appUpdateYmlContent = `version: ${version}
files:
  - url: PT.Trima%20Laksana%20Jaya%20Pratama%20Setup%20${version}.exe
    sha512: ''
    size: 0
    blockMapSize: 0
path: PT.Trima%20Laksana%20Jaya%20Pratama%20Setup%20${version}.exe
sha512: ''
releaseDate: '${new Date().toISOString()}'
`;

try {
  fs.writeFileSync(appUpdateYmlPath, appUpdateYmlContent, 'utf8');
  console.log(`✅ Created: ${appUpdateYmlPath}`);
  console.log(`   This file will be updated with real checksums after build\n`);
} catch (error) {
  console.error(`❌ Failed to create app-update.yml: ${error.message}`);
  process.exit(1);
}
