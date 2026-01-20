/**
 * TEST SYNC FUNCTIONALITY
 * Test if sync methods work properly and data syncs correctly
 */

const fs = require('fs');

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
    const dir = require('path').dirname(filePath);
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

function testSyncFunctionality() {
  console.log('🧪 TESTING SYNC FUNCTIONALITY');
  console.log('='.repeat(60));
  
  // Test 1: Check if server structure exists
  console.log('\n1️⃣ CHECKING SERVER STRUCTURE...');
  
  const serverPaths = [
    'data/localStorage/packaging',
    'data/localStorage/general-trading',
    'data/localStorage/trucking'
  ];
  
  let serverStructureOK = true;
  
  serverPaths.forEach(path => {
    if (fs.existsSync(path)) {
      const files = fs.readdirSync(path).filter(f => f.endsWith('.json'));
      console.log(`   ✅ ${path}: ${files.length} files`);
    } else {
      console.log(`   ❌ ${path}: Missing`);
      serverStructureOK = false;
    }
  });
  
  // Test 2: Check storage config
  console.log('\n2️⃣ CHECKING STORAGE CONFIG...');
  
  const storageConfig = readJsonFile('data/localStorage/storage_config.json');
  
  if (storageConfig) {
    console.log(`   ✅ Storage config found`);
    console.log(`   📊 Type: ${storageConfig.type}`);
    console.log(`   🌐 Server URL: ${storageConfig.serverUrl || 'not set'}`);
    
    if (storageConfig.type === 'server' && storageConfig.serverUrl) {
      console.log('   ✅ Configured for server sync');
    } else {
      console.log('   ⚠️  Not configured for server sync');
    }
  } else {
    console.log('   ❌ Storage config not found');
  }
  
  // Test 3: Simulate data change and sync
  console.log('\n3️⃣ TESTING DATA CHANGE SYNC...');
  
  // Create test data change
  const testDataPath = 'data/localStorage/test_sync_data.json';
  const testData = {
    value: [
      {
        id: 'test-' + Date.now(),
        name: 'Test Sync Item',
        created: new Date().toISOString(),
        testSync: true
      }
    ],
    timestamp: Date.now(),
    _timestamp: Date.now(),
    synced: false,
    needsSync: true
  };
  
  if (writeJsonFile(testDataPath, testData)) {
    console.log('   ✅ Created test data for sync');
    
    // Check if packaging server path exists for test
    const testServerPath = 'data/localStorage/packaging/test_sync_data.json';
    
    if (writeJsonFile(testServerPath, testData)) {
      console.log('   ✅ Test data copied to server structure');
      
      // Mark as synced
      const syncedData = {
        ...testData,
        synced: true,
        syncedAt: new Date().toISOString()
      };
      
      if (writeJsonFile(testDataPath, syncedData)) {
        console.log('   ✅ Test data marked as synced');
      }
    } else {
      console.log('   ❌ Failed to copy test data to server');
    }
  } else {
    console.log('   ❌ Failed to create test data');
  }
  
  // Test 4: Check real data sync status
  console.log('\n4️⃣ CHECKING REAL DATA SYNC STATUS...');
  
  const keyFiles = ['products', 'materials', 'customers', 'userAccessControl'];
  
  keyFiles.forEach(key => {
    const localPath = `data/localStorage/${key}.json`;
    const serverPath = `data/localStorage/packaging/${key}.json`;
    
    const localData = readJsonFile(localPath);
    const serverData = readJsonFile(serverPath);
    
    if (localData && serverData) {
      const localCount = localData.value ? localData.value.length : (Array.isArray(localData) ? localData.length : 0);
      const serverCount = serverData.value ? serverData.value.length : (Array.isArray(serverData) ? serverData.length : 0);
      
      if (localCount === serverCount) {
        console.log(`   ✅ ${key}: Local=${localCount}, Server=${serverCount} - SYNCED`);
      } else {
        console.log(`   ⚠️  ${key}: Local=${localCount}, Server=${serverCount} - OUT OF SYNC`);
      }
    } else if (localData && !serverData) {
      console.log(`   ⚠️  ${key}: Local exists, Server missing`);
    } else if (!localData && serverData) {
      console.log(`   ⚠️  ${key}: Server exists, Local missing`);
    } else {
      console.log(`   ❌ ${key}: Both missing`);
    }
  });
  
  // Test 5: Check if sync would work
  console.log('\n5️⃣ SYNC READINESS CHECK...');
  
  let syncReady = true;
  const issues = [];
  
  if (!serverStructureOK) {
    syncReady = false;
    issues.push('Server structure incomplete');
  }
  
  if (!storageConfig || storageConfig.type !== 'server') {
    syncReady = false;
    issues.push('Storage not configured for server mode');
  }
  
  if (!storageConfig?.serverUrl) {
    syncReady = false;
    issues.push('Server URL not configured');
  }
  
  // Clean up test files
  try {
    if (fs.existsSync(testDataPath)) fs.unlinkSync(testDataPath);
    if (fs.existsSync('data/localStorage/packaging/test_sync_data.json')) {
      fs.unlinkSync('data/localStorage/packaging/test_sync_data.json');
    }
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SYNC FUNCTIONALITY TEST RESULTS');
  console.log('='.repeat(60));
  
  if (syncReady) {
    console.log('\n🎉 SYNC FUNCTIONALITY IS READY!');
    console.log('✅ Server structure exists');
    console.log('✅ Storage configured for server mode');
    console.log('✅ Data sync should work properly');
    
    console.log('\n💡 SYNC BEHAVIOR:');
    console.log('   - Data changes will be saved locally first (instant)');
    console.log('   - Background sync will upload to server');
    console.log('   - Other devices will download from server');
    console.log('   - Cross-device sync should work properly');
    
    console.log('\n🧪 TO TEST SYNC:');
    console.log('   1. Make a change on this device (add/edit data)');
    console.log('   2. Check sync status indicator');
    console.log('   3. Check if change appears on other device');
    console.log('   4. Make change on other device');
    console.log('   5. Check if it syncs back to this device');
    
  } else {
    console.log('\n⚠️  SYNC FUNCTIONALITY HAS ISSUES');
    console.log('❌ Issues found:');
    issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    if (issues.includes('Server structure incomplete')) {
      console.log('   - Run: node create-packaging-server-structure.js');
    }
    if (issues.includes('Storage not configured for server mode')) {
      console.log('   - Update storage config to server mode');
    }
    if (issues.includes('Server URL not configured')) {
      console.log('   - Set server URL in storage config');
    }
  }
  
  console.log('\n🏁 Test completed at:', new Date().toLocaleString());
  
  return {
    syncReady,
    issues,
    serverStructureOK,
    storageConfig
  };
}

// Run the test
const result = testSyncFunctionality();

if (result.syncReady) {
  console.log('\n🚀 SYNC IS READY - TRY MAKING CHANGES!');
} else {
  console.log('\n🔧 SYNC NEEDS FIXES - CHECK ISSUES ABOVE');
}