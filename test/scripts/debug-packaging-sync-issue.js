/**
 * Debug Packaging Sync Issue
 * Check why packaging data isn't syncing to other devices
 */

const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function checkPackagingData() {
  console.log('🔍 DEBUGGING PACKAGING SYNC ISSUE');
  console.log('='.repeat(60));
  
  // Check localStorage data
  console.log('\n📁 CHECKING LOCAL STORAGE DATA:');
  
  const packagingKeys = [
    'products',
    'materials', 
    'salesOrders',
    'customers',
    'suppliers',
    'userAccessControl'
  ];
  
  const localStorageData = {};
  
  packagingKeys.forEach(key => {
    const filePath = `data/localStorage/${key}.json`;
    const data = readJsonFile(filePath);
    
    if (data) {
      // Check if it's wrapped format
      let actualData = data;
      if (data.value !== undefined) {
        actualData = data.value;
      }
      
      const count = Array.isArray(actualData) ? actualData.length : 0;
      console.log(`  ✅ ${key}: ${count} items`);
      
      // Check sync metadata
      if (data.timestamp || data._timestamp) {
        console.log(`     📅 Timestamp: ${data.timestamp || data._timestamp}`);
      }
      if (data.synced !== undefined) {
        console.log(`     🔄 Synced: ${data.synced}`);
      }
      if (data.deviceId) {
        console.log(`     📱 Device ID: ${data.deviceId}`);
      }
      
      localStorageData[key] = {
        count,
        synced: data.synced,
        timestamp: data.timestamp || data._timestamp,
        deviceId: data.deviceId
      };
    } else {
      console.log(`  ❌ ${key}: File not found`);
      localStorageData[key] = { count: 0, exists: false };
    }
  });
  
  // Check server data (gt.json)
  console.log('\n📁 CHECKING SERVER DATA (gt.json):');
  const serverData = readJsonFile('data/gt.json/gt.json');
  
  if (serverData) {
    console.log('  ✅ Server file exists');
    console.log('  📊 Server data structure:');
    
    Object.keys(serverData).forEach(key => {
      const value = serverData[key];
      if (Array.isArray(value)) {
        console.log(`     - ${key}: ${value.length} items`);
      } else if (typeof value === 'object' && value !== null) {
        if (value.value && Array.isArray(value.value)) {
          console.log(`     - ${key}: ${value.value.length} items (wrapped)`);
        } else {
          console.log(`     - ${key}: object with ${Object.keys(value).length} properties`);
        }
      } else {
        console.log(`     - ${key}: ${typeof value}`);
      }
    });
  } else {
    console.log('  ❌ Server file not found');
  }
  
  // Check storage config
  console.log('\n⚙️  CHECKING STORAGE CONFIG:');
  const storageConfigPath = 'data/localStorage/storage_config.json';
  const storageConfig = readJsonFile(storageConfigPath);
  
  if (storageConfig) {
    console.log(`  ✅ Storage config found:`);
    console.log(`     Type: ${storageConfig.type || 'unknown'}`);
    console.log(`     Server URL: ${storageConfig.serverUrl || 'not set'}`);
  } else {
    console.log('  ❌ Storage config not found');
  }
  
  // Check device ID
  console.log('\n📱 CHECKING DEVICE ID:');
  const deviceIdPath = 'data/localStorage/device_id.json';
  const deviceId = readJsonFile(deviceIdPath);
  
  if (deviceId) {
    console.log(`  ✅ Device ID: ${deviceId}`);
  } else {
    console.log('  ❌ Device ID not found');
  }
  
  // Analysis
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SYNC ISSUE ANALYSIS');
  console.log('='.repeat(60));
  
  // Check if data exists but not synced
  const unsyncedData = Object.entries(localStorageData).filter(([key, data]) => 
    data.count > 0 && data.synced === false
  );
  
  if (unsyncedData.length > 0) {
    console.log('\n⚠️  UNSYNCED DATA DETECTED:');
    unsyncedData.forEach(([key, data]) => {
      console.log(`  - ${key}: ${data.count} items, synced: ${data.synced}`);
      console.log(`    Device: ${data.deviceId || 'unknown'}`);
      console.log(`    Timestamp: ${data.timestamp || 'unknown'}`);
    });
  }
  
  // Check if server has packaging data
  const serverHasPackagingData = serverData && Object.keys(serverData).some(key => 
    packagingKeys.includes(key) || key.startsWith('packaging_')
  );
  
  if (!serverHasPackagingData) {
    console.log('\n❌ SERVER MISSING PACKAGING DATA:');
    console.log('   Server (gt.json) does not contain packaging data');
    console.log('   This explains why other devices cannot sync packaging data');
  }
  
  // Check sync service configuration
  console.log('\n🔧 SYNC SERVICE STATUS:');
  if (!storageConfig || storageConfig.type === 'local') {
    console.log('   ⚠️  Storage configured for LOCAL mode');
    console.log('   💡 This means no server sync will occur');
    console.log('   🔧 Need to configure server mode for cross-device sync');
  } else if (storageConfig.type === 'server') {
    console.log('   ✅ Storage configured for SERVER mode');
    if (storageConfig.serverUrl) {
      console.log(`   🌐 Server URL: ${storageConfig.serverUrl}`);
    } else {
      console.log('   ❌ Server URL not configured');
    }
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (!storageConfig || storageConfig.type === 'local') {
    console.log('   1. Configure storage for server mode');
    console.log('   2. Set proper server URL in storage config');
  }
  
  if (unsyncedData.length > 0) {
    console.log('   3. Force sync unsynced data to server');
    console.log('   4. Check packaging-sync service is running');
  }
  
  if (!serverHasPackagingData) {
    console.log('   5. Upload packaging data to server');
    console.log('   6. Verify server API endpoints for packaging data');
  }
  
  console.log('\n🏁 Debug completed at:', new Date().toLocaleString());
  
  return {
    localStorageData,
    serverData: serverData ? Object.keys(serverData) : [],
    storageConfig,
    unsyncedCount: unsyncedData.length,
    serverHasPackagingData
  };
}

// Run the debug
checkPackagingData();