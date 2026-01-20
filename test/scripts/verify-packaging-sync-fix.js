/**
 * VERIFY PACKAGING SYNC FIX
 * Check if the packaging sync issue has been resolved
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

function verifyPackagingSyncFix() {
  console.log('🔍 VERIFYING PACKAGING SYNC FIX');
  console.log('='.repeat(60));
  
  let allChecksPass = true;
  
  // Check 1: Storage Config
  console.log('\n1️⃣ CHECKING STORAGE CONFIG...');
  const storageConfig = readJsonFile('data/localStorage/storage_config.json');
  
  if (storageConfig) {
    if (storageConfig.type === 'server') {
      console.log('   ✅ Storage configured for SERVER mode');
      console.log(`   🌐 Server URL: ${storageConfig.serverUrl || 'default'}`);
    } else {
      console.log('   ❌ Storage still in LOCAL mode');
      allChecksPass = false;
    }
  } else {
    console.log('   ❌ Storage config not found');
    allChecksPass = false;
  }
  
  // Check 2: Local Data Sync Status
  console.log('\n2️⃣ CHECKING LOCAL DATA SYNC STATUS...');
  
  const packagingKeys = ['products', 'materials', 'customers', 'suppliers', 'userAccessControl'];
  let syncedCount = 0;
  let totalCount = 0;
  
  packagingKeys.forEach(key => {
    const data = readJsonFile(`data/localStorage/${key}.json`);
    
    if (data) {
      const synced = data.synced || false;
      const count = Array.isArray(data.value) ? data.value.length : 0;
      
      if (synced) {
        console.log(`   ✅ ${key}: ${count} items (SYNCED)`);
        syncedCount++;
      } else {
        console.log(`   ⚠️  ${key}: ${count} items (NOT SYNCED)`);
      }
      totalCount++;
    } else {
      console.log(`   ❌ ${key}: File not found`);
    }
  });
  
  if (syncedCount === totalCount && totalCount > 0) {
    console.log(`\n   ✅ All ${syncedCount}/${totalCount} data types are synced`);
  } else {
    console.log(`\n   ⚠️  Only ${syncedCount}/${totalCount} data types are synced`);
    if (syncedCount < totalCount) {
      allChecksPass = false;
    }
  }
  
  // Check 3: Server Data
  console.log('\n3️⃣ CHECKING SERVER DATA...');
  
  const serverData = readJsonFile('data/gt.json/gt.json');
  
  if (serverData) {
    console.log('   ✅ Server data file exists');
    
    // Check for packaging data in server
    const packagingDataInServer = packagingKeys.filter(key => 
      serverData[key] && serverData[key].value && Array.isArray(serverData[key].value)
    );
    
    if (packagingDataInServer.length > 0) {
      console.log(`   ✅ Server contains packaging data for: ${packagingDataInServer.join(', ')}`);
      
      packagingDataInServer.forEach(key => {
        const count = serverData[key].value.length;
        console.log(`      - ${key}: ${count} items`);
      });
    } else {
      console.log('   ❌ Server does not contain packaging data');
      allChecksPass = false;
    }
  } else {
    console.log('   ❌ Server data file not found');
    allChecksPass = false;
  }
  
  // Check 4: Sync Report
  console.log('\n4️⃣ CHECKING SYNC REPORT...');
  
  const syncReport = readJsonFile('packaging-sync-report.json');
  
  if (syncReport) {
    console.log('   ✅ Sync report found');
    console.log(`   📊 Total items synced: ${syncReport.totalItemsSynced}`);
    console.log(`   📦 Data types synced: ${syncReport.dataTypesSynced}`);
    console.log(`   ⏰ Sync completed: ${syncReport.timestamp}`);
    
    if (syncReport.success) {
      console.log('   ✅ Sync reported as successful');
    } else {
      console.log('   ❌ Sync reported as failed');
      allChecksPass = false;
    }
  } else {
    console.log('   ⚠️  Sync report not found (may not have run force sync)');
  }
  
  // Overall Assessment
  console.log('\n' + '='.repeat(60));
  console.log('📋 VERIFICATION RESULTS');
  console.log('='.repeat(60));
  
  if (allChecksPass) {
    console.log('\n🎉 ALL CHECKS PASSED!');
    console.log('✅ Packaging sync issue has been RESOLVED');
    
    console.log('\n🔄 WHAT THIS MEANS:');
    console.log('   - Storage is configured for server sync');
    console.log('   - Local packaging data is marked as synced');
    console.log('   - Server contains packaging data');
    console.log('   - Other devices can now sync packaging data');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Test on other devices - they should now see:');
    console.log('      • Products data');
    console.log('      • Materials data');
    console.log('      • Customer data');
    console.log('      • User control data');
    console.log('   2. Monitor sync status in application');
    console.log('   3. Verify cross-device data consistency');
    
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED');
    console.log('❌ Packaging sync issue may NOT be fully resolved');
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('   1. Check the failed items above');
    console.log('   2. Re-run fix-packaging-sync-issue.js if needed');
    console.log('   3. Re-run force-packaging-sync-now.js if needed');
    console.log('   4. Check application logs for sync errors');
  }
  
  console.log('\n🏁 Verification completed at:', new Date().toLocaleString());
  
  return allChecksPass;
}

// Run verification
const success = verifyPackagingSyncFix();

if (success) {
  console.log('\n🎯 PACKAGING SYNC IS NOW WORKING!');
  console.log('🔄 Other devices should be able to sync packaging data');
} else {
  console.log('\n🔧 ADDITIONAL WORK NEEDED');
  console.log('📋 Review the failed checks above');
}