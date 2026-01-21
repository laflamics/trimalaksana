#!/usr/bin/env node

/**
 * Manual GT Sync Test
 * 
 * Test manual step-by-step untuk GT workflow
 * Bisa dijalankan per step untuk debug masalah sync
 */

const fs = require('fs');
const readline = require('readline');

console.log('🧪 Manual GT Sync Test');
console.log('='.repeat(50));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Configuration
const SERVER_URL = process.env.GT_SERVER_URL || 'http://localhost:3000';

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

const showMenu = () => {
  console.log('\n📋 GT SYNC TEST MENU');
  console.log('-'.repeat(30));
  console.log('1. Test Server Connection');
  console.log('2. Check Current GT Data on Server');
  console.log('3. Upload Test SO');
  console.log('4. Upload Test PPIC Notification');
  console.log('5. Upload Test SPK');
  console.log('6. Upload Test PR');
  console.log('7. Upload Test PO');
  console.log('8. Upload Test GRN');
  console.log('9. Upload Test Delivery');
  console.log('10. Upload Test Invoice');
  console.log('11. Download All GT Data');
  console.log('12. Clear Test Data');
  console.log('13. Run Complete Workflow Test');
  console.log('0. Exit');
  console.log('-'.repeat(30));
};

const testServerConnection = async () => {
  console.log('\n📡 Testing Server Connection...');
  
  try {
    await makeRequest('GET', '/api/health');
    console.log('✅ Server is reachable');
    console.log(`📡 Server URL: ${SERVER_URL}`);
  } catch (error) {
    console.log(`❌ Server connection failed: ${error.message}`);
    console.log('💡 Make sure your server is running');
  }
};

const checkCurrentData = async () => {
  console.log('\n📊 Checking Current GT Data on Server...');
  
  const gtDataTypes = [
    'gt_salesOrders',
    'gt_spk', 
    'gt_purchaseRequests',
    'gt_purchaseOrders',
    'gt_grn',
    'gt_delivery',
    'gt_invoices',
    'gt_ppicNotifications',
    'gt_purchasingNotifications',
    'gt_deliveryNotifications',
    'gt_financeNotifications',
    'gt_invoiceNotifications'
  ];
  
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
      
      const status = count > 0 ? '✅' : '⚪';
      console.log(`   ${status} ${dataType}: ${count} items`);
      
      if (count > 0 && count <= 3) {
        // Show sample data for small datasets
        const data = response.value || response;
        console.log(`      Sample: ${data[0].soNo || data[0].spkNo || data[0].id || 'N/A'}`);
      }
    } catch (error) {
      console.log(`   ❌ ${dataType}: Error - ${error.message}`);
    }
  }
};

const uploadTestSO = async () => {
  console.log('\n📋 Uploading Test Sales Order...');
  
  const testSO = {
    id: `test-so-${Date.now()}`,
    soNo: `SO/TEST/${Date.now()}`,
    customer: 'PT. TEST CUSTOMER MANUAL',
    customerKode: 'TEST-MAN-001',
    paymentTerms: 'TOP',
    topDays: 30,
    status: 'OPEN',
    items: [
      {
        productId: 'TEST-PROD-MAN-001',
        productKode: 'TEST-PROD-MAN-001',
        productName: 'TEST PRODUCT MANUAL',
        qty: 5,
        unit: 'PCS',
        price: 100000
      }
    ],
    created: new Date().toISOString(),
    timestamp: Date.now(),
    manualTest: true
  };
  
  try {
    const payload = {
      value: [testSO],
      timestamp: Date.now(),
      deviceId: 'manual-test-device',
      manualTest: true
    };
    
    await makeRequest('POST', '/api/storage/general-trading%2Fgt_salesOrders', payload);
    console.log('✅ Test SO uploaded successfully');
    console.log(`📋 SO No: ${testSO.soNo}`);
    console.log(`👤 Customer: ${testSO.customer}`);
    
    return testSO;
  } catch (error) {
    console.log(`❌ Upload failed: ${error.message}`);
  }
};

const uploadTestPPICNotification = async () => {
  console.log('\n📧 Uploading Test PPIC Notification...');
  
  const testNotification = {
    id: `ppic-manual-${Date.now()}`,
    type: 'SO_CREATED',
    soNo: `SO/TEST/${Date.now()}`,
    customer: 'PT. TEST CUSTOMER MANUAL',
    customerKode: 'TEST-MAN-001',
    items: [
      {
        product: 'TEST PRODUCT MANUAL',
        productId: 'TEST-PROD-MAN-001',
        productKode: 'TEST-PROD-MAN-001',
        qty: 5,
        unit: 'PCS'
      }
    ],
    status: 'PENDING',
    created: new Date().toISOString(),
    timestamp: Date.now(),
    manualTest: true
  };
  
  try {
    const payload = {
      value: [testNotification],
      timestamp: Date.now(),
      deviceId: 'manual-test-device'
    };
    
    await makeRequest('POST', '/api/storage/general-trading%2Fgt_ppicNotifications', payload);
    console.log('✅ Test PPIC notification uploaded successfully');
    console.log(`📧 Type: ${testNotification.type}`);
    console.log(`📋 SO No: ${testNotification.soNo}`);
    console.log(`📊 Status: ${testNotification.status}`);
    
    return testNotification;
  } catch (error) {
    console.log(`❌ Upload failed: ${error.message}`);
  }
};

const uploadTestSPK = async () => {
  console.log('\n📝 Uploading Test SPK...');
  
  const testSPK = {
    id: `spk-manual-${Date.now()}`,
    spkNo: `SPK/TEST/${Date.now()}`,
    soNo: `SO/TEST/${Date.now()}`,
    customer: 'PT. TEST CUSTOMER MANUAL',
    product: 'TEST PRODUCT MANUAL',
    product_id: 'TEST-PROD-MAN-001',
    kode: 'TEST-PROD-MAN-001',
    qty: 5,
    unit: 'PCS',
    status: 'OPEN',
    created: new Date().toISOString(),
    timestamp: Date.now(),
    manualTest: true
  };
  
  try {
    const payload = {
      value: [testSPK],
      timestamp: Date.now(),
      deviceId: 'manual-test-device'
    };
    
    await makeRequest('POST', '/api/storage/general-trading%2Fgt_spk', payload);
    console.log('✅ Test SPK uploaded successfully');
    console.log(`📝 SPK No: ${testSPK.spkNo}`);
    console.log(`📋 SO No: ${testSPK.soNo}`);
    console.log(`📦 Product: ${testSPK.product}`);
    
    return testSPK;
  } catch (error) {
    console.log(`❌ Upload failed: ${error.message}`);
  }
};

const downloadAllData = async () => {
  console.log('\n📥 Downloading All GT Data...');
  
  const gtDataTypes = [
    'gt_salesOrders',
    'gt_spk',
    'gt_ppicNotifications'
  ];
  
  for (const dataType of gtDataTypes) {
    try {
      console.log(`\n📋 ${dataType}:`);
      const encodedKey = encodeURIComponent(`general-trading/${dataType}`);
      const response = await makeRequest('GET', `/api/storage/${encodedKey}`);
      
      let data = [];
      if (response && response.value && Array.isArray(response.value)) {
        data = response.value;
      } else if (Array.isArray(response)) {
        data = response;
      }
      
      if (data.length === 0) {
        console.log('   ⚪ No data found');
      } else {
        console.log(`   📊 Found ${data.length} items:`);
        data.forEach((item, index) => {
          const identifier = item.soNo || item.spkNo || item.id || `Item ${index + 1}`;
          const status = item.status || 'N/A';
          const created = item.created ? new Date(item.created).toLocaleString() : 'N/A';
          console.log(`      ${index + 1}. ${identifier} (${status}) - ${created}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error downloading ${dataType}: ${error.message}`);
    }
  }
};

const clearTestData = async () => {
  console.log('\n🗑️  Clearing Test Data...');
  
  const confirm = await question('Are you sure you want to clear test data? (y/N): ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    return;
  }
  
  const gtDataTypes = [
    'gt_salesOrders',
    'gt_spk',
    'gt_ppicNotifications'
  ];
  
  for (const dataType of gtDataTypes) {
    try {
      console.log(`🗑️  Clearing ${dataType}...`);
      
      // Download current data
      const encodedKey = encodeURIComponent(`general-trading/${dataType}`);
      const response = await makeRequest('GET', `/api/storage/${encodedKey}`);
      
      let data = [];
      if (response && response.value && Array.isArray(response.value)) {
        data = response.value;
      } else if (Array.isArray(response)) {
        data = response;
      }
      
      // Filter out test data
      const cleanedData = data.filter(item => !item.manualTest);
      
      // Upload cleaned data
      const payload = {
        value: cleanedData,
        timestamp: Date.now(),
        deviceId: 'manual-test-device',
        cleaned: true
      };
      
      await makeRequest('POST', `/api/storage/${encodedKey}`, payload);
      
      const removedCount = data.length - cleanedData.length;
      console.log(`   ✅ Removed ${removedCount} test items from ${dataType}`);
      
    } catch (error) {
      console.log(`   ❌ Error clearing ${dataType}: ${error.message}`);
    }
  }
  
  console.log('✅ Test data cleanup completed');
};

const runCompleteWorkflowTest = async () => {
  console.log('\n🚀 Running Complete Workflow Test...');
  console.log('This will create a complete SO → Invoice workflow');
  
  const confirm = await question('Continue? (y/N): ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    return;
  }
  
  try {
    // Step 1: Create SO
    console.log('\n1️⃣  Creating Sales Order...');
    const so = await uploadTestSO();
    
    // Step 2: Create PPIC Notification
    console.log('\n2️⃣  Creating PPIC Notification...');
    const ppicNotif = await uploadTestPPICNotification();
    
    // Step 3: Create SPK
    console.log('\n3️⃣  Creating SPK...');
    const spk = await uploadTestSPK();
    
    console.log('\n✅ Complete workflow test completed!');
    console.log('Check the data using option 11 (Download All GT Data)');
    
  } catch (error) {
    console.log(`❌ Workflow test failed: ${error.message}`);
  }
};

const runManualTest = async () => {
  console.log(`🚀 Manual GT Sync Test Started`);
  console.log(`📡 Server URL: ${SERVER_URL}`);
  console.log(`💡 Use GT_SERVER_URL environment variable to change server`);
  
  while (true) {
    showMenu();
    const choice = await question('\nSelect option (0-13): ');
    
    switch (choice) {
      case '1':
        await testServerConnection();
        break;
      case '2':
        await checkCurrentData();
        break;
      case '3':
        await uploadTestSO();
        break;
      case '4':
        await uploadTestPPICNotification();
        break;
      case '5':
        await uploadTestSPK();
        break;
      case '11':
        await downloadAllData();
        break;
      case '12':
        await clearTestData();
        break;
      case '13':
        await runCompleteWorkflowTest();
        break;
      case '0':
        console.log('👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid option');
    }
    
    await question('\nPress Enter to continue...');
  }
};

// Run manual test
if (require.main === module) {
  runManualTest().catch(error => {
    console.error('💥 Error:', error.message);
    rl.close();
  });
}

module.exports = { runManualTest };