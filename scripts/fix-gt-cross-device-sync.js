/**
 * Fix GT Cross-Device Sync Issue
 * Comprehensive fix for GT sales orders not syncing between devices
 */

const fs = require('fs');
const path = require('path');

// Helper functions
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'No timestamp';
  const date = new Date(timestamp);
  return date.toISOString() + ' (' + date.toLocaleString() + ')';
}

// Fix 1: Check and repair GT sales orders data structure
function fixGTSalesOrdersDataStructure() {
  console.log('🔧 FIX 1: Checking GT Sales Orders Data Structure\n');
  
  const filePath = 'data/localStorage/gt_salesOrders.json';
  const data = readJsonFile(filePath);
  
  if (!data) {
    console.log('❌ No GT sales orders file found');
    console.log('📝 Creating empty GT sales orders file...');
    
    const emptyData = {
      value: [],
      timestamp: Date.now(),
      _timestamp: Date.now(),
      lastUpdate: new Date().toISOString()
    };
    
    if (writeJsonFile(filePath, emptyData)) {
      console.log('✅ Empty GT sales orders file created');
    }
    return [];
  }
  
  let salesOrders = [];
  let needsRepair = false;
  
  // Check data structure
  if (Array.isArray(data)) {
    console.log('⚠️  Data is raw array, wrapping in proper structure...');
    salesOrders = data;
    needsRepair = true;
  } else if (data.value && Array.isArray(data.value)) {
    console.log('✅ Data structure is correct');
    salesOrders = data.value;
  } else {
    console.log('❌ Invalid data structure, resetting...');
    salesOrders = [];
    needsRepair = true;
  }
  
  // Check for deleted flags that might be hiding data
  let hiddenCount = 0;
  const visibleOrders = salesOrders.filter(so => {
    const isDeleted = so.deleted === true || so.deleted === 'true' || 
                     !!so.deletedAt || !!so.deletedTimestamp;
    if (isDeleted) hiddenCount++;
    return !isDeleted;
  });
  
  console.log(`📊 Total orders in file: ${salesOrders.length}`);
  console.log(`👁️  Visible orders: ${visibleOrders.length}`);
  console.log(`🗑️  Hidden (deleted) orders: ${hiddenCount}`);
  
  if (hiddenCount > 0) {
    console.log('\n⚠️  Some orders are marked as deleted and hidden from UI');
    console.log('   This might be why you\'re not seeing all data from device B');
    
    // Show deleted orders
    const deletedOrders = salesOrders.filter(so => 
      so.deleted === true || so.deleted === 'true' || 
      !!so.deletedAt || !!so.deletedTimestamp
    );
    
    console.log('\n🗑️  Deleted orders:');
    deletedOrders.forEach((so, index) => {
      console.log(`   ${index + 1}. ${so.soNo} - ${so.customer}`);
      console.log(`      Deleted: ${so.deleted}`);
      console.log(`      DeletedAt: ${so.deletedAt}`);
      console.log(`      DeletedTimestamp: ${so.deletedTimestamp}`);
    });
  }
  
  // Repair data structure if needed
  if (needsRepair) {
    const repairedData = {
      value: salesOrders,
      timestamp: Date.now(),
      _timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      repaired: true,
      repairedAt: new Date().toISOString()
    };
    
    if (writeJsonFile(filePath, repairedData)) {
      console.log('✅ Data structure repaired');
    }
  }
  
  return visibleOrders;
}

// Fix 2: Check storage configuration
function fixStorageConfiguration() {
  console.log('\n🔧 FIX 2: Checking Storage Configuration\n');
  
  const configPath = 'data/localStorage/storage_config.json';
  let config = readJsonFile(configPath);
  
  if (!config) {
    console.log('❌ No storage config found');
    console.log('📝 Creating default storage config...');
    
    config = {
      type: 'local',
      business: 'general-trading',
      created: new Date().toISOString()
    };
    
    if (writeJsonFile(configPath, config)) {
      console.log('✅ Default storage config created');
    }
  }
  
  console.log('📋 Current storage configuration:');
  console.log(`   Type: ${config.type || 'Not set'}`);
  console.log(`   Business: ${config.business || 'Not set'}`);
  console.log(`   Server URL: ${config.serverUrl || 'Not set'}`);
  
  // Check if server mode is configured but not working
  if (config.type === 'server' && !config.serverUrl) {
    console.log('⚠️  Server mode configured but no server URL set');
    console.log('🔧 This could cause sync issues');
  }
  
  // Recommend server mode for cross-device sync
  if (config.type === 'local') {
    console.log('\n💡 RECOMMENDATION: Switch to server mode for cross-device sync');
    console.log('   Current "local" mode only stores data locally');
    console.log('   Server mode enables data sharing between devices');
    
    // Create server mode config
    const serverConfig = {
      ...config,
      type: 'server',
      serverUrl: 'https://server-tljp.tail75a421.ts.net',
      business: 'general-trading',
      updated: new Date().toISOString()
    };
    
    const serverConfigPath = 'data/localStorage/storage_config_server.json';
    if (writeJsonFile(serverConfigPath, serverConfig)) {
      console.log(`✅ Server mode config created: ${serverConfigPath}`);
      console.log('   Copy this to both devices to enable cross-device sync');
    }
  }
  
  return config;
}

// Fix 3: Create GT sync status checker
function createGTSyncStatusChecker() {
  console.log('\n🔧 FIX 3: Creating GT Sync Status Checker\n');
  
  const checkerScript = `
/**
 * GT Sync Status Checker
 * Run this in browser console to check GT sync status
 */

// Check GT sync service status
function checkGTSyncStatus() {
  console.log('🔍 Checking GT Sync Status...');
  
  try {
    // Check if gtSync is available
    if (typeof gtSync !== 'undefined') {
      console.log('✅ GT Sync service is loaded');
      
      const status = gtSync.getSyncStatus();
      console.log('📊 Current sync status:', status);
      
      const queueStatus = gtSync.getQueueStatus();
      console.log('📋 Queue status:', queueStatus);
      
      // Force sync
      console.log('🚀 Forcing sync...');
      gtSync.forceSyncAll().then(() => {
        console.log('✅ Force sync completed');
        console.log('📊 New status:', gtSync.getSyncStatus());
      }).catch(error => {
        console.error('❌ Force sync failed:', error);
      });
      
    } else {
      console.error('❌ GT Sync service not found');
      console.log('💡 Try importing: import { gtSync } from "./src/services/gt-sync.ts"');
    }
  } catch (error) {
    console.error('❌ Error checking GT sync:', error);
  }
}

// Check storage data
function checkGTStorageData() {
  console.log('🔍 Checking GT Storage Data...');
  
  try {
    // Check localStorage directly
    const storageKeys = Object.keys(localStorage).filter(key => 
      key.includes('gt_') || key.includes('general-trading')
    );
    
    console.log('📂 GT-related localStorage keys:', storageKeys);
    
    storageKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.value && Array.isArray(data.value)) {
          console.log(\`📊 \${key}: \${data.value.length} items\`);
        } else if (Array.isArray(data)) {
          console.log(\`📊 \${key}: \${data.length} items\`);
        } else {
          console.log(\`📊 \${key}: \${typeof data}\`);
        }
      } catch (e) {
        console.log(\`📊 \${key}: Invalid JSON\`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

// Force reload GT sales orders
function forceReloadGTSalesOrders() {
  console.log('🔄 Force reloading GT Sales Orders...');
  
  try {
    // Trigger storage event to force reload
    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { 
        key: 'general-trading/gt_salesOrders',
        action: 'reload'
      }
    }));
    
    console.log('✅ Reload event dispatched');
    console.log('💡 Check GT Sales Orders page for updated data');
    
  } catch (error) {
    console.error('❌ Error forcing reload:', error);
  }
}

// Run all checks
console.log('🚀 GT Sync Diagnostic Started');
console.log('Run these functions in console:');
console.log('- checkGTSyncStatus()');
console.log('- checkGTStorageData()'); 
console.log('- forceReloadGTSalesOrders()');

// Auto-run basic checks
checkGTSyncStatus();
checkGTStorageData();
`;

  const checkerPath = 'gt-sync-status-checker.js';
  if (writeJsonFile(checkerPath, { script: checkerScript })) {
    console.log(`✅ GT sync status checker created: ${checkerPath}`);
    console.log('📋 Copy the script content and run in browser console');
  }
  
  // Also write as plain JS file
  fs.writeFileSync('gt-sync-checker-console.js', checkerScript);
  console.log('✅ Console script created: gt-sync-checker-console.js');
}

// Fix 4: Create data merge utility
function createDataMergeUtility() {
  console.log('\n🔧 FIX 4: Creating Data Merge Utility\n');
  
  const mergeScript = `
/**
 * GT Data Merge Utility
 * Merge GT sales orders from multiple sources
 */

// Merge GT sales orders from device B
function mergeGTSalesOrdersFromDeviceB(deviceBData) {
  console.log('🔄 Merging GT Sales Orders from Device B...');
  
  try {
    // Get current local data
    const currentKey = 'general-trading/gt_salesOrders';
    const currentData = JSON.parse(localStorage.getItem(currentKey) || '{"value":[]}');
    const currentOrders = currentData.value || [];
    
    console.log(\`📊 Current local orders: \${currentOrders.length}\`);
    console.log(\`📊 Device B orders: \${deviceBData.length}\`);
    
    // Merge data (avoid duplicates)
    const mergedOrders = [...currentOrders];
    let addedCount = 0;
    
    deviceBData.forEach(deviceBOrder => {
      const exists = currentOrders.some(localOrder => 
        localOrder.id === deviceBOrder.id || 
        localOrder.soNo === deviceBOrder.soNo
      );
      
      if (!exists) {
        mergedOrders.push(deviceBOrder);
        addedCount++;
        console.log(\`➕ Added: \${deviceBOrder.soNo} - \${deviceBOrder.customer}\`);
      }
    });
    
    // Save merged data
    const mergedData = {
      value: mergedOrders,
      timestamp: Date.now(),
      _timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      mergedFrom: 'device-b',
      mergedAt: new Date().toISOString()
    };
    
    localStorage.setItem(currentKey, JSON.stringify(mergedData));
    
    console.log(\`✅ Merge completed: \${addedCount} new orders added\`);
    console.log(\`📊 Total orders: \${mergedOrders.length}\`);
    
    // Trigger reload
    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { 
        key: currentKey,
        value: mergedOrders,
        action: 'merge'
      }
    }));
    
    return {
      success: true,
      added: addedCount,
      total: mergedOrders.length
    };
    
  } catch (error) {
    console.error('❌ Merge failed:', error);
    return { success: false, error: error.message };
  }
}

// Example usage:
// const deviceBData = [/* paste device B sales orders here */];
// mergeGTSalesOrdersFromDeviceB(deviceBData);
`;

  fs.writeFileSync('gt-data-merge-utility.js', mergeScript);
  console.log('✅ Data merge utility created: gt-data-merge-utility.js');
  console.log('📋 Use this to manually merge data from device B');
}

// Fix 5: Generate sync troubleshooting guide
function generateSyncTroubleshootingGuide() {
  console.log('\n🔧 FIX 5: Generating Sync Troubleshooting Guide\n');
  
  const guide = `
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
3. Run: \`checkGTSyncStatus()\`
4. Run: \`gtSync.forceSyncAll()\`
5. Wait for sync to complete
6. Verify data uploaded to server

#### On Your Device (missing data):
1. Open GT Sales Orders page  
2. Open browser console (F12)
3. Run: \`checkGTSyncStatus()\`
4. Run: \`gtSync.forceSyncAll()\`
5. Refresh the page
6. Check if new data appears

### Manual Data Transfer (if sync fails):

1. **Export from Device B:**
   - Console: \`JSON.stringify(localStorage.getItem('general-trading/gt_salesOrders'))\`
   - Copy the output

2. **Import to Your Device:**
   - Console: \`localStorage.setItem('general-trading/gt_salesOrders', 'PASTE_DATA_HERE')\`
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
`;

  fs.writeFileSync('GT-SYNC-TROUBLESHOOTING.md', guide);
  console.log('✅ Troubleshooting guide created: GT-SYNC-TROUBLESHOOTING.md');
}

// Main fix function
function runGTSyncFix() {
  console.log('🚀 GT CROSS-DEVICE SYNC FIX\n');
  console.log('This will diagnose and fix GT sync issues between devices.\n');
  console.log('=' .repeat(60));
  
  try {
    // Run all fixes
    const visibleOrders = fixGTSalesOrdersDataStructure();
    const config = fixStorageConfiguration();
    createGTSyncStatusChecker();
    createDataMergeUtility();
    generateSyncTroubleshootingGuide();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📋 FIX SUMMARY:');
    console.log('=' .repeat(60));
    
    console.log(`📊 Visible GT Sales Orders: ${visibleOrders.length}`);
    console.log(`⚙️  Storage Mode: ${config.type || 'Unknown'}`);
    console.log(`🌐 Server URL: ${config.serverUrl || 'Not configured'}`);
    
    console.log('\n🎯 NEXT STEPS:');
    
    if (visibleOrders.length <= 1) {
      console.log('❌ CONFIRMED: Very few sales orders found');
      console.log('   This confirms the cross-device sync issue');
      
      if (config.type === 'local') {
        console.log('\n🔧 CRITICAL: Switch to server mode');
        console.log('   1. Copy storage_config_server.json to both devices');
        console.log('   2. Rename to storage_config.json');
        console.log('   3. Restart both applications');
        console.log('   4. Force sync on both devices');
      } else {
        console.log('\n🔧 Server mode configured - check connectivity');
        console.log('   1. Test server URL in browser');
        console.log('   2. Run gt-sync-checker-console.js in browser');
        console.log('   3. Force sync on both devices');
      }
    } else {
      console.log('✅ Multiple sales orders found');
      console.log('   Sync might be working - check for hidden data');
    }
    
    console.log('\n📁 Files Created:');
    console.log('   - gt-sync-checker-console.js (run in browser)');
    console.log('   - gt-data-merge-utility.js (manual merge)');
    console.log('   - GT-SYNC-TROUBLESHOOTING.md (full guide)');
    console.log('   - storage_config_server.json (server config)');
    
    console.log('\n🚀 Run these files and follow the troubleshooting guide!');
    
  } catch (error) {
    console.error('❌ Fix process failed:', error);
  }
}

// Run the fix
runGTSyncFix();