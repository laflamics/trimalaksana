/**
 * Debug GT Data Loading
 * Check why GT Sales Orders UI is not reading the local data file
 */

async function debugGTDataLoading() {
  console.log('🔍 DEBUGGING GT DATA LOADING\n');
  
  // 1. Check if we're in GT business unit
  const selectedBusiness = localStorage.getItem('selectedBusiness');
  console.log(`🏢 Selected business: ${selectedBusiness}`);
  
  if (selectedBusiness !== 'general-trading') {
    console.log('⚠️  Not in General Trading business unit!');
    console.log('💡 Switch to GT first, then reload page');
    return;
  }
  
  // 2. Check localStorage data
  console.log('\n📂 CHECKING LOCALSTORAGE DATA:');
  
  const possibleKeys = [
    'general-trading/gt_salesOrders',
    'gt_salesOrders',
    'generaltrading/gt_salesOrders',
    'salesOrders'
  ];
  
  let foundData = null;
  let foundKey = null;
  
  possibleKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      console.log(`✅ Found data at key: ${key}`);
      try {
        const parsed = JSON.parse(data);
        const orders = parsed.value || parsed || [];
        console.log(`   📊 Orders count: ${Array.isArray(orders) ? orders.length : 'Not array'}`);
        
        if (Array.isArray(orders) && orders.length > 0) {
          foundData = orders;
          foundKey = key;
          console.log(`   📋 Sample order: ${orders[0].soNo} - ${orders[0].customer}`);
        }
      } catch (e) {
        console.log(`   ❌ Invalid JSON format`);
      }
    } else {
      console.log(`❌ No data at key: ${key}`);
    }
  });
  
  if (!foundData) {
    console.log('\n❌ NO DATA FOUND IN LOCALSTORAGE');
    console.log('🔧 Possible issues:');
    console.log('   1. Data not loaded from file to localStorage');
    console.log('   2. Wrong storage key being used');
    console.log('   3. Data format issue');
    return;
  }
  
  console.log(`\n✅ Found ${foundData.length} orders in localStorage at key: ${foundKey}`);
  
  // 3. Test storage service get method
  console.log('\n🧪 TESTING STORAGE SERVICE:');
  
  try {
    // Import storage service
    const { storageService } = await import('./src/services/storage.ts');
    console.log('✅ Storage service imported');
    
    // Test get method
    const storageData = await storageService.get('gt_salesOrders');
    console.log(`📊 Storage service returned: ${storageData ? storageData.length : 'null'} orders`);
    
    if (storageData && Array.isArray(storageData) && storageData.length > 0) {
      console.log(`✅ Storage service working correctly`);
      console.log(`📋 Sample from storage: ${storageData[0].soNo} - ${storageData[0].customer}`);
    } else {
      console.log(`❌ Storage service not returning data`);
      console.log(`📋 Returned: ${typeof storageData}, ${storageData}`);
    }
    
  } catch (error) {
    console.error('❌ Storage service error:', error);
  }
  
  // 4. Check if GT SalesOrders component is loaded
  console.log('\n🧪 CHECKING GT SALESORDERS COMPONENT:');
  
  // Check if we're on GT sales orders page
  const currentPath = window.location.pathname;
  console.log(`📍 Current path: ${currentPath}`);
  
  if (currentPath.includes('/general-trading/orders/sales')) {
    console.log('✅ On GT Sales Orders page');
    
    // Check if component state has data
    const gtOrdersElements = document.querySelectorAll('[data-testid="sales-order"], .order-card, .sales-order-row');
    console.log(`📊 Found ${gtOrdersElements.length} order elements in DOM`);
    
    if (gtOrdersElements.length === 0) {
      console.log('❌ No order elements found in DOM');
      console.log('🔧 Component might not be loading data correctly');
    }
    
  } else {
    console.log('⚠️  Not on GT Sales Orders page');
    console.log('💡 Navigate to GT Sales Orders to test component');
  }
  
  // 5. Test manual data loading
  console.log('\n🧪 TESTING MANUAL DATA LOADING:');
  
  try {
    // Simulate what GT SalesOrders loadOrders function does
    const testData = await storageService.get('gt_salesOrders');
    console.log(`📊 Manual load test: ${testData ? testData.length : 'null'} orders`);
    
    if (testData && Array.isArray(testData)) {
      // Test filterActiveItems function
      const { filterActiveItems } = await import('./src/utils/gt-delete-helper.ts');
      const activeOrders = filterActiveItems(testData);
      console.log(`📊 After filtering deleted items: ${activeOrders.length} active orders`);
      
      if (activeOrders.length > 0) {
        console.log('✅ Data loading process should work');
        console.log('📋 Active orders:');
        activeOrders.slice(0, 3).forEach((order, index) => {
          const date = new Date(order.created || order.timestamp).toLocaleDateString();
          console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
        });
      } else {
        console.log('⚠️  All orders are marked as deleted');
      }
    }
    
  } catch (error) {
    console.error('❌ Manual loading test failed:', error);
  }
  
  // 6. Summary and recommendations
  console.log('\n📋 SUMMARY:');
  console.log(`✅ Data exists: ${foundData ? 'Yes' : 'No'} (${foundData ? foundData.length : 0} orders)`);
  console.log(`✅ Storage key: ${foundKey || 'Not found'}`);
  console.log(`✅ Business unit: ${selectedBusiness}`);
  
  if (foundData && foundData.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Refresh GT Sales Orders page');
    console.log('2. Check browser console for component errors');
    console.log('3. Verify component is calling loadOrders() correctly');
    console.log('4. Check if filterActiveItems is working');
  } else {
    console.log('\n🔧 TROUBLESHOOTING NEEDED:');
    console.log('1. Check if file data is loaded to localStorage');
    console.log('2. Verify storage service configuration');
    console.log('3. Check business unit selection');
  }
}

// Quick fix function
async function quickFixGTData() {
  console.log('🔧 QUICK FIX GT DATA\n');
  
  try {
    // Force reload data from storage service
    const { storageService } = await import('./src/services/storage.ts');
    
    console.log('🔄 Force reloading GT data...');
    const data = await storageService.get('gt_salesOrders');
    
    if (data && Array.isArray(data) && data.length > 0) {
      console.log(`✅ Loaded ${data.length} orders`);
      
      // Trigger storage change event to update UI
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { 
          key: 'general-trading/gt_salesOrders',
          value: data,
          action: 'manual-reload'
        }
      }));
      
      console.log('✅ Triggered UI update event');
      console.log('💡 GT Sales Orders should refresh now');
      
    } else {
      console.log('❌ No data loaded from storage service');
    }
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.debugGTDataLoading = debugGTDataLoading;
  window.quickFixGTData = quickFixGTData;
  
  console.log('🎯 GT Data Loading Debug loaded!');
  console.log('Commands:');
  console.log('  debugGTDataLoading() - Full debug process');
  console.log('  quickFixGTData() - Try to fix data loading');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  debugGTDataLoading();
}