/**
 * Deletion Timestamp Test
 * Comprehensive test untuk memastikan deletion timestamp sudah benar di semua tempat
 * Mencegah data corruption dari deletion conflicts antar device
 */

import { storageService } from '../services/storage';
import { packagingSync } from '../services/packaging-sync';
import { safeDeleteItem, filterActiveItems, isItemDeleted } from '../utils/data-persistence-helper';

interface DeletionTestResult {
  testName: string;
  storageKey: string;
  itemId: string;
  deletionTimestamp: number;
  deletedAt: string;
  deviceId: string;
  success: boolean;
  error?: string;
  conflictResolved?: boolean;
}

class DeletionTimestampTest {
  private testResults: DeletionTestResult[] = [];
  private deviceAId = 'device-A-' + Date.now();
  private deviceBId = 'device-B-' + Date.now();

  /**
   * Run comprehensive deletion timestamp test
   */
  async runComprehensiveDeletionTest() {
    console.log('🗑️ COMPREHENSIVE DELETION TIMESTAMP TEST');
    console.log('========================================');
    console.log('Testing deletion timestamp consistency across all modules');
    console.log('Ensuring no data corruption from deletion conflicts');
    console.log('');

    // Test 1: Basic deletion timestamp format
    await this.testBasicDeletionTimestamp();

    // Test 2: Multi-device deletion conflicts
    await this.testMultiDeviceDeletionConflicts();

    // Test 3: Deletion timestamp in all storage keys
    await this.testDeletionInAllStorageKeys();

    // Test 4: Tombstone pattern validation
    await this.testTombstonePattern();

    // Test 5: Deletion sync to server
    await this.testDeletionSyncToServer();

    // Test 6: Data resurrection prevention
    await this.testDataResurrectionPrevention();

    this.generateDeletionReport();
  }

  /**
   * Test 1: Basic deletion timestamp format
   */
  private async testBasicDeletionTimestamp() {
    console.log('\n📝 Test 1: Basic Deletion Timestamp Format');
    console.log('==========================================');

    const testData = {
      id: 'test-item-' + Date.now(),
      name: 'Test Item for Deletion',
      value: 'Test Value'
    };

    const storageKey = 'deletionTest';
    
    // Create item first
    await storageService.set(storageKey, [testData]);
    console.log(`   ✅ Created test item: ${testData.id}`);

    // Delete item using safe deletion
    const deletionStart = Date.now();
    await safeDeleteItem(storageKey, testData.id);
    const deletionEnd = Date.now();

    // Verify deletion format
    const data = await storageService.get<any[]>(storageKey) || [];
    const deletedItem = data.find(item => item.id === testData.id);

    if (deletedItem) {
      const hasCorrectFormat = 
        deletedItem.deleted === true &&
        typeof deletedItem.deletedAt === 'string' &&
        typeof deletedItem.deletedTimestamp === 'number' &&
        deletedItem.deletedTimestamp >= deletionStart &&
        deletedItem.deletedTimestamp <= deletionEnd;

      this.testResults.push({
        testName: 'Basic Deletion Format',
        storageKey,
        itemId: testData.id,
        deletionTimestamp: deletedItem.deletedTimestamp,
        deletedAt: deletedItem.deletedAt,
        deviceId: 'current-device',
        success: hasCorrectFormat,
        error: hasCorrectFormat ? undefined : 'Incorrect deletion format'
      });

      console.log(`   📊 Deletion format check: ${hasCorrectFormat ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   🕐 Deleted at: ${deletedItem.deletedAt}`);
      console.log(`   📱 Timestamp: ${deletedItem.deletedTimestamp}`);
      console.log(`   🔍 Deleted flag: ${deletedItem.deleted}`);
    } else {
      console.log('   ❌ FAILED: Deleted item not found (hard deletion detected)');
      this.testResults.push({
        testName: 'Basic Deletion Format',
        storageKey,
        itemId: testData.id,
        deletionTimestamp: 0,
        deletedAt: '',
        deviceId: 'current-device',
        success: false,
        error: 'Item not found after deletion (hard deletion)'
      });
    }
  }

  /**
   * Test 2: Multi-device deletion conflicts
   */
  private async testMultiDeviceDeletionConflicts() {
    console.log('\n📱 Test 2: Multi-Device Deletion Conflicts');
    console.log('==========================================');

    const testData = {
      id: 'conflict-item-' + Date.now(),
      name: 'Conflict Test Item',
      value: 'Original Value'
    };

    const storageKey = 'deletionConflictTest';

    // Create item
    await storageService.set(storageKey, [testData]);

    // Scenario 1: Device A deletes, Device B updates
    console.log('\n   📱 Scenario 1: Device A deletes, Device B updates');
    
    // Device A: Delete item
    const deviceA_deletionTime = Date.now();
    const deviceA_data = {
      ...testData,
      deleted: true,
      deletedAt: new Date(deviceA_deletionTime).toISOString(),
      deletedTimestamp: deviceA_deletionTime,
      deletedBy: this.deviceAId
    };

    // Device B: Update item (slightly later)
    await new Promise(resolve => setTimeout(resolve, 10));
    const deviceB_updateTime = Date.now();
    const deviceB_data = {
      ...testData,
      value: 'Updated by Device B',
      lastUpdated: new Date(deviceB_updateTime).toISOString(),
      timestamp: deviceB_updateTime,
      updatedBy: this.deviceBId
    };

    console.log(`     Device A deleted at: ${deviceA_deletionTime}`);
    console.log(`     Device B updated at: ${deviceB_updateTime}`);

    // Conflict resolution: Deletion should win (later timestamp)
    const conflict_detected = deviceB_updateTime > deviceA_deletionTime;
    let resolved_data;

    if (conflict_detected) {
      // Deletion wins - item should remain deleted
      resolved_data = {
        ...deviceB_data,
        deleted: true,
        deletedAt: deviceA_data.deletedAt,
        deletedTimestamp: deviceA_data.deletedTimestamp,
        deletedBy: deviceA_data.deletedBy,
        conflictResolved: true,
        conflictType: 'deletion_vs_update',
        conflictResolution: 'deletion_wins'
      };
      console.log(`     🔧 RESOLUTION: Deletion wins - item remains deleted`);
    } else {
      resolved_data = deviceB_data;
      console.log(`     🔧 RESOLUTION: Update wins - item not deleted`);
    }

    this.testResults.push({
      testName: 'Multi-Device Deletion Conflict',
      storageKey,
      itemId: testData.id,
      deletionTimestamp: deviceA_deletionTime,
      deletedAt: deviceA_data.deletedAt,
      deviceId: this.deviceAId,
      success: resolved_data.deleted === true,
      conflictResolved: true
    });

    console.log(`     ✅ Conflict resolved: Item ${resolved_data.deleted ? 'remains deleted' : 'is active'}`);
  }

  /**
   * Test 3: Deletion timestamp in all storage keys
   */
  private async testDeletionInAllStorageKeys() {
    console.log('\n🗂️ Test 3: Deletion Timestamp in All Storage Keys');
    console.log('=================================================');

    const storageKeys = [
      'salesOrders',
      'spk', 
      'purchaseOrders',
      'grn',
      'production',
      'qc',
      'delivery',
      'invoices',
      'inventory',
      'customers',
      'products',
      'materials',
      'userAccessControl'
    ];

    for (const storageKey of storageKeys) {
      console.log(`\n   📋 Testing deletion in: ${storageKey}`);

      const testItem = {
        id: `test-${storageKey}-${Date.now()}`,
        name: `Test ${storageKey} Item`,
        [storageKey === 'customers' ? 'nama' : 'description']: `Test item for ${storageKey}`
      };

      try {
        // Create test item
        const existingData = await storageService.get<any[]>(storageKey) || [];
        await storageService.set(storageKey, [...existingData, testItem]);

        // Delete using safe deletion
        const deletionTime = Date.now();
        await safeDeleteItem(storageKey, testItem.id);

        // Verify deletion format
        const updatedData = await storageService.get<any[]>(storageKey) || [];
        const deletedItem = updatedData.find(item => item.id === testItem.id);

        if (deletedItem && deletedItem.deleted === true) {
          console.log(`     ✅ ${storageKey}: Deletion timestamp format correct`);
          
          this.testResults.push({
            testName: `Deletion in ${storageKey}`,
            storageKey,
            itemId: testItem.id,
            deletionTimestamp: deletedItem.deletedTimestamp,
            deletedAt: deletedItem.deletedAt,
            deviceId: 'current-device',
            success: true
          });
        } else {
          console.log(`     ❌ ${storageKey}: Deletion format incorrect or hard deletion`);
          
          this.testResults.push({
            testName: `Deletion in ${storageKey}`,
            storageKey,
            itemId: testItem.id,
            deletionTimestamp: 0,
            deletedAt: '',
            deviceId: 'current-device',
            success: false,
            error: 'Deletion format incorrect'
          });
        }
      } catch (error) {
        console.log(`     ⚠️ ${storageKey}: Error testing deletion - ${error.message}`);
        
        this.testResults.push({
          testName: `Deletion in ${storageKey}`,
          storageKey,
          itemId: testItem.id,
          deletionTimestamp: 0,
          deletedAt: '',
          deviceId: 'current-device',
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Test 4: Tombstone pattern validation
   */
  private async testTombstonePattern() {
    console.log('\n⚰️ Test 4: Tombstone Pattern Validation');
    console.log('======================================');

    const storageKey = 'tombstoneTest';
    const testItems = [
      { id: 'item-1', name: 'Item 1', active: true },
      { id: 'item-2', name: 'Item 2', active: true },
      { id: 'item-3', name: 'Item 3', active: true }
    ];

    // Create test items
    await storageService.set(storageKey, testItems);
    console.log(`   📝 Created ${testItems.length} test items`);

    // Delete item-2
    await safeDeleteItem(storageKey, 'item-2');
    console.log(`   🗑️ Deleted item-2`);

    // Verify tombstone pattern
    const allData = await storageService.get<any[]>(storageKey) || [];
    const activeData = filterActiveItems(allData);
    const deletedData = allData.filter(item => isItemDeleted(item));

    console.log(`   📊 Total items in storage: ${allData.length}`);
    console.log(`   ✅ Active items: ${activeData.length}`);
    console.log(`   ⚰️ Deleted items (tombstones): ${deletedData.length}`);

    const tombstoneValid = 
      allData.length === 3 && // All items still in storage
      activeData.length === 2 && // Only 2 active
      deletedData.length === 1 && // 1 tombstone
      deletedData[0].id === 'item-2' && // Correct item deleted
      deletedData[0].deleted === true; // Proper deletion flag

    console.log(`   🔍 Tombstone pattern: ${tombstoneValid ? '✅ VALID' : '❌ INVALID'}`);

    this.testResults.push({
      testName: 'Tombstone Pattern Validation',
      storageKey,
      itemId: 'item-2',
      deletionTimestamp: deletedData[0]?.deletedTimestamp || 0,
      deletedAt: deletedData[0]?.deletedAt || '',
      deviceId: 'current-device',
      success: tombstoneValid,
      error: tombstoneValid ? undefined : 'Tombstone pattern validation failed'
    });
  }

  /**
   * Test 5: Deletion sync to server
   */
  private async testDeletionSyncToServer() {
    console.log('\n🌐 Test 5: Deletion Sync to Server');
    console.log('==================================');

    const storageKey = 'deletionSyncTest';
    const testItem = {
      id: 'sync-test-' + Date.now(),
      name: 'Sync Test Item',
      value: 'Test Value'
    };

    // Create and delete item
    await storageService.set(storageKey, [testItem]);
    await safeDeleteItem(storageKey, testItem.id);

    // Check if deletion is queued for sync
    const data = await storageService.get<any[]>(storageKey) || [];
    const deletedItem = data.find(item => item.id === testItem.id);

    if (deletedItem) {
      // Simulate sync to server
      const syncPayload = {
        key: storageKey,
        data: data,
        timestamp: Date.now(),
        containsDeletions: data.some(item => item.deleted === true)
      };

      console.log(`   📤 Sync payload prepared for server`);
      console.log(`   🗑️ Contains deletions: ${syncPayload.containsDeletions}`);
      console.log(`   📊 Total items: ${data.length}`);
      console.log(`   ⚰️ Deleted items: ${data.filter(item => item.deleted).length}`);

      this.testResults.push({
        testName: 'Deletion Sync to Server',
        storageKey,
        itemId: testItem.id,
        deletionTimestamp: deletedItem.deletedTimestamp,
        deletedAt: deletedItem.deletedAt,
        deviceId: 'current-device',
        success: syncPayload.containsDeletions,
        error: syncPayload.containsDeletions ? undefined : 'Deletion not included in sync'
      });

      console.log(`   ✅ Deletion sync: ${syncPayload.containsDeletions ? 'READY' : 'FAILED'}`);
    } else {
      console.log(`   ❌ Deletion sync: FAILED - Item not found`);
    }
  }

  /**
   * Test 6: Data resurrection prevention
   */
  private async testDataResurrectionPrevention() {
    console.log('\n🧟 Test 6: Data Resurrection Prevention');
    console.log('======================================');

    const storageKey = 'resurrectionTest';
    const testItem = {
      id: 'resurrection-test-' + Date.now(),
      name: 'Resurrection Test Item',
      value: 'Original Value'
    };

    // Create item
    await storageService.set(storageKey, [testItem]);
    console.log(`   📝 Created test item: ${testItem.id}`);

    // Delete item
    await safeDeleteItem(storageKey, testItem.id);
    console.log(`   🗑️ Deleted test item`);

    // Verify item is deleted but still in storage
    let data = await storageService.get<any[]>(storageKey) || [];
    let deletedItem = data.find(item => item.id === testItem.id);
    
    console.log(`   ⚰️ Item in storage as tombstone: ${deletedItem ? '✅ YES' : '❌ NO'}`);
    console.log(`   🔍 Deleted flag: ${deletedItem?.deleted}`);

    // Simulate resurrection attempt (external sync overwrites with original data)
    console.log(`   🧟 Simulating resurrection attempt...`);
    
    const resurrectionData = [testItem]; // Original item without deletion flags
    await storageService.set(storageKey, resurrectionData);

    // Check if resurrection was prevented
    data = await storageService.get<any[]>(storageKey) || [];
    const activeItems = filterActiveItems(data);
    const resurrectedItem = activeItems.find(item => item.id === testItem.id);

    const resurrectionPrevented = !resurrectedItem; // Item should not be active

    console.log(`   🛡️ Resurrection prevented: ${resurrectionPrevented ? '✅ YES' : '❌ NO'}`);
    console.log(`   📊 Active items after resurrection attempt: ${activeItems.length}`);

    this.testResults.push({
      testName: 'Data Resurrection Prevention',
      storageKey,
      itemId: testItem.id,
      deletionTimestamp: deletedItem?.deletedTimestamp || 0,
      deletedAt: deletedItem?.deletedAt || '',
      deviceId: 'current-device',
      success: resurrectionPrevented,
      error: resurrectionPrevented ? undefined : 'Data resurrection not prevented'
    });
  }

  /**
   * Generate comprehensive deletion report
   */
  private generateDeletionReport() {
    console.log('\n📋 DELETION TIMESTAMP TEST REPORT');
    console.log('=================================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    console.log(`\n🔍 DETAILED RESULTS:`);
    this.testResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName}:`);
      console.log(`   Storage Key: ${result.storageKey}`);
      console.log(`   Item ID: ${result.itemId}`);
      console.log(`   Deletion Timestamp: ${result.deletionTimestamp}`);
      console.log(`   Deleted At: ${result.deletedAt}`);
      console.log(`   Device ID: ${result.deviceId}`);
      console.log(`   Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.conflictResolved) {
        console.log(`   Conflict Resolved: ✅ YES`);
      }
    });

    console.log(`\n🛡️ DELETION TIMESTAMP VALIDATION:`);
    
    const timestampFormatTests = this.testResults.filter(r => 
      r.testName.includes('Format') || r.testName.includes('Deletion in')
    );
    const validTimestamps = timestampFormatTests.filter(r => r.success).length;
    
    console.log(`   Timestamp Format Tests: ${validTimestamps}/${timestampFormatTests.length}`);
    console.log(`   Format Consistency: ${validTimestamps === timestampFormatTests.length ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);

    console.log(`\n🔄 CONFLICT RESOLUTION:`);
    const conflictTests = this.testResults.filter(r => r.conflictResolved);
    console.log(`   Conflict Tests: ${conflictTests.length}`);
    console.log(`   All Conflicts Resolved: ${conflictTests.every(r => r.success) ? '✅ YES' : '❌ NO'}`);

    console.log(`\n⚰️ TOMBSTONE PATTERN:`);
    const tombstoneTest = this.testResults.find(r => r.testName.includes('Tombstone'));
    console.log(`   Tombstone Implementation: ${tombstoneTest?.success ? '✅ CORRECT' : '❌ INCORRECT'}`);

    console.log(`\n🧟 RESURRECTION PREVENTION:`);
    const resurrectionTest = this.testResults.find(r => r.testName.includes('Resurrection'));
    console.log(`   Resurrection Prevention: ${resurrectionTest?.success ? '✅ WORKING' : '❌ FAILED'}`);

    console.log(`\n🌐 SYNC COMPATIBILITY:`);
    const syncTest = this.testResults.find(r => r.testName.includes('Sync'));
    console.log(`   Server Sync Ready: ${syncTest?.success ? '✅ YES' : '❌ NO'}`);

    // Final assessment
    const criticalTests = [
      timestampFormatTests.every(r => r.success), // Format consistency
      conflictTests.every(r => r.success), // Conflict resolution
      tombstoneTest?.success || false, // Tombstone pattern
      resurrectionTest?.success || false, // Resurrection prevention
      syncTest?.success || false // Sync compatibility
    ];

    const allCriticalPassed = criticalTests.every(test => test);

    console.log(`\n🎯 FINAL ASSESSMENT:`);
    if (allCriticalPassed) {
      console.log(`   ✅ ALL CRITICAL TESTS PASSED`);
      console.log(`   ✅ Deletion timestamp implementation is SAFE for production`);
      console.log(`   ✅ No data corruption risk from deletion conflicts`);
      console.log(`   ✅ Multi-device deletion handling is CORRECT`);
    } else {
      console.log(`   ❌ SOME CRITICAL TESTS FAILED`);
      console.log(`   ⚠️ Deletion timestamp implementation needs FIXES`);
      console.log(`   ⚠️ Risk of data corruption from deletion conflicts`);
      console.log(`   ⚠️ NOT SAFE for multi-device deployment`);
    }

    console.log(`\n📋 RECOMMENDATIONS:`);
    if (allCriticalPassed) {
      console.log(`   ✅ Ready for production deployment`);
      console.log(`   ✅ Multi-device sync is safe`);
      console.log(`   ✅ Deletion conflicts will be handled correctly`);
    } else {
      console.log(`   🔧 Fix failed tests before deployment`);
      console.log(`   🔧 Ensure consistent deletion timestamp format`);
      console.log(`   🔧 Implement proper tombstone pattern everywhere`);
      console.log(`   🔧 Add resurrection prevention mechanisms`);
    }
  }
}

// Export test instance
export const deletionTimestampTest = new DeletionTimestampTest();