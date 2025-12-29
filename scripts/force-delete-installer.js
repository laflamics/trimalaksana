const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const releaseDir = path.join(__dirname, '..', 'release');

// Find and delete installer files aggressively
function forceDeleteInstaller() {
  try {
    if (!fs.existsSync(releaseDir)) {
      return;
    }

    const files = fs.readdirSync(releaseDir);
    const installerFiles = files.filter(f => f.includes('Setup') && f.endsWith('.exe'));

    for (const file of installerFiles) {
      const filePath = path.join(releaseDir, file);
      console.log(`🗑️  Force deleting: ${file}`);

      // Method 1: PowerShell (fastest)
      try {
        execSync(`powershell -Command "Remove-Item -Path '${filePath.replace(/'/g, "''")}' -Force -ErrorAction SilentlyContinue"`, { 
          stdio: 'ignore', 
          timeout: 1000 
        });
        if (!fs.existsSync(filePath)) {
          console.log(`  ✓ Deleted: ${file}`);
          continue;
        }
      } catch (e) {}

      // Method 2: CMD del
      try {
        execSync(`cmd /c "del /F /Q "${filePath}" 2>nul"`, { stdio: 'ignore', timeout: 1000 });
        if (!fs.existsSync(filePath)) {
          console.log(`  ✓ Deleted: ${file}`);
          continue;
        }
      } catch (e) {}

      // Method 3: Rename then delete
      try {
        const tempPath = filePath + '.tmp.' + Date.now();
        fs.renameSync(filePath, tempPath);
        setTimeout(() => {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {}
        }, 100);
        console.log(`  ⚠ Renamed (will delete later): ${file}`);
      } catch (e) {
        console.log(`  ⚠ Could not delete: ${file} (electron-builder will overwrite)`);
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

// Kill processes first
try {
  execSync('taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T 2>nul', { stdio: 'ignore' });
} catch (e) {}

forceDeleteInstaller();

