// Enhanced Auto-Update Check (add to electron/main.ts)

// Force update check with better logging
const forceUpdateCheck = async () => {
  try {
    console.log('[Auto-Updater] Starting force update check...');
    
    // Get current version
    const currentVersion = app.getVersion();
    console.log(`[Auto-Updater] Current version: ${currentVersion}`);
    
    // Ensure feed URL is set correctly
    const serverUrl = await getServerUrlFromStorage();
    if (serverUrl) {
      const feedUrl = `${serverUrl}/api/updates/`;
      autoUpdater.setFeedURL({ 
        provider: 'generic',
        url: feedUrl,
        channel: 'latest'
      });
      console.log(`[Auto-Updater] Feed URL set to: ${feedUrl}`);
    }
    
    // Check for updates with timeout
    const checkPromise = autoUpdater.checkForUpdates();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Update check timeout')), 30000);
    });
    
    const result = await Promise.race([checkPromise, timeoutPromise]);
    console.log(`[Auto-Updater] Check completed:, result);
    
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
  console.log(`[Auto-Updater] Update available: ${info.version}`);
  console.log(`[Auto-Updater] Release date: ${info.releaseDate}`);
  console.log(`[Auto-Updater] Download URL: ${info.path}`);
  
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