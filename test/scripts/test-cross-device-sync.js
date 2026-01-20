/**
 * Test Cross-Device Sync Behavior for Deleted Items (Tombstone Pattern)
 * 
 * This test simulates the scenario where:
 * 1. Device A deletes an item (marks as deleted: true)
 * 2. Device B syncs and should not see the deleted item
 * 3. Verify that deleted items don't resurrect during sync
 */

const { storageService } = require('./src/services/storage');
const { filterActiveItems, safeDeleteItem } = require('./src/utils/data-persistence-helper');

// Mock data for testing
const mockProductionData = [
  {
    id: 'prod-001',
    productionNo: 'PR-001',
    soNo: 'SO-001',
    customer: 'Customer A',
    status: 'OPEN',
    target: 100,
    progress: 50
  },
  {
    id: 'prod-002',
    productionNo: 'PR-002',
    soNo: 'SO-002',
    customer: 'Customer B',
    status: 'OPEN',
    target: 200,
    progress: 100
  },
  {
    id: 'prod-003',
    productionNo: 'PR-003',
    soNo: 'SO-003',
    customer: 'Customer C',
    status: 'CLOSE',
    target: 150,
    progress: 150
  }
];

async function testCrossDeviceSync() {
  console.log('🧪 Testing Cross-Device Sync Behavior for Deleted Items');
  console.log('=' .repeat(60));

  try {
    // Step 1: Device A - Save initial data
    console.log('\n📱 Device A: Saving initial production data...');
    await storageService.set('production', mockProductionData);
    
    const initialData = await storageService.get('production') || [];
    console.log(`✅ Device A: Saved ${initialData.length} production items`);
    
    // Step 2: Device A - Delete an item using tombstone pattern
    console.log('\n🗑️ Device A: Deleting production PR-002...');
    const deleteResult = await safeDeleteItem('production', 'prod-002', 'id');
    console.log(`✅ Device A: Delete result: ${deleteResult}`);
    
    // Verify deletion on Device A
    const dataAfterDelete = await storageService.get('production') || [];
    const activeItemsDeviceA = filterActiveItems(dataAfterDelete);
    console.log(`📊 Device A: Total items in storage: ${dataAfterDelete.length}`);
    console.log(`📊 Device A: Active items (filtered): ${activeItemsDeviceA.length}`);
    console.log(`📊 Device A: Active items:`, activeItemsDeviceA.map(item => item.productionNo));
    
    // Check if deleted item is marked as deleted
    const deletedItem = dataAfterDelete.find(item => item.id === 'prod-002');
    if (deletedItem) {
      console.log(`🔍 Device A: Deleted item status:`, {
        id: deletedItem.id,
        productionNo: deletedItem.productionNo,
        deleted: deletedItem.deleted,
        deletedAt: deletedItem.deletedAt,
        deletedTimestamp: deletedItem.deletedTimestamp
      });
    }
    
    // Step 3: Simulate Device B - Load data and verify filtering
    console.log('\n📱 Device B: Loading production data...');
    const deviceBData = await storageService.get('production') || [];
    const activeItemsDeviceB = filterActiveItems(deviceBData);
    
    console.log(`📊 Device B: Total items in storage: ${deviceBData.length}`);
    console.log(`📊 Device B: Active items (filtered): ${activeItemsDeviceB.length}`);
    console.log(`📊 Device B: Active items:`, activeItemsDeviceB.map(item => item.productionNo));
    
    // Step 4: Verify tombstone pattern works
    console.log('\n🔍 Verification Results:');
    
    const hasDeletedItemInStorage = deviceBData.some(item => item.id === 'prod-002');
    const hasDeletedItemInActive = activeItemsDeviceB.some(item => item.id === 'prod-002');
    
    console.log(`✅ Deleted item exists in storage (tombstone): ${hasDeletedItemInStorage}`);
    console.log(`✅ Deleted item filtered from active items: ${!hasDeletedItemInActive}`);
    
    if (hasDeletedItemInStorage && !hasDeletedItemInActive) {
      console.log('🎉 SUCCESS: Tombstone pattern working correctly!');
      console.log('   - Deleted item preserved in storage for sync consistency');
      console.log('   - Deleted item properly filtered from display');
    } else {
      console.log('❌ FAILURE: Tombstone pattern not working correctly!');
      if (!hasDeletedItemInStorage) {
        console.log('   - Deleted item missing from storage (sync will fail)');
      }
      if (hasDeletedItemInActive) {
        console.log('   - Deleted item not filtered from active items');
      }
    }
    
    // Step 5: Test data resurrection prevention
    console.log('\n🛡️ Testing Data Resurrection Prevention...');
    
    // Simulate adding the deleted item back (resurrection attempt)
    const resurrectedData = [...deviceBData, {
      id: 'prod-002',
      productionNo: 'PR-002-RESURRECTED',
      soNo: 'SO-002',
      customer: 'Customer B',
      status: 'OPEN',
      target: 200,
      progress: 100
    }];
    
    // Filter should still work
    const filteredAfterResurrection = filterActiveItems(resurrectedData);
    const hasResurrectedItem = filteredAfterResurrection.some(item => 
      item.id === 'prod-002' && !item.deleted
    );
    
    console.log(`📊 After resurrection attempt: ${filteredAfterResurrection.length} active items`);
    console.log(`🛡️ Resurrection prevented: ${!hasResurrectedItem}`);
    
    // Step 6: Test cleanup of old tombstones
    console.log('\n🧹 Testing Tombstone Cleanup...');
    
    // Simulate old deleted item (30+ days old)
    const oldDeletedData = [...deviceBData];
    const oldDeletedItem = oldDeletedData.find(item => item.id === 'prod-002');
    if (oldDeletedItem) {
      oldDeletedItem.deletedTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
    }
    
    await storageService.set('production', oldDeletedData);
    await storageService.cleanupDeletedItems('production', 30); // Cleanup items older than 30 days
    
    const dataAfterCleanup = await storageService.get('production') || [];
    const hasOldDeletedItem = dataAfterCleanup.some(item => item.id === 'prod-002');
    
    console.log(`🧹 Old tombstone cleaned up: ${!hasOldDeletedItem}`);
    console.log(`📊 Items after cleanup: ${dataAfterCleanup.length}`);
    
    console.log('\n🎯 Test Summary:');
    console.log(`✅ Tombstone pattern: ${hasDeletedItemInStorage && !hasDeletedItemInActive ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Resurrection prevention: ${!hasResurrectedItem ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Tombstone cleanup: ${!hasOldDeletedItem ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testCrossDeviceSync().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

module.exports = { testCrossDeviceSync };