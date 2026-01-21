const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Read build number
const buildNumberFile = path.join(__dirname, '../.build-number');
const buildNumber = fs.existsSync(buildNumberFile) ? fs.readFileSync(buildNumberFile, 'utf8') : '1';

// Create latest.yml for Windows updates
const latestYml = {
  version: packageJson.version,
  releaseDate: new Date().toISOString(),
  path: `Trima-Laksana-ERP-Setup-${packageJson.version}.exe`,
  sha2: '', // Will be filled by electron-builder
  buildNumber: buildNumber
};

// Save latest.yml
const latestYmlPath = path.join(__dirname, '../dist/latest.yml');
const yamlContent = Object.entries(latestYml)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n');

fs.writeFileSync(latestYmlPath, yamlContent);

console.log(`Generated latest.yml for version ${packageJson.version}`);
