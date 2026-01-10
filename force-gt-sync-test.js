/**
 * Force GT Sync Test
 * Test and force sync GT data to resolve cross-device sync issues
 */

const fs = require('fs');
const path = require('path');

// Mock localStorage for Node.js environment
global.localStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  removeItem: function(key) {
    delete this.data[key];
  }
};

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  close() {
    this.readyState = 3; // CLOSED
  }
  
  send(data) {
    console.log('📡 WebSocket send:', data);
  }
};

// Mock fetch for server communication
global.fetch = async (url, options) => {
  console.log('🌐 Mock server request:', url, options?.method || 'GET');
  
  // Simulate server response with sample GT data
  if (url.includes('gt_salesOrders')) {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        data: {
          value: [
            {
              id: "device_b_so_001",
              soNo: "DEVICEB-001",
              customer: "PT. DEVICE B CUSTOMER 1",
              customerKode: "DBC-001",
              paymentTerms: "TOP",
              topDays: 30,
              status: "OPEN",
              created: new Date().toISOString(),
              timestamp: Date.now(),
              items: [
                {
                  id: "item_001",
                  productId: "PROD001",
                  productKode: "PROD001",
                  productName: "Device B Product 1",
                  qty: 100,
                  unit: "PCS",
                  price: 10000,
                  total: 1000000
                }
              ]
            },
            {
              id: "device_b_so_002", 
              soNo: "DEVICEB-002",
              customer: "PT. DEVICE B CUSTOMER 2",
              customerKode: "DBC-002",
              paymentTerms: "COD",
              status: "OPEN",
              created: new Date().toISOString(),
              timestamp: Date.now(),
              items: [
                {
                  id: "item_002",
                  productId: "PROD002",
                  productKode: "PROD002", 
                  productName: "Device B Product 2",
                  qty: 50,
                  unit: "PCS",
                  price: 20000,
                  total: 1000000
                }
              ]
            }
          ]
        }
      })
    };
  }
  
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ success: true })
  };
};

// Load existing GT data
function loadExistingGTData() {
  console.log('📂 Loading existing GT sales orders data...\n');
  
  const filePath = 'data/localStorage/gt_salesOrders.json';
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      const salesOrders = data.value || data;
      
      console.log(`✅ Loaded ${salesOrders.length} existing sales orders`);
      salesOrders.forEach((so, index) => {
        console.log(`   ${index + 1}. ${so.soNo} - ${so.customer} (${so.status})`);
      });
      
      return salesOrders;
    } else {
      console.log('❌ No existing GT sales orders file found');
      return [];
    }
  } catch (error) {
    console.error('❌ Error loading existing data:', error.message);
    return [];
  }
}

// Test GT sync service
async function testGTSyncService() {
  console.log('\n🧪 Testing GT Sync Service...\n');
  
  try {
    // Set up storage config for server mode
    localStorage.setItem('storage_config', JSON.stringify({ 
      type: 'server', 
      serverUrl: 'https://test-server.com',
      business: 'general-trading'
    }));
    
    console.log('📋 Storage config set to server mode');
    
    // Import and test GT sync service
    const { gtSync } = await import('./src/services/gt-sync.ts');
    
    console.log('✅ GT Sync service loaded');
    
    // Check initial status
    const initialStatus = gtSync.getSyncStatus();
    console.log('📊 Initial sync status:', initialStatus);
    
    // Set up status change listener
    let statusChanges = [];
    const unsubscribe = gtSync.onSyncStatusChange((status) => {
      statusChanges.push({ status, timestamp: new Date().toISOString() });
      console.log('🔄 Status changed to:', status);
    });
    
    // Test data update (this should trigger sync)
    console.log('\n📝 Testing data update and sync...');
    
    const testSalesOrder = {
      id: "sync_test_" + Date.now(),
      soNo: "SYNC-TEST-001",
      customer: "SYNC TEST CUSTOMER",
      customerKode: "STC-001",
      paymentTerms: "TOP",
      topDays: 30,
      status: "OPEN",
      created: new Date().toISOString(),
      timestamp: Date.now(),
      items: [
        {
          id: "sync_item_001",
          productId: "SYNC001",
          productKode: "SYNC001",
          productName: "Sync Test Product",
          qty: 10,
          unit: "PCS",
          price: 5000,
          total: 50000
        }
      ]
    };
    
    await gtSync.updateData('gt_salesOrders', [testSalesOrder], 'HIGH');
    
    // Check queue status
    const queueStatus = gtSync.getQueueStatus();
    console.log('📋 Queue status after update:', queueStatus);
    
    // Force sync all
    console.log('\n🚀 Force syncing all data...');
    await gtSync.forceSyncAll();
    
    // Final status
    const finalStatus = gtSync.getSyncStatus();
    console.log('📊 Final sync status:', finalStatus);
    
    console.log('\n📈 Status changes during test:');
    statusChanges.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change.status} at ${change.timestamp}`);
    });
    
    // Cleanup
    unsubscribe();
    
    return {
      success: true,
      statusChanges: statusChanges.length,
      finalStatus
    };
    
  } catch (error) {
    console.error('❌ GT Sync service test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Simulate server sync
async function simulateServerSync() {
  console.log('\n🌐 Simulating server sync...\n');
  
  try {
    // Simulate fetching data from server
    console.log('📡 Fetching GT sales orders from server...');
    
    const response = await fetch('https://test-server.com/api/storage/gt_salesOrders', {
      method: 'GET'
    });
    
    const serverData = await response.json();
    console.log('✅ Server response received');
    
    if (serverData.success && serverData.data) {
      const serverSalesOrders = serverData.data.value || serverData.data;
      console.log(`📊 Server has ${serverSalesOrders.length} sales orders`);
      
      serverSalesOrders.forEach((so, index) => {
        console.log(`   ${index + 1}. ${so.soNo} - ${so.customer} (${so.status})`);
      });
      
      // Merge with local data
      const localData = loadExistingGTData();
      const mergedData = [...localData];
      
      // Add server data that's not in local
      serverSalesOrders.forEach(serverSO => {
        const existsLocally = localData.some(localSO => 
          localSO.id === serverSO.id || localSO.soNo === serverSO.soNo
        );
        
        if (!existsLocally) {
          mergedData.push(serverSO);
          console.log(`➕ Added from server: ${serverSO.soNo}`);
        }
      });
      
      console.log(`\n📊 Merged data: ${mergedData.length} total sales orders`);
      
      // Save merged data
      const outputPath = 'data/localStorage/gt_salesOrders_synced.json';
      const outputData = {
        value: mergedData,
        timestamp: Date.now(),
        lastSync: new Date().toISOString(),
        syncSource: 'force-sync-test'
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      console.log(`✅ Synced data saved to: ${outputPath}`);
      
      return {
        success: true,
        localCount: localData.length,
        serverCount: serverSalesOrders.length,
        mergedCount: mergedData.length,
        newFromServer: mergedData.length - localData.length
      };
    }
    
  } catch (error) {
    console.error('❌ Server sync simulation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check GT data loading in SalesOrders component
function checkGTDataLoading() {
  console.log('\n🔍 Checking GT SalesOrders data loading...\n');
  
  // Check how GT SalesOrders loads data
  console.log('📋 GT SalesOrders should load data from:');
  console.log('   1. storageService.get("gt_salesOrders")');
  console.log('   2. Apply filterActiveItems() to remove deleted items');
  console.log('   3. Set state with active orders');
  
  console.log('\n🔧 Potential issues:');
  console.log('   ❌ Data not syncing from server');
  console.log('   ❌ filterActiveItems() removing valid data');
  console.log('   ❌ Storage key mismatch between devices');
  console.log('   ❌ Timestamp conflicts causing data overwrites');
  console.log('   ❌ Network issues preventing sync');
  
  console.log('\n💡 Debug steps:');
  console.log('   1. Check storage_config on both devices');
  console.log('   2. Verify server URL and connectivity');
  console.log('   3. Check browser console for sync errors');
  console.log('   4. Compare localStorage data between devices');
  console.log('   5. Test manual sync operation');
}

// Generate sync fix recommendations
function generateSyncFixRecommendations(testResults) {
  console.log('\n🎯 SYNC FIX RECOMMENDATIONS:\n');
  console.log('=' .repeat(60));
  
  if (testResults.gtSync && testResults.gtSync.success) {
    console.log('✅ GT Sync service is working properly');
  } else {
    console.log('❌ GT Sync service has issues:');
    console.log(`   Error: ${testResults.gtSync?.error || 'Unknown error'}`);
    console.log('\n🔧 Fix GT Sync Service:');
    console.log('   1. Check GT sync service imports');
    console.log('   2. Verify WebSocket connection');
    console.log('   3. Check storage configuration');
  }
  
  if (testResults.serverSync && testResults.serverSync.success) {
    console.log('\n✅ Server sync simulation successful');
    console.log(`   Local: ${testResults.serverSync.localCount} orders`);
    console.log(`   Server: ${testResults.serverSync.serverCount} orders`);
    console.log(`   New from server: ${testResults.serverSync.newFromServer} orders`);
  } else {
    console.log('\n❌ Server sync has issues');
  }
  
  console.log('\n🚀 IMMEDIATE ACTIONS:');
  console.log('1. Check both devices use same server URL');
  console.log('2. Verify GT sync service is running on both devices');
  console.log('3. Force manual sync from device B');
  console.log('4. Check network connectivity between devices');
  console.log('5. Compare storage_config.json on both devices');
  
  console.log('\n📱 ON DEVICE B (the one with more data):');
  console.log('1. Open browser console');
  console.log('2. Run: gtSync.forceSyncAll()');
  console.log('3. Check sync status: gtSync.getSyncStatus()');
  console.log('4. Verify server upload');
  
  console.log('\n📱 ON YOUR DEVICE (the one missing data):');
  console.log('1. Open browser console');
  console.log('2. Run: gtSync.forceSyncAll()');
  console.log('3. Check for new data in GT Sales Orders');
  console.log('4. Verify localStorage data');
}

// Main test function
async function runSyncTest() {
  console.log('🚀 GT CROSS-DEVICE SYNC TEST\n');
  console.log('This will test GT sync functionality and help resolve');
  console.log('the issue where device B data is not syncing to your device.\n');
  
  const results = {};
  
  try {
    // Load existing data
    loadExistingGTData();
    
    // Test GT sync service
    results.gtSync = await testGTSyncService();
    
    // Simulate server sync
    results.serverSync = await simulateServerSync();
    
    // Check data loading
    checkGTDataLoading();
    
    // Generate recommendations
    generateSyncFixRecommendations(results);
    
    console.log('\n✅ Sync test completed!');
    console.log('Check the generated files and follow the recommendations.');
    
  } catch (error) {
    console.error('❌ Sync test failed:', error);
  }
}

// Run the test
runSyncTest().catch(console.error);