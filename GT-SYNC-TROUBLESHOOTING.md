
# GT Cross-Device Sync Troubleshooting Guide

## Problem: GT Sales Orders from Device B not syncing to your device

### Immediate Checks:

1. **Check Storage Configuration**
   - Both devices must use the same storage config
   - File: data/localStorage/storage_config.json
   - Should have: { "type": "server", "serverUrl": "..." }

2. **Check GT Sync Service**
   - Open browser console on both devices
   - Run: gtSync.getSyncStatus()
   - Should show "synced" (green) or "syncing"

3. **Check Network Connectivity**
   - Both devices must reach the same server
   - Test server URL in browser
   - Check firewall/network settings

### Step-by-Step Fix:

#### On Device B (the one with more data):
1. Open GT Sales Orders page
2. Open browser console (F12)
3. Run: `checkGTSyncStatus()`
4. Run: `gtSync.forceSyncAll()`
5. Wait for sync to complete
6. Verify data uploaded to server

#### On Your Device (missing data):
1. Open GT Sales Orders page  
2. Open browser console (F12)
3. Run: `checkGTSyncStatus()`
4. Run: `gtSync.forceSyncAll()`
5. Refresh the page
6. Check if new data appears

### Manual Data Transfer (if sync fails):

1. **Export from Device B:**
   - Console: `JSON.stringify(localStorage.getItem('general-trading/gt_salesOrders'))`
   - Copy the output

2. **Import to Your Device:**
   - Console: `localStorage.setItem('general-trading/gt_salesOrders', 'PASTE_DATA_HERE')`
   - Refresh GT Sales Orders page

### Common Issues:

- **Different server URLs**: Check storage_config.json on both devices
- **Local mode**: Switch to server mode for cross-device sync
- **Deleted flags**: Data might be hidden by tombstone deletion
- **Network issues**: Check server connectivity
- **Cache issues**: Clear browser cache and reload

### Files to Check:
- data/localStorage/storage_config.json
- data/localStorage/gt_salesOrders.json
- Browser console for sync errors
- Network tab for server requests

### Contact Support:
If issues persist, provide:
1. Storage config from both devices
2. Browser console errors
3. Network connectivity test results
4. GT sync status from both devices
