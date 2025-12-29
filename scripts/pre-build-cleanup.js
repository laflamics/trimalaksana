const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const releaseDir = path.join(__dirname, '..', 'release-build');

console.log('🧹 Pre-build cleanup: Killing processes and cleaning files...\n');

// 1. Kill semua proses yang mungkin lock file
async function killAllProcesses() {
  console.log('🔪 Killing processes...');
  const processes = [
    'PT.Trima Laksana Jaya Pratama.exe',
    'electron.exe'
  ];
  
  // Jangan kill node.exe karena bisa kill proses build sendiri
  const killPromises = processes.map(proc => {
    return new Promise((resolve) => {
      try {
        const procSpawn = spawn('taskkill', ['/F', '/IM', proc, '/T'], {
          stdio: 'ignore',
          windowsHide: true,
          detached: false
        });
        
        // Timeout cepat - 500ms max
        const timeout = setTimeout(() => {
          try {
            procSpawn.kill();
          } catch (e) {}
          resolve();
        }, 500);
        
        procSpawn.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        procSpawn.on('error', () => {
          clearTimeout(timeout);
          resolve();
        });
      } catch (e) {
        resolve();
      }
    });
  });
  
  // Wait semua kill commands selesai (max 500ms per process)
  await Promise.all(killPromises);
  
  // Wait singkat untuk proses benar-benar close
  await new Promise(resolve => setTimeout(resolve, 200));
  
  console.log('  ✓ Processes killed\n');
}

// 2. Hapus file installer dengan cara yang sangat agresif
function deleteInstallerFiles() {
  if (!fs.existsSync(releaseDir)) {
    console.log('  ℹ️  Release directory does not exist\n');
    return;
  }
  
  console.log('🗑️  Deleting installer files...');
  
  try {
    const files = fs.readdirSync(releaseDir);
    const installerFiles = files.filter(f => 
      (f.includes('Setup') || f.includes('installer')) && f.endsWith('.exe')
    );
    
    for (const file of installerFiles) {
      const filePath = path.join(releaseDir, file);
      console.log(`  🎯 Deleting: ${file}`);
      
      // Method 1: PowerShell (paling powerful)
      try {
        execSync(`powershell -Command "$f='${filePath.replace(/'/g, "''")}'; if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500 }"`, {
          stdio: 'ignore',
          timeout: 3000
        });
        if (!fs.existsSync(filePath)) {
          console.log(`    ✓ Deleted: ${file}`);
          continue;
        }
      } catch (e) {}
      
      // Method 2: CMD del dengan force
      try {
        execSync(`cmd /c "del /F /Q "${filePath}" 2>nul"`, {
          stdio: 'ignore',
          timeout: 2000
        });
        if (!fs.existsSync(filePath)) {
          console.log(`    ✓ Deleted: ${file}`);
          continue;
        }
      } catch (e) {}
      
      // Method 3: Rename dulu, baru delete
      try {
        const tempPath = filePath + '.tmp.' + Date.now();
        fs.renameSync(filePath, tempPath);
        setTimeout(() => {
          try {
            execSync(`powershell -Command "Remove-Item -Path '${tempPath.replace(/'/g, "''")}' -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
          } catch (e) {}
        }, 100);
        console.log(`    ⚠ Renamed (will delete later): ${file}`);
      } catch (e) {
        console.log(`    ⚠ Could not delete: ${file} (will be overwritten)`);
      }
    }
  } catch (error) {
    console.log(`  ⚠ Error: ${error.message}`);
  }
  
  console.log('  ✓ Cleanup completed\n');
}

// 3. Hapus folder yang mungkin lock
function deleteLockedFolders() {
  if (!fs.existsSync(releaseDir)) {
    return;
  }
  
  console.log('📁 Cleaning locked folders...');
  
  try {
    const items = fs.readdirSync(releaseDir);
    for (const item of items) {
      const itemPath = path.join(releaseDir, item);
      try {
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          // Skip jika folder besar (mungkin masih diperlukan)
          if (item.includes('win-unpacked') || item.includes('win-x64')) {
            continue;
          }
          
          try {
            execSync(`powershell -Command "Remove-Item -Path '${itemPath.replace(/'/g, "''")}' -Recurse -Force -ErrorAction SilentlyContinue"`, {
              stdio: 'ignore',
              timeout: 2000
            });
            console.log(`  ✓ Removed folder: ${item}`);
          } catch (e) {
            console.log(`  ⚠ Could not remove folder: ${item}`);
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  } catch (error) {
    // Ignore
  }
  
  console.log('  ✓ Folder cleanup completed\n');
}

// Main execution
(async () => {
  try {
    await killAllProcesses();
    deleteInstallerFiles();
    deleteLockedFolders();
    console.log('✅ Pre-build cleanup completed successfully!\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    // Don't fail the build
  }
  process.exit(0);
})();

