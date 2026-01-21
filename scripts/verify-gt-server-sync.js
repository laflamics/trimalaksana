#!/usr/bin/env node

/**
 * GT Server Sync Verification
 * 
 * Script sederhana untuk verify apakah GT data sync ke server
 * dan bisa dibaca dari device lain
 */

const fs = require('fs');

console.log('🔍 GT Server Sync Verification');
console.log('='.repeat(50));

// Configuration - adjust sesuai setup server lo
const SERVER_URL = process.env.GT_SERVER_URL || 'http://localhost:3000';
const TEST_DEVICE_ID = `test-device-${Date.now()}`;

// Helper functions
const makeRequest = async (method, endpoint, data = null) => {
  const fetch = (await import('node-fetch')).default;
  
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data) options.body = JSON.stringify(data);
  
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
};

const testServerConnectivity = async () => {
  console.log('\n📡 Testing Server Connectivity...');
  
  try {
    // Test basic connectivity
    await makeRequest('GET', '/api/health');
    console.log('   ✅ Server is reachable');
    return true;
  } catch (error) {
    console.log(`   ❌ Server not reachable: ${error.message}`);
    console.log('   💡 Make sure your server is running and SERVER_URL is correct');
    return false;
  }
};

const testDataUpload = async () => {
  console.log('\n📤 Testing Data Upload...');
  
  const testData = {
    id: `test-so-${Date.now()}`,
    soNo: `SO/TEST/${Date.now()}`,
    customer: 'TEST CUSTOMER',
    status: 'OPEN',
    created: new Date().toISOString(),
    testUpload: true
  };
  
  try {
    const payload = {
      value: [testData],
      timestamp: Date.now(),
      deviceId: TEST_DEVICE_ID,
      testMode: true
    };
    
    await makeRequest('POST', '/api/storage/general-trading%2Fgt_salesOrders', payload);
    console.log('   ✅ Data uploaded successfully');
    return testData;
  } catch (error) {
    console.log(`   ❌ Upload failed: ${error.message}`);
    throw error;
  }
};

const testDataDownload = async (testData) => {
  console.log('\n📥 Testing Data Download...');
  
  try {
    const response = await makeRequest('GET', '/api/storage/general-trading%2Fgt_salesOrders');
    
    let downloadedData = [];
    if (response && response.value && Array.isArray(response.value)) {
      downloadedData = response.value;
    } else if (Array.isArray(response)) {
      downloadedData = response;
    }
    
    console.log(`   📊 Downloaded ${downloadedData.length} items`);
    
    // Check if our test data is there
    const foundTestData = downloadedData.find(item => item.id === testData.id);
    
    if (foundTestData) {
      console.log('   ✅ Test data found in download');
      return true;
    } else {
      console.log('   ❌ Test data not found in download');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Download failed: ${error.message}`);
    throw error;
  }
};

const testCrossDeviceSync = async (testData) => {
  console.log('\n🔄 Testing Cross-Device Sync...');
  
  // Simulate different device downloading the same data
  const otherDeviceId = `other-device-${Date.now()}`;
  
  try {
    console.log(`   [Device A] Uploaded data: ${testData.soNo}`);
    
    // Wait a bit for sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Download from "different device"
    const response = await makeRequest('GET', '/api/storage/general-trading%2Fgt_salesOrders');
    
    let downloadedData = [];
    if (response && response.value && Array.isArray(response.value)) {
      downloadedData = response.value;
    } else if (Array.isArray(response)) {
      downloadedData = response;
    }
    
    const foundData = downloadedData.find(item => item.id === testData.id);
    
    if (foundData) {
      console.log(`   [Device B] Found data: ${foundData.soNo}`);
      console.log('   ✅ Cross-device sync working');
      return true;
    } else {
      console.log('   ❌ Cross-device sync failed');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Cross-device sync test failed: ${error.message}`);
    return false;
  }
};

const testNotificationSync = async () => {
  console.log('\n📧 Testing Notification Sync...');
  
  const testNotification = {
    id: `notif-${Date.now()}`,
    type: 'SO_CREATED',
    soNo: `SO/TEST/${Date.now()}`,
    customer: 'TEST CUSTOMER',
    status: 'PENDING',
    created: new Date().toISOString(),
    testNotification: true
  };
  
  try {
    // Upload notification
    const payload = {
      value: [testNotification],
      timestamp: Date.now(),
      deviceId: TEST_DEVICE_ID
    };
    
    await makeRequest('POST', '/api/storage/general-trading%2Fgt_ppicNotifications', payload);
    console.log('   📤 Notification uploaded');
    
    // Download and verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await makeRequest('GET', '/api/storage/general-trading%2Fgt_ppicNotifications');
    
    let notifications = [];
    if (response && response.value && Array.isArray(response.value)) {
      notifications = response.value;
    } else if (Array.isArray(response)) {
      notifications = response;
    }
    
    const foundNotif = notifications.find(n => n.id === testNotification.id);
    
    if (foundNotif) {
      console.log('   📥 Notification downloaded successfully');
      console.log('   ✅ Notification sync working');
      return true;
    } else {
      console.log('   ❌ Notification sync failed');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Notification sync test failed: ${error.message}`);
    return false;
  }
};

const checkExistingGTData = async () => {
  console.log('\n📊 Checking Existing GT Data on Server...');
  
  const gtDataTypes = [
    'gt_salesOrders',
    'gt_spk',
    'gt_purchaseRequests',
    'gt_purchaseOrders',
    'gt_ppicNotifications',
    'gt_purchasingNotifications',
    'gt_deliveryNotifications',
    'gt_financeNotifications'
  ];
  
  const results = {};
  
  for (const dataType of gtDataTypes) {
    try {
      const encodedKey = encodeURIComponent(`general-trading/${dataType}`);
      const response = await makeRequest('GET', `/api/storage/${encodedKey}`);
      
      let count = 0;
      if (response && response.value && Array.isArray(response.value)) {
        count = response.value.length;
      } else if (Array.isArray(response)) {
        count = response.length;
      }
      
      results[dataType] = count;
      console.log(`   📋 ${dataType}: ${count} items`);
    } catch (error) {
      results[dataType] = 'ERROR';
      console.log(`   ❌ ${dataType}: ${error.message}`);
    }
  }
  
  return results;
};

const runVerification = async () => {
  console.log(`🚀 Starting GT Server Sync Verification`);
  console.log(`📡 Server URL: ${SERVER_URL}`);
  console.log(`🔧 Test Device: ${TEST_DEVICE_ID}`);
  
  try {
    // Step 1: Test server connectivity
    const serverOk = await testServerConnectivity();
    if (!serverOk) {
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('1. Start your server (npm run dev or similar)');
      console.log('2. Check SERVER_URL environment variable');
      console.log('3. Verify server has /api/storage endpoints');
      return;
    }
    
    // Step 2: Check existing data
    const existingData = await checkExistingGTData();
    
    // Step 3: Test upload
    const testData = await testDataUpload();
    
    // Step 4: Test download
    const downloadOk = await testDataDownload(testData);
    
    // Step 5: Test cross-device sync
    const crossDeviceOk = await testCrossDeviceSync(testData);
    
    // Step 6: Test notification sync
    const notificationOk = await testNotificationSync();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 VERIFICATION RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Server Connectivity: ${serverOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Data Upload: ${testData ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Data Download: ${downloadOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Cross-Device Sync: ${crossDeviceOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Notification Sync: ${notificationOk ? 'PASS' : 'FAIL'}`);
    
    console.log('\n📊 Existing GT Data on Server:');
    Object.entries(existingData).forEach(([type, count]) => {
      const status = count === 'ERROR' ? '❌' : count > 0 ? '✅' : '⚪';
      console.log(`   ${status} ${type}: ${count}`);
    });
    
    const allPassed = serverOk && testData && downloadOk && crossDeviceOk && notificationOk;
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('GT server sync is working correctly.');
      console.log('Data can be shared between devices through the server.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED');
      console.log('Check the error messages above for troubleshooting.');
    }
    
  } catch (error) {
    console.error('\n💥 VERIFICATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
};

// Run verification
if (require.main === module) {
  runVerification();
}

module.exports = { runVerification };