const fs = require('fs');
const path = require('path');

// Read current build number
const buildNumberFile = path.join(__dirname, '../.build-number');
let buildNumber = 1;

if (fs.existsSync(buildNumberFile)) {
  buildNumber = parseInt(fs.readFileSync(buildNumberFile, 'utf8')) || 1;
}

// Increment build number
buildNumber++;

// Save new build number
fs.writeFileSync(buildNumberFile, buildNumber.toString());

// Update package.json version
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Extract current version and build number
const versionMatch = packageJson.version.match(/^(.*?)-build\.(.*?)$/);
if (versionMatch) {
  const baseVersion = versionMatch[1];
  packageJson.version = `${baseVersion}-build.${buildNumber}`;
} else {
  packageJson.version = `${packageJson.version}-build.${buildNumber}`;
}

// Save updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log(`Build version updated to: ${packageJson.version}`);
console.log(`Build number: ${buildNumber}`);
