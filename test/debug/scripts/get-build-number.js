const fs = require('fs');
const path = require('path');

/**
 * Script untuk mendapatkan atau increment build number
 * Build number disimpan di .build-number file
 */

const BUILD_NUMBER_FILE = path.join(__dirname, '..', '.build-number');

function getBuildNumber() {
  let buildNumber = 1;
  
  if (fs.existsSync(BUILD_NUMBER_FILE)) {
    const content = fs.readFileSync(BUILD_NUMBER_FILE, 'utf8').trim();
    buildNumber = parseInt(content) || 1;
  }
  
  return buildNumber;
}

function incrementBuildNumber() {
  const currentBuild = getBuildNumber();
  const newBuild = currentBuild + 1;
  fs.writeFileSync(BUILD_NUMBER_FILE, newBuild.toString(), 'utf8');
  return newBuild;
}

// Jika dipanggil langsung, increment dan return build number
if (require.main === module) {
  const buildNumber = incrementBuildNumber();
  console.log(buildNumber);
  process.exit(0);
}

module.exports = { getBuildNumber, incrementBuildNumber };
