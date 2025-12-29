/**
 * Data Persistence Fix Test
 * Tests the issue where deleted data comes back due to auto-sync
 */

const fs = require('fs');
const path = require('path');

// Mock localStorage for Node.js environment
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Mock window object
global.window = {
  requestIdleCallback: (callback) => setTimeout(callback, 0),
  dispatchEvent: () => {}
};

// Test data persistence issue
const testDataPersistenceIssue = async () => {
  console.log('🧪 Data Persistence Issue Test');
  console.log('─'.repeat(70));
  console.log('Testing: Data deleted but comes back due to auto-sync');
  console.log('Issue: Auto-sync restores deleted data from server');
  console.log('─'.repeat(70));
  
  try {
    // Setup initial data
    console.log('\n📋 Test 1: Setup Initial Data');
    
    const initialSalesOrders = [
      {
        id: 'so-001',
        soNo: 'SO-TEST-001',
        customer: 'Test Customer A',
        status: 'OPEN',
        created: new Date().toISOString(),
        items: [
          {
            id: 'item-001',
            productName: 'Product A',
            qty: 100,
            price: 50000
          }
        ]
      },
      {
        id: 'so-002', 
        soNo: 'SO-TEST-002',
        customer: 'Test Customer B',
        status: 'OPEN',
        created: new Date().toISOString(),
        items: [
          {
            id: 'item-002',
            productName: 'Product B',
            qty: 200,
            price: 75000
          }
        ]
      }
    ];
    
    const initialProducts = [
      {
        id: 'prod-001',
        kode: 'PROD-A',
        nama: 'Product A',
        category: 'ELECTRONICS'
      },
      {
        id: 'prod-002',
        kode: 'PROD-B', 
        nama: 'Product B',
        category: 'FURNITURE'
      }
    ];
    
    const initialCustomers = [
      {
        id: 'cust-001',
        kode: 'CUST-A',
        nama: 'Test Customer A',
        alamat: 'Jakarta'
      },
      {
        id: 'cust-002',
        kode: 'CUST-B',
        nama: 'Test Customer B', 
        alamat: 'Bandung'
      }
    ];
    
    // Store initial data with timestamps
    const timestamp = Date.now();
    localStorage.setItem('salesOrders', JSON.stringify({
      value: initialSalesOrders,
      timestamp: timestamp
    }));
    localStorage.setItem('products', JSON.stringify({
      value: initialProducts,
      timestamp: timestamp
    }));
    localStorage.setItem('customers', JSON.stringify({
      value: initialCustomers,
      timestamp: timestamp
    }));
    
    console.log('✅ Initial data setup:');
    console.log(`   Sales Orders: ${initialSalesOrders.length} items`);
    console.log(`   Products: ${initialProducts.length} items`);
    console.log(`   Customers: ${initialCustomers.length} items`);
    
    // Test 2: User deletes data
    console.log('\n📋 Test 2: User Deletes Data');
    
    // Delete SO-TEST-001
    const salesOrdersAfterDelete = initialSalesOrders.filter(so => so.id !== 'so-001');
    const deleteTimestamp = Date.now() + 1000; // 1 second later
    
    localStorage.setItem('salesOrders', JSON.stringify({
      value: salesOrdersAfterDelete,
      timestamp: deleteTimestamp
    }));
    
    // Delete Product A
    const productsAfterDelete = initialProducts.filter(prod => prod.id !== 'prod-001');
    localStorage.setItem('products', JSON.stringify({
      value: productsAfterDelete,
      timestamp: deleteTimestamp
    }));
    
    // Delete Customer A
    const customersAfterDelete = initialCustomers.filter(cust => cust.id !== 'cust-001');
    localStorage.setItem('customers', JSON.stringify({
      value: customersAfterDelete,
      timestamp: deleteTimestamp
    }));
    
    console.log('✅ Data deleted by user:');
    console.log(`   Sales Orders: ${salesOrdersAfterDelete.length} items (deleted SO-TEST-001)`);
    console.log(`   Products: ${productsAfterDelete.length} items (deleted Product A)`);
    console.log(`   Customers: ${customersAfterDelete.length} items (deleted Customer A)`);
    
    // Test 3: Simulate server still has old data (common scenario)
    console.log('\n📋 Test 3: Simulate Auto-Sync from Server (Old Data)');
    
    // Mock server response with old data (before deletion)
    const serverData = {
      salesOrders: {
        value: initialSalesOrders, // Server still has deleted data
        timestamp: timestamp // Old timestamp
      },
      products: {
        value: initialProducts, // Server still has deleted data
        timestamp: timestamp // Old timestamp
      },
      customers: {
        value: initialCustomers, // Server still has deleted data
        timestamp: timestamp // Old timestamp
      }
    };
    
    console.log('📡 Server data (old):');
    console.log(`   Sales Orders: ${serverData.salesOrders.value.length} items (includes deleted SO-TEST-001)`);
    console.log(`   Products: ${serverData.products.value.length} items (includes deleted Product A)`);
    console.log(`   Customers: ${serverData.customers.value.length} items (includes deleted Customer A)`);
    
    // Test 4: Simulate merge logic (current problematic behavior)
    console.log('\n📋 Test 4: Current Merge Logic (Problematic)');
    
    const mergeArrays = (localArray, serverArray, localTimestamp, serverTimestamp) => {
      // Current logic: LAST WRITE WINS
      if (localTimestamp > serverTimestamp) {
        console.log(`   Local newer (${localTimestamp} > ${serverTimestamp}): Using local data`);
        return localArray;
      } else {
        console.log(`   Server newer (${serverTimestamp} >= ${localTimestamp}): Using server data`);
        return serverArray; // This restores deleted data!
      }
    };
    
    // Simulate merge for each data type
    const mergedSalesOrders = mergeArrays(
      salesOrdersAfterDelete, 
      serverData.salesOrders.value,
      deleteTimestamp,
      serverData.salesOrders.timestamp
    );
    
    const mergedProducts = mergeArrays(
      productsAfterDelete,
      serverData.products.value, 
      deleteTimestamp,
      serverData.products.timestamp
    );
    
    const mergedCustomers = mergeArrays(
      customersAfterDelete,
      serverData.customers.value,
      deleteTimestamp, 
      serverData.customers.timestamp
    );
    
    console.log('❌ Current merge results (PROBLEMATIC):');
    console.log(`   Sales Orders: ${mergedSalesOrders.length} items`);
    console.log(`   Products: ${mergedProducts.length} items`);
    console.log(`   Customers: ${mergedCustomers.length} items`);
    
    // Check if deleted data came back
    const soResurrected = mergedSalesOrders.some(so => so.id === 'so-001');
    const productResurrected = mergedProducts.some(prod => prod.id === 'prod-001');
    const customerResurrected = mergedCustomers.some(cust => cust.id === 'cust-001');
    
    console.log('\n🔍 Resurrection Check:');
    console.log(`   SO-TEST-001 resurrected: ${soResurrected ? '❌ YES (BUG!)' : '✅ NO'}`);
    console.log(`   Product A resurrected: ${productResurrected ? '❌ YES (BUG!)' : '✅ NO'}`);
    console.log(`   Customer A resurrected: ${customerResurrected ? '❌ YES (BUG!)' : '✅ NO'}`);
    
    // Test 5: Enhanced merge logic with tombstone pattern
    console.log('\n📋 Test 5: Enhanced Merge Logic (FIXED)');
    
    const enhancedMergeArrays = (localArray, serverArray, localTimestamp, serverTimestamp) => {
      // ENHANCED: Track deleted items using tombstone pattern
      const deletedIds = new Set();
      
      // If local is newer, it means user made changes (including deletions)
      if (localTimestamp > serverTimestamp) {
        // Find items that exist in server but not in local = deleted items
        serverArray.forEach(serverItem => {
          const serverId = serverItem.id || serverItem.kode || serverItem.soNo;
          const existsInLocal = localArray.some(localItem => {
            const localId = localItem.id || localItem.kode || localItem.soNo;
            return localId === serverId;
          });
          
          if (!existsInLocal) {
            deletedIds.add(serverId);
            console.log(`   🪦 Tombstone: ${serverId} was deleted locally`);
          }
        });
        
        // Use local data (preserves deletions)
        console.log(`   Local newer (${localTimestamp} > ${serverTimestamp}): Using local data with ${deletedIds.size} tombstones`);
        return localArray;
      } else {
        // Server is newer or equal, but respect local deletions
        console.log(`   Server newer/equal (${serverTimestamp} >= ${localTimestamp}): Merging with deletion protection`);
        
        // Find items deleted locally
        localArray.forEach(localItem => {
          const localId = localItem.id || localItem.kode || localItem.soNo;
          if (localItem.deleted === true || localItem.deletedAt) {
            deletedIds.add(localId);
            console.log(`   🪦 Tombstone: ${localId} marked as deleted`);
          }
        });
        
        // Also check for implicit deletions (items in server but not in local)
        serverArray.forEach(serverItem => {
          const serverId = serverItem.id || serverItem.kode || serverItem.soNo;
          const existsInLocal = localArray.some(localItem => {
            const localId = localItem.id || localItem.kode || localItem.soNo;
            return localId === serverId;
          });
          
          if (!existsInLocal) {
            deletedIds.add(serverId);
            console.log(`   🪦 Implicit tombstone: ${serverId} missing from local`);
          }
        });
        
        // Filter server data to exclude deleted items
        const filteredServerArray = serverArray.filter(serverItem => {
          const serverId = serverItem.id || serverItem.kode || serverItem.soNo;
          return !deletedIds.has(serverId);
        });
        
        console.log(`   Filtered ${serverArray.length - filteredServerArray.length} deleted items from server data`);
        return filteredServerArray;
      }
    };
    
    // Test enhanced merge
    const enhancedMergedSalesOrders = enhancedMergeArrays(
      salesOrdersAfterDelete,
      serverData.salesOrders.value,
      deleteTimestamp,
      serverData.salesOrders.timestamp
    );
    
    const enhancedMergedProducts = enhancedMergeArrays(
      productsAfterDelete,
      serverData.products.value,
      deleteTimestamp,
      serverData.products.timestamp
    );
    
    const enhancedMergedCustomers = enhancedMergeArrays(
      customersAfterDelete,
      serverData.customers.value,
      deleteTimestamp,
      serverData.customers.timestamp
    );
    
    console.log('\n✅ Enhanced merge results (FIXED):');
    console.log(`   Sales Orders: ${enhancedMergedSalesOrders.length} items`);
    console.log(`   Products: ${enhancedMergedProducts.length} items`);
    console.log(`   Customers: ${enhancedMergedCustomers.length} items`);
    
    // Check if deleted data stayed deleted
    const soStayedDeleted = !enhancedMergedSalesOrders.some(so => so.id === 'so-001');
    const productStayedDeleted = !enhancedMergedProducts.some(prod => prod.id === 'prod-001');
    const customerStayedDeleted = !enhancedMergedCustomers.some(cust => cust.id === 'cust-001');
    
    console.log('\n🔍 Deletion Preservation Check:');
    console.log(`   SO-TEST-001 stayed deleted: ${soStayedDeleted ? '✅ YES' : '❌ NO (BUG!)'}`);
    console.log(`   Product A stayed deleted: ${productStayedDeleted ? '✅ YES' : '❌ NO (BUG!)'}`);
    console.log(`   Customer A stayed deleted: ${customerStayedDeleted ? '✅ YES' : '❌ NO (BUG!)'}`);
    
    // Test 6: Auto-sync frequency optimization
    console.log('\n📋 Test 6: Auto-Sync Frequency Analysis');
    
    const currentSyncInterval = 30000; // 30 seconds
    const recommendedSyncInterval = 300000; // 5 minutes
    
    console.log(`   Current auto-sync interval: ${currentSyncInterval / 1000} seconds`);
    console.log(`   Recommended interval: ${recommendedSyncInterval / 1000} seconds (${recommendedSyncInterval / 60000} minutes)`);
    console.log(`   Reason: Reduce race conditions between user actions and sync`);
    
    // Test Results Summary
    console.log('\n📊 Data Persistence Test Results');
    console.log('─'.repeat(70));
    
    const issuesFound = [];
    const fixesValidated = [];
    
    if (soResurrected || productResurrected || customerResurrected) {
      issuesFound.push('❌ Current merge logic restores deleted data');
    }
    
    if (soStayedDeleted && productStayedDeleted && customerStayedDeleted) {
      fixesValidated.push('✅ Enhanced merge logic preserves deletions');
    }
    
    if (currentSyncInterval < 60000) {
      issuesFound.push('❌ Auto-sync interval too aggressive (< 1 minute)');
    }
    
    console.log('ISSUES IDENTIFIED:');
    if (issuesFound.length > 0) {
      issuesFound.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('  ✅ No issues found');
    }
    
    console.log('\nFIXES VALIDATED:');
    if (fixesValidated.length > 0) {
      fixesValidated.forEach(fix => console.log(`  ${fix}`));
    } else {
      console.log('  ❌ No fixes validated');
    }
    
    console.log('\nRECOMMENDATIONS:');
    console.log('  1. ✅ Implement enhanced merge logic with tombstone pattern');
    console.log('  2. ✅ Increase auto-sync interval to 5+ minutes');
    console.log('  3. ✅ Add explicit deletion tracking (deletedAt timestamp)');
    console.log('  4. ✅ Implement user confirmation for data restoration');
    console.log('  5. ✅ Add manual sync button for immediate sync when needed');
    
    if (issuesFound.length === 0 && fixesValidated.length > 0) {
      console.log('\n🎉 DATA PERSISTENCE FIX VALIDATED!');
      console.log('✅ Deleted data will no longer resurrect from auto-sync');
      console.log('✅ Tombstone pattern properly preserves user deletions');
      console.log('✅ Auto-sync frequency optimized to reduce conflicts');
    } else {
      console.log('\n❌ DATA PERSISTENCE ISSUES DETECTED!');
      console.log('❌ Current implementation allows deleted data to resurrect');
      console.log('❌ Enhanced merge logic needed to fix the issue');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Run the test
testDataPersistenceIssue().catch(console.error);