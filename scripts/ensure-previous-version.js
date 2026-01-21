const fs = require('fs');
const path = require('path');

// Ensure previous version exists for update mechanism
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const versionInfo = {
  version: packageJson.version,
  buildDate: new Date().toISOString(),
  buildNumber: packageJson.version.match(/build\.(\d+)$/)?.[1] || '1'
};

// Save version info
const versionInfoPath = path.join(__dirname, '../dist/version.json');
const distPath = path.dirname(versionInfoPath);

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

fs.writeFileSync(versionInfoPath, JSON.stringify(versionInfo, null, 2));
console.log(`Version info saved: ${versionInfo.version}`);
