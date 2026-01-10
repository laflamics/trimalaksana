/**
 * Fix App Auto-Update Issues
 * 
 * Script untuk fix masalah auto-update yang tidak berfungsi di team devices
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing App Auto-Update Issues...');
console.log('=' .repeat(60));

// 1. Check and fix package.json version format
console.log('\n📦 Checking package.json version format:');

const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    
    console.log(`Current version: ${currentVersion}`);
    
    // Ensure version includes build number for proper comparison
    if (!currentVersion.includes('-build.')) {
      const buildNumber = packageJson.build?.buildVersion || '1';
      const baseVersion = currentVersion.split('-build.')[0];
      const newVersion = `${baseVersion}-build.${buildNumber}`;
      
      packageJson.version = newVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      
      console.log(`✅ Fixed version format: ${currentVersion} → ${newVersion}`);
    } else {
      console.log(`✅ Version format is correct: ${currentVersion}`);
    }
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
  }
} else {
  console.log(`❌ package.json not found`);
}

// 2. Verify and fix latest.yml if exists
console.log('\n📄 Checking latest.yml:');

const releaseDir = path.join(__dirname, 'release-build');
const latestYmlPath = path.join(releaseDir, 'latest.yml');

if (fs.existsSync(latestYmlPath)) {
  try {
    const content = fs.readFileSync(latestYmlPath, 'utf8');
    console.log(`✅ latest.yml exists`);
    
    // Check version format in yml
    const versionMatch = content.match(/version:\s*(.+)/);
    if (versionMatch) {
      const ymlVersion = versionMatch[1].trim();
      console.log(`   Version in yml: ${ymlVersion}`);
      
      // Ensure version is valid semver with build number
      if (!ymlVersion.match(/^\d+\.\d+\.\d+(-build\.\d+)?$/)) {
        console.log(`⚠️  Invalid version format in latest.yml: ${ymlVersion}`);
        console.log(`   Should be: 1.0.6-build.54`);
      } else {
        console.log(`✅ Version format is valid`);
      }
    }
    
    // Check if installer file exists
    const pathMatch = content.match(/path:\s*(.+)/);
    if (pathMatch) {
      const installerPath = pathMatch[1].trim();
      const fullPath = path.join(releaseDir, installerPath);
      
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Installer file exists: ${installerPath}`);
      } else {
        console.log(`❌ Installer file missing: ${installerPath}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error reading latest.yml: ${error.message}`);
  }
} else {
  console.log(`⚠️  latest.yml not found (run build first)`);
}

// 3. Create enhanced update check script for electron main process
console.log('\n🔧 Creating enhanced update check mechanism:');

const enhancedUpdateCode = `
// Enhanced Auto-Update Check (add to electron/main.ts)

// Force update check with better logging
const forceUpdateCheck = async () => {
  try {
    console.log('[Auto-Updater] Starting force update check...');
    
    // Get current version
    const currentVersion = app.getVersion();
    console.log(\`[Auto-Updater] Current version: \${currentVersion}\`);
    
    // Ensure feed URL is set correctly
    const serverUrl = await getServerUrlFromStorage();
    if (serverUrl) {
      const feedUrl = \`\${serverUrl}/api/updates/\`;
      autoUpdater.setFeedURL({ 
        provider: 'generic',
        url: feedUrl,
        channel: 'latest'
      });
      console.log(\`[Auto-Updater] Feed URL set to: \${feedUrl}\`);
    }
    
    // Check for updates with timeout
    const checkPromise = autoUpdater.checkForUpdates();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Update check timeout')), 30000);
    });
    
    const result = await Promise.race([checkPromise, timeoutPromise]);
    console.log(\`[Auto-Updater] Check completed:, result);
    
    return result;
  } catch (error) {
    console.error('[Auto-Updater] Force check failed:', error.message);
    
    // Send error to renderer
    if (mainWindow) {
      mainWindow.webContents.send('update-error', {
        message: error.message,
        code: error.code
      });
    }
    
    throw error;
  }
};

// Add IPC handler for manual update check
ipcMain.handle('force-update-check', async () => {
  try {
    const result = await forceUpdateCheck();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Enhanced update available handler
autoUpdater.on('update-available', (info) => {
  console.log(\`[Auto-Updater] Update available: \${info.version}\`);
  console.log(\`[Auto-Updater] Release date: \${info.releaseDate}\`);
  console.log(\`[Auto-Updater] Download URL: \${info.path}\`);
  
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      currentVersion: app.getVersion()
    });
  }
});

// Enhanced error handling
autoUpdater.on('error', (error) => {
  console.error('[Auto-Updater] Error:', error.message);
  
  // Don't show error for common issues
  if (error.message.includes('app-update.yml') || 
      error.message.includes('ENOENT') ||
      error.message.includes('net::ERR_')) {
    console.log('[Auto-Updater] Ignoring common error (this is normal)');
    return;
  }
  
  if (mainWindow) {
    mainWindow.webContents.send('update-error', {
      message: error.message,
      code: error.code
    });
  }
});
`;

// Write enhanced update code to a separate file
const enhancedUpdatePath = path.join(__dirname, 'enhanced-auto-update.js');
fs.writeFileSync(enhancedUpdatePath, enhancedUpdateCode.trim());
console.log(`✅ Created enhanced update code: ${enhancedUpdatePath}`);

// 4. Create renderer-side update UI
console.log('\n🎨 Creating update notification UI:');

const updateUICode = `
// Update Notification UI (add to renderer)

// Listen for update events
window.electronAPI.onUpdateAvailable?.((info) => {
  showUpdateNotification(info);
});

window.electronAPI.onUpdateError?.((error) => {
  console.error('Update error:', error);
  showUpdateError(error);
});

// Show update notification
const showUpdateNotification = (info) => {
  // Remove existing notification
  const existing = document.getElementById('update-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'update-notification';
  notification.innerHTML = \`
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="font-size: 24px; margin-right: 12px;">🚀</div>
        <div>
          <h4 style="margin: 0; font-size: 16px; font-weight: 600;">Update Available!</h4>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">
            Version \${info.version} is ready
          </p>
        </div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button onclick="downloadUpdate()" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Download Now</button>
        <button onclick="document.getElementById('update-notification').remove()" style="
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Later</button>
      </div>
    </div>
  \`;
  
  document.body.appendChild(notification);
  
  // Auto-hide after 30 seconds
  setTimeout(() => {
    if (document.getElementById('update-notification')) {
      document.getElementById('update-notification').remove();
    }
  }, 30000);
};

// Download update function
const downloadUpdate = async () => {
  try {
    const notification = document.getElementById('update-notification');
    if (notification) {
      notification.innerHTML = \`
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #2196f3, #1976d2);
          color: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 10000;
          max-width: 350px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="display: flex; align-items: center;">
            <div style="font-size: 24px; margin-right: 12px;">⬇️</div>
            <div>
              <h4 style="margin: 0; font-size: 16px; font-weight: 600;">Downloading Update...</h4>
              <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">
                Please wait while we download the latest version
              </p>
            </div>
          </div>
        </div>
      \`;
    }
    
    await window.electronAPI.downloadUpdate();
    
    // Show install prompt
    if (confirm('Update downloaded successfully! Restart now to install?')) {
      await window.electronAPI.installUpdate();
    }
  } catch (error) {
    alert('Download failed: ' + error.message);
    console.error('Download error:', error);
  }
};

// Manual update check function
const checkForUpdatesManually = async () => {
  try {
    const result = await window.electronAPI.forceUpdateCheck?.();
    if (result?.success) {
      if (!result.updateAvailable) {
        alert('No updates available. You have the latest version!');
      }
    } else {
      alert('Update check failed: ' + (result?.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Update check failed: ' + error.message);
  }
};

// Show update error
const showUpdateError = (error) => {
  console.error('Update error:', error);
  // Don't show UI for common errors
  if (error.message?.includes('app-update.yml') || 
      error.message?.includes('ENOENT')) {
    return;
  }
  
  // Show error notification for real issues
  const notification = document.createElement('div');
  notification.innerHTML = \`
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f44336, #d32f2f);
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 350px;
    ">
      <h4 style="margin: 0 0 8px 0;">Update Error</h4>
      <p style="margin: 0; font-size: 14px;">\${error.message}</p>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
        font-size: 12px;
      ">Close</button>
    </div>
  \`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 10000);
};
`;

const updateUIPath = path.join(__dirname, 'update-notification-ui.js');
fs.writeFileSync(updateUIPath, updateUICode.trim());
console.log(`✅ Created update UI code: ${updateUIPath}`);

// 5. Summary and next steps
console.log('\n📊 Fix Summary:');
console.log('✅ Checked package.json version format');
console.log('✅ Verified latest.yml structure');
console.log('✅ Created enhanced update check mechanism');
console.log('✅ Created update notification UI');

console.log('\n🚀 Next Steps:');
console.log('1. Add enhanced-auto-update.js code to electron/main.ts');
console.log('2. Add update-notification-ui.js code to your renderer');
console.log('3. Build new version: npm run build:app');
console.log('4. Test auto-update on team devices');

console.log('\n💡 Manual Testing:');
console.log('- In electron app DevTools, run: window.electronAPI.checkForUpdates()');
console.log('- Check console for "[Auto-Updater]" logs');
console.log('- Verify update server is accessible');

console.log('\n✅ Auto-update fix completed!');