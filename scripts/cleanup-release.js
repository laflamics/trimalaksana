const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const releaseDir = path.join(__dirname, '..', 'release');

/**
 * Kill processes that might be locking files in release directory
 */
function killLockingProcesses() {
  try {
    console.log('🔍 Checking for processes that might lock files...');
    
    // Kill Electron processes
    try {
      execSync('taskkill /F /IM electron.exe /T 2>nul', { stdio: 'ignore' });
    } catch (e) {
      // Ignore if process doesn't exist
    }
    
    // Kill app process
    try {
      execSync('taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T 2>nul', { stdio: 'ignore' });
    } catch (e) {
      // Ignore if process doesn't exist
    }
    
    // Kill processes that might have file handles open (using handle.exe if available, or PowerShell)
    try {
      // Try to close file handles using PowerShell (Windows 8+)
      execSync('powershell -NoProfile -Command "Get-Process | Where-Object {$_.Path -like \'*release*\'} | Stop-Process -Force -ErrorAction SilentlyContinue" 2>nul', { stdio: 'ignore' });
    } catch (e) {
      // Ignore if fails
    }
    
    // Wait a bit for processes to close
    setTimeout(() => {}, 2000);
    
    console.log('  ✓ Process check completed');
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Force unlock file by renaming it first (Windows trick)
 */
function forceUnlockFile(filePath) {
  try {
    // Try to rename file first (this sometimes unlocks it)
    const tempPath = filePath + '.old.' + Date.now();
    if (fs.existsSync(filePath)) {
      try {
        fs.renameSync(filePath, tempPath);
        // If rename succeeds, delete the temp file immediately
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch (e) {
          // If can't delete, try with PowerShell
          try {
            execSync(`powershell -Command "Remove-Item -Path '${tempPath.replace(/'/g, "''")}' -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
          } catch (e2) {
            // Ignore
          }
        }
        return true;
      } catch (e) {
        // Rename failed, try PowerShell to force delete
        try {
          execSync(`powershell -Command "Remove-Item -Path '${filePath.replace(/'/g, "''")}' -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
          return true;
        } catch (e2) {
          return false;
        }
      }
    }
  } catch (error) {
    return false;
  }
  return false;
}

/**
 * Force delete installer file using multiple methods
 */
function forceDeleteInstaller(filePath) {
  // Method 1: Normal delete
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (e) {
    // Continue to other methods
  }
  
  // Method 2: Rename then delete
  try {
    const tempPath = filePath + '.delete.' + Date.now();
    fs.renameSync(filePath, tempPath);
    fs.unlinkSync(tempPath);
    return true;
  } catch (e) {
    // Continue to other methods
  }
  
  // Method 3: PowerShell force delete
  try {
    execSync(`powershell -Command "Get-Item '${filePath.replace(/'/g, "''")}' | Remove-Item -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
    if (!fs.existsSync(filePath)) {
      return true;
    }
  } catch (e) {
    // Continue
  }
  
  // Method 4: CMD del with force
  try {
    execSync(`cmd /c "del /F /Q "${filePath}" 2>nul"`, { stdio: 'ignore' });
    if (!fs.existsSync(filePath)) {
      return true;
    }
  } catch (e) {
    // Continue
  }
  
  return false;
}

/**
 * Remove file or directory with retry mechanism
 */
function removeWithRetry(itemPath, isDirectory, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (isDirectory) {
        fs.rmSync(itemPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } else {
        fs.unlinkSync(itemPath);
      }
      return true;
    } catch (error) {
      if (i < retries - 1) {
        // Wait before retry
        const waitTime = (i + 1) * 500;
        console.log(`  ⚠ Retrying in ${waitTime}ms... (attempt ${i + 2}/${retries})`);
        try {
          require('child_process').execSync(`timeout /t ${waitTime / 1000} /nobreak >nul 2>&1`, { stdio: 'ignore' });
        } catch (e) {
          // Fallback if timeout doesn't work
          const start = Date.now();
          while (Date.now() - start < waitTime) {}
        }
        
        // Try to kill processes again before retry
        killLockingProcesses();
      } else {
        throw error;
      }
    }
  }
  return false;
}

/**
 * Cleanup release directory before build
 * Removes old build artifacts to ensure clean build
 */
function cleanupRelease() {
  try {
    if (fs.existsSync(releaseDir)) {
      console.log('🧹 Cleaning up release directory...');
      
      // Quick kill processes (no wait)
      try {
        execSync('taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T 2>nul', { stdio: 'ignore' });
      } catch (e) {}
      
      // Remove all files and directories in release folder
      const items = fs.readdirSync(releaseDir);
      
      // Prioritize deleting installer files first
      const installerFiles = items.filter(item => item.includes('Setup') && item.endsWith('.exe'));
      const otherItems = items.filter(item => !(item.includes('Setup') && item.endsWith('.exe')));
      
      // Delete installer files first with aggressive method (FAST - no retry)
      for (const item of installerFiles) {
        const itemPath = path.join(releaseDir, item);
        console.log(`  🎯 Force deleting installer: ${item}`);
        
        // Quick kill processes
        try {
          execSync('taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T 2>nul', { stdio: 'ignore' });
        } catch (e) {}
        
        // Try PowerShell delete (fastest method)
        try {
          execSync(`powershell -Command "Remove-Item -Path '${itemPath.replace(/'/g, "''")}' -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore', timeout: 2000 });
          if (!fs.existsSync(itemPath)) {
            console.log(`  ✓ Removed installer: ${item}`);
            continue;
          }
        } catch (e) {}
        
        // If still exists, skip (electron-builder will overwrite)
        if (fs.existsSync(itemPath)) {
          console.log(`  ⚠ Skipping locked installer: ${item} (will be overwritten)`);
        }
      }
      
      // Then delete other items
      for (const item of otherItems) {
        const itemPath = path.join(releaseDir, item);
        
        try {
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            if (removeWithRetry(itemPath, true)) {
              console.log(`  ✓ Removed directory: ${item}`);
            }
          } else {
            if (removeWithRetry(itemPath, false)) {
              console.log(`  ✓ Removed file: ${item}`);
            }
          }
        } catch (error) {
          if (error.code === 'EBUSY' || error.message.includes('locked')) {
            console.log(`  ⚠ Skipping locked item: ${item} (will be overwritten during build)`);
          } else {
            console.log(`  ⚠ Could not remove: ${item} - ${error.message}`);
          }
          // Continue with other items - build will overwrite locked files
        }
      }
      
      console.log('✅ Release directory cleaned successfully\n');
    } else {
      console.log('ℹ️  Release directory does not exist, skipping cleanup\n');
    }
  } catch (error) {
    console.error('❌ Error cleaning release directory:', error.message);
    // Don't fail the build if cleanup fails
    process.exit(0);
  }
}

// Skip cleanup if SKIP_CLEANUP env var is set
if (process.env.SKIP_CLEANUP !== 'true') {
  cleanupRelease();
} else {
  console.log('⏭️  Skipping cleanup (SKIP_CLEANUP=true)\n');
}
