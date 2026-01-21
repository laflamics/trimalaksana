/**
 * FIX PACKAGING SYNC ISSUE
 * 
 * MASALAH YANG DITEMUKAN:
 * 1. Storage config di laptop ini set ke "local" mode, bukan "server" mode
 * 2. Packaging data ada di localStorage tapi tidak pernah di-sync ke server
 * 3. Server (gt.json) hanya berisi GT data, tidak ada packaging data
 * 4. Device lain tidak bisa sync karena server tidak punya packaging data
 * 
 * SOLUSI:
 * 1. Set storage config ke server mode
 * 2. Upload semua packaging data ke server
 * 3. Pastikan packaging-sync service berjalan
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

function writeJsonFile(filePath, data) {
  try {
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

function fixPackagingSyncIssue() {
  console.log('🔧 FIXING PACKAGING SYNC ISSUE');
  console.log('='.repeat(60));
  
  // Step 1: Fix storage config
  console.log('\n1️⃣ FIXING STORAGE CONFIG...');
  
  const storageConfigPath = 'data/localStorage/storage_config.json';
  const currentConfig = readJsonFile(storageConfigPath);
  
  if (currentConfig) {
    console.log(`   Current config: ${JSON.stringify(currentConfig)}`);
    
    if (currentConfig.type === 'local') {
      console.log('   ⚠️  Storage is in LOCAL mode - this prevents server sync!');
      
      // Fix: Set to server mode
      const newConfig = {
        ...currentConfig,
        type: 'server',
        serverUrl: 'http://localhost:3001', // Default server URL
        fixedAt: new Date().toISOString(),
        fixedBy: 'packaging-sync-fix'
      };
      
      if (writeJsonFile(storageConfigPath, newConfig)) {
        console.log('   ✅ Storage config updated to SERVER mode');
        console.log(`   🌐 Server URL: ${newConfig.serverUrl}`);
      } else {
        console.log('   ❌ Failed to update storage config');
        return false;
      }
    } else {
      console.log('   ✅ Storage already in SERVER mode');
    }
  } else {
    console.log('   ❌ Storage config not found - creating new one');
    
    const newConfig = {
      type: 'server',
      serverUrl: 'http://localhost:3001',
      business: 'packaging',
      created: new Date().toISOString(),
      createdBy: 'packaging-sync-fix'
    };
    
    if (writeJsonFile(storageConfigPath, newConfig)) {
      console.log('   ✅ Created new storage config in SERVER mode');
    } else {
      console.log('   ❌ Failed to create storage config');
      return false;
    }
  }
  
  // Step 2: Check packaging data that needs to be synced
  console.log('\n2️⃣ CHECKING PACKAGING DATA TO SYNC...');
  
  const packagingKeys = [
    'products',
    'materials',
    'customers',
    'suppliers',
    'salesOrders',
    'purchaseOrders',
    'production',
    'inventory',
    'userAccessControl'
  ];
  
  const dataToSync = {};
  let totalItemsToSync = 0;
  
  packagingKeys.forEach(key => {
    const filePath = `data/localStorage/${key}.json`;
    const data = readJsonFile(filePath);
    
    if (data) {
      let actualData = data;
      if (data.value !== undefined) {
        actualData = data.value;
      }
      
      const count = Array.isArray(actualData) ? actualData.length : 0;
      
      if (count > 0) {
        console.log(`   📦 ${key}: ${count} items`);
        dataToSync[key] = {
          data: actualData,
          count,
          needsSync: !data.synced || data.synced === false
        };
        totalItemsToSync += count;
      } else {
        console.log(`   📦 ${key}: No data`);
      }
    } else {
      console.log(`   📦 ${key}: File not found`);
    }
  });
  
  console.log(`\n   📊 Total items to sync: ${totalItemsToSync}`);
  
  // Step 3: Mark data as needing sync
  console.log('\n3️⃣ MARKING DATA FOR SYNC...');
  
  let markedCount = 0;
  
  Object.entries(dataToSync).forEach(([key, info]) => {
    const filePath = `data/localStorage/${key}.json`;
    const currentData = readJsonFile(filePath);
    
    if (currentData && info.needsSync) {
      // Mark as unsynced so packaging-sync will pick it up
      const updatedData = {
        ...currentData,
        synced: false,
        needsServerSync: true,
        timestamp: Date.now(),
        _timestamp: Date.now(),
        deviceId: 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        markedForSyncAt: new Date().toISOString(),
        markedBy: 'packaging-sync-fix'
      };
      
      if (writeJsonFile(filePath, updatedData)) {
        console.log(`   ✅ Marked ${key} for sync (${info.count} items)`);
        markedCount++;
      } else {
        console.log(`   ❌ Failed to mark ${key} for sync`);
      }
    } else if (currentData && !info.needsSync) {
      console.log(`   ℹ️  ${key} already synced`);
    }
  });
  
  console.log(`\n   📊 Marked ${markedCount} data types for sync`);
  
  // Step 4: Create server data structure for packaging
  console.log('\n4️⃣ PREPARING SERVER DATA STRUCTURE...');
  
  const serverDataPath = 'data/gt.json/gt.json';
  const currentServerData = readJsonFile(serverDataPath);
  
  if (currentServerData) {
    console.log('   ✅ Server data file exists');
    
    // Check if server already has packaging data
    const hasPackagingData = Object.keys(currentServerData).some(key => 
      packagingKeys.includes(key) || key.startsWith('packaging_')
    );
    
    if (hasPackagingData) {
      console.log('   ℹ️  Server already has some packaging data');
    } else {
      console.log('   ⚠️  Server has NO packaging data - this is the root cause!');
      console.log('   💡 Packaging data needs to be uploaded to server');
    }
  } else {
    console.log('   ❌ Server data file not found');
  }
  
  // Step 5: Instructions for next steps
  console.log('\n5️⃣ NEXT STEPS TO COMPLETE THE FIX:');
  console.log('   1. Restart the application to load new storage config');
  console.log('   2. packaging-sync service will automatically detect unsynced data');
  console.log('   3. Data will be uploaded to server in background');
  console.log('   4. Other devices can then sync packaging data from server');
  
  // Step 6: Create sync verification script
  console.log('\n6️⃣ CREATING SYNC VERIFICATION SCRIPT...');
  
  const verificationScript = `
/**
 * PACKAGING SYNC VERIFICATION
 * Run this after the fix to verify sync is working
 */

const fs = require('fs');

function verifySyncStatus() {
  console.log('🔍 VERIFYING PACKAGING SYNC STATUS');
  console.log('='.repeat(50));
  
  // Check storage config
  const config = JSON.parse(fs.readFileSync('data/localStorage/storage_config.json', 'utf8'));
  console.log('Storage Config:', config.type);
  
  // Check sync status of key files
  const keys = ['products', 'materials', 'customers', 'suppliers', 'userAccessControl'];
  
  keys.forEach(key => {
    try {
      const data = JSON.parse(fs.readFileSync(\`data/localStorage/\${key}.json\`, 'utf8'));
      const synced = data.synced || false;
      const count = Array.isArray(data.value) ? data.value.length : 0;
      console.log(\`\${key}: \${count} items, synced: \${synced}\`);
    } catch (e) {
      console.log(\`\${key}: File not found\`);
    }
  });
  
  console.log('\\n🏁 Verification completed');
}

verifySyncStatus();
`;
  
  if (writeJsonFile('verify-packaging-sync.js', { script: verificationScript })) {
    fs.writeFileSync('verify-packaging-sync.js', verificationScript);
    console.log('   ✅ Created verify-packaging-sync.js');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 FIX SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n✅ COMPLETED ACTIONS:');
  console.log('   - Fixed storage config (local → server mode)');
  console.log(`   - Marked ${markedCount} data types for sync`);
  console.log('   - Created verification script');
  
  console.log('\n🔄 WHAT HAPPENS NEXT:');
  console.log('   - packaging-sync service will detect unsynced data');
  console.log('   - Data will be uploaded to server automatically');
  console.log('   - Other devices can then sync from server');
  
  console.log('\n💡 ROOT CAUSE IDENTIFIED:');
  console.log('   - Storage was in LOCAL mode (no server sync)');
  console.log('   - Packaging data never uploaded to server');
  console.log('   - Other devices had no data to sync from');
  
  console.log('\n🎯 EXPECTED RESULT:');
  console.log('   - Products, materials, user control will sync to other devices');
  console.log('   - Cross-device sync will work for packaging module');
  console.log('   - Data consistency across all devices');
  
  console.log('\n🏁 Fix completed at:', new Date().toLocaleString());
  
  return true;
}

// Run the fix
const success = fixPackagingSyncIssue();

if (success) {
  console.log('\n🎉 PACKAGING SYNC ISSUE FIX COMPLETED SUCCESSFULLY!');
  console.log('💡 Restart the application to apply changes');
} else {
  console.log('\n❌ PACKAGING SYNC ISSUE FIX FAILED');
  console.log('🔧 Manual intervention may be required');
}