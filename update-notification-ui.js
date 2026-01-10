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
  notification.innerHTML = `
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
            Version ${info.version} is ready
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
  `;
  
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
      notification.innerHTML = `
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
      `;
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
  notification.innerHTML = `
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
      <p style="margin: 0; font-size: 14px;">${error.message}</p>
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
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 10000);
};