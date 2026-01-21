const fs = require('fs');
const path = require('path');

// Clean dist folders
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
  console.log('Cleaned dist folder');
}

// Clean build folders
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
  fs.rmSync(buildPath, { recursive: true, force: true });
  console.log('Cleaned build folder');
}

console.log('Pre-build cleanup completed');
