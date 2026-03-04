#!/usr/bin/env node

/**
 * Generate latest-mac.yml for macOS auto-updates
 * This script creates the manifest file for electron-updater
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

// Release build directory
const releaseDir = path.join(__dirname, '../release-build');

// Find DMG file
const files = fs.readdirSync(releaseDir);
const dmgFile = files.find(f => f.endsWith('.dmg'));

if (!dmgFile) {
  console.error('❌ Error: No DMG file found in release-build/');
  process.exit(1);
}

const dmgPath = path.join(releaseDir, dmgFile);
const dmgStats = fs.statSync(dmgPath);
const dmgSize = dmgStats.size;

// Calculate SHA512 hash
console.log('📊 Calculating SHA512 hash...');
const fileBuffer = fs.readFileSync(dmgPath);
const hashSum = crypto.createHash('sha512');
hashSum.update(fileBuffer);
const sha512 = hashSum.digest('hex');

// Create latest-mac.yml
const latestMacYml = {
  version: version,
  files: [
    {
      url: dmgFile,
      sha512: sha512,
      size: dmgSize,
    },
  ],
  path: dmgFile,
  sha512: sha512,
  releaseDate: new Date().toISOString(),
};

// Write to file
const ymlPath = path.join(releaseDir, 'latest-mac.yml');
const ymlContent = `version: ${version}
files:
  - url: ${dmgFile}
    sha512: ${sha512}
    size: ${dmgSize}
path: ${dmgFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

fs.writeFileSync(ymlPath, ymlContent);

console.log('✅ Generated latest-mac.yml');
console.log(`   Version: ${version}`);
console.log(`   File: ${dmgFile}`);
console.log(`   Size: ${(dmgSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`   SHA512: ${sha512.substring(0, 32)}...`);
console.log(`   Path: ${ymlPath}`);
