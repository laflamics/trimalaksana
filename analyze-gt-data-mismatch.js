/**
 * Analyze GT Data Mismatch
 * Analyze why only 1 order is read when file has 10 orders
 */

async function analyzeGTDataMismatch() {
  console.log('🔍 ANALYZING GT DATA MISMATCH\n');
  
  // 1. Check file data vs localStorage data
  console.log('📂 STEP 1: CHECKING FILE VS LOCALSTORAGE\n');
  
  const storageKey = 'general-trading/gt_salesOrders';
  const localStorageData = localStorage.getItem(storageKey);
  
  if (localStorageData) {
    try {
      const parsed = JSON.parse(localStorageData);
      const orders = parsed.value || parsed || [];
      
      console.log(`📊 LocalStorage: ${Array.isArray(orders) ? orders.length : 'Not array'} orders`);
      console.log(`📋 LocalStorage format: ${parsed.value ? 'Wrapped' : 'Direct'}`);
      
      if (Array.isArray(orders) && orders.length > 0) {
        console.log('📋 LocalStorage orders:');
        orders.forEach((order, index) => {
          const date = new Date(order.created || order.timestamp).toLocaleDateString();
          const deleted = order.deleted ? ' (DELETED)' : '';
          console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})${deleted}`);
        });
        
        // Check for deleted items
        const deletedCount = orders.filter(o => o.deleted === true).length;
        const activeCount = orders.length - deletedCount;
        console.log(`\n📊 Total: ${orders.length}, Active: ${activeCount}, Deleted: ${deletedCount}`);
      }
      
    } catch (e) {
      console.log('❌ LocalStorage data invalid JSON');
    }
  } else {
    console.log('❌ No data in localStorage');
  }
  
  // 2. Test storage service get method
  console.log('\n📂 STEP 2: TESTING STORAGE SERVICE\n');
  
  try {
    const { storageService } = await import('./src/services/storage.ts');
    console.log('✅ Storage service imported');
    
    const storageData = await storageService.get('gt_salesOrders');
    console.log(`📊 Storage service returned: ${storageData ? storageData.length : 'null'} orders`);
    
    if (storageData && Array.isArray(storageData)) {
      console.log('📋 Storage service orders:');
      storageData.forEach((order, index) => {
        const date = new Date(order.created || order.timestamp).toLocaleDateString();
        const deleted = order.deleted ? ' (DELETED)' : '';
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})${deleted}`);
      });
      
      // Check for deleted items
      const deletedCount = storageData.filter(o => o.deleted === true).length;
      const activeCount = storageData.length - deletedCount;
      console.log(`\n📊 Total: ${storageData.length}, Active: ${activeCount}, Deleted: ${deletedCount}`);
    }
    
  } catch (error) {
    console.error('❌ Storage service error:', error);
  }
  
  // 3. Test filterActiveItems function
  console.log('\n📂 STEP 3: TESTING FILTER FUNCTION\n');
  
  try {
    const { filterActiveItems } = await import('./src/utils/gt-delete-helper.ts');
    console.log('✅ GT delete helper imported');
    
    // Get raw data again
    const rawData = await storageService.get('gt_salesOrders') || [];
    console.log(`📊 Raw data: ${rawData.length} orders`);
    
    const filteredData = filterActiveItems(rawData);
    console.log(`📊 After filtering: ${filteredData.length} orders`);
    
    if (filteredData.length !== rawData.length) {
      console.log(`⚠️  Filter removed ${rawData.length - filteredData.length} orders`);
      
      // Show what was filtered out
      const removedOrders = rawData.filter(order => !filteredData.includes(order));
      console.log('📋 Filtered out orders:');
      removedOrders.forEach((order, index) => {
        const date = new Date(order.created || order.timestamp).toLocaleDateString();
        const reason = order.deleted ? 'DELETED' : 'UNKNOWN';
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date}) - ${reason}`);
      });
    }
    
    if (filteredData.length > 0) {
      console.log('📋 Active orders after filtering:');
      filteredData.forEach((order, index) => {
        const date = new Date(order.created || order.timestamp).toLocaleDateString();
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Filter function error:', error);
  }
  
  // 4. Check if Electron file loading is working
  console.log('\n📂 STEP 4: TESTING ELECTRON FILE LOADING\n');
  
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.loadStorage) {
    try {
      const fileResult = await electronAPI.loadStorage(storageKey);
      
      if (fileResult.success && fileResult.data) {
        const fileData = fileResult.data;
        const fileOrders = fileData.value || fileData || [];
        
        console.log(`📊 File data: ${Array.isArray(fileOrders) ? fileOrders.length : 'Not array'} orders`);
        
        if (Array.isArray(fileOrders) && fileOrders.length > 0) {
          console.log('📋 File orders:');
          fileOrders.forEach((order, index) => {
            const date = new Date(order.created || order.timestamp).toLocaleDateString();
            const deleted = order.deleted ? ' (DELETED)' : '';
            console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})${deleted}`);
          });
        }
        
      } else {
        console.log('❌ Failed to load from file:', fileResult.error);
      }
      
    } catch (error) {
      console.error('❌ Electron file loading error:', error);
    }
  } else {
    console.log('⚠️  Electron API not available');
  }
  
  // 5. Summary and diagnosis
  console.log('\n📋 DIAGNOSIS SUMMARY\n');
  
  const localData = localStorage.getItem(storageKey);
  let localCount = 0;
  let deletedCount = 0;
  
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      const orders = parsed.value || parsed || [];
      localCount = Array.isArray(orders) ? orders.length : 0;
      deletedCount = Array.isArray(orders) ? orders.filter(o => o.deleted === true).length : 0;
    } catch (e) {
      // Invalid data
    }
  }
  
  console.log(`📊 File should have: 10 orders (from your file)`);
  console.log(`📊 LocalStorage has: ${localCount} orders`);
  console.log(`📊 Deleted items: ${deletedCount} orders`);
  console.log(`📊 Active items: ${localCount - deletedCount} orders`);
  console.log(`📊 UI shows: 1 order (from log)`);
  
  if (localCount < 10) {
    console.log('\n❌ PROBLEM: File data not fully loaded to localStorage');
    console.log('🔧 SOLUTIONS:');
    console.log('   1. Restart Electron app to reload file data');
    console.log('   2. Run: runGTDataReload() to force file reload');
    console.log('   3. Check file permissions and path');
  } else if (localCount - deletedCount < localCount) {
    console.log('\n⚠️  PROBLEM: Some orders marked as deleted');
    console.log('🔧 SOLUTIONS:');
    console.log('   1. Check why orders are marked deleted');
    console.log('   2. Clean up deleted items or restore them');
    console.log('   3. Check delete helper logic');
  } else if (localCount === 10 && localCount - deletedCount === 1) {
    console.log('\n⚠️  PROBLEM: 9 orders marked as deleted, only 1 active');
    console.log('🔧 SOLUTIONS:');
    console.log('   1. Restore deleted orders');
    console.log('   2. Check what caused mass deletion');
    console.log('   3. Review delete helper filter logic');
  } else {
    console.log('\n❓ PROBLEM: Unknown data mismatch');
    console.log('🔧 Need deeper investigation');
  }
}

// Quick fix to restore deleted orders
async function quickRestoreDeletedOrders() {
  console.log('🔧 QUICK RESTORE DELETED ORDERS\n');
  
  try {
    const storageKey = 'general-trading/gt_salesOrders';
    const data = localStorage.getItem(storageKey);
    
    if (!data) {
      console.log('❌ No data found');
      return;
    }
    
    const parsed = JSON.parse(data);
    const orders = parsed.value || parsed || [];
    
    if (!Array.isArray(orders)) {
      console.log('❌ Data is not array');
      return;
    }
    
    console.log(`📊 Total orders: ${orders.length}`);
    
    const deletedOrders = orders.filter(o => o.deleted === true);
    console.log(`📊 Deleted orders: ${deletedOrders.length}`);
    
    if (deletedOrders.length > 0) {
      console.log('📋 Restoring deleted orders:');
      deletedOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer}`);
        delete order.deleted;
        delete order.deletedAt;
        delete order.deletedTimestamp;
      });
      
      // Save restored data
      const restoredData = {
        ...parsed,
        value: orders,
        timestamp: Date.now(),
        _timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
        restoredAt: new Date().toISOString(),
        restoredCount: deletedOrders.length
      };
      
      localStorage.setItem(storageKey, JSON.stringify(restoredData));
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { 
          key: storageKey,
          value: orders,
          action: 'restore-deleted'
        }
      }));
      
      console.log(`✅ Restored ${deletedOrders.length} deleted orders`);
      console.log('💡 Refresh GT Sales Orders page to see all orders');
      
    } else {
      console.log('ℹ️  No deleted orders to restore');
    }
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.analyzeGTDataMismatch = analyzeGTDataMismatch;
  window.quickRestoreDeletedOrders = quickRestoreDeletedOrders;
  
  console.log('🎯 GT Data Mismatch Analyzer loaded!');
  console.log('Commands:');
  console.log('  analyzeGTDataMismatch() - Full analysis');
  console.log('  quickRestoreDeletedOrders() - Restore deleted orders');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  analyzeGTDataMismatch();
}