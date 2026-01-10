/**
 * Test GT LocalStorage
 * Simple test to check GT data in localStorage
 */

function testGTLocalStorage() {
  console.log('🧪 TESTING GT LOCALSTORAGE\n');
  
  // Check all possible storage keys
  const keys = [
    'general-trading/gt_salesOrders',
    'gt_salesOrders', 
    'generaltrading/gt_salesOrders',
    'salesOrders'
  ];
  
  console.log('📂 Checking localStorage keys...\n');
  
  let foundData = false;
  
  keys.forEach(key => {
    const data = localStorage.getItem(key);
    
    if (data) {
      console.log(`✅ FOUND DATA at key: ${key}`);
      
      try {
        const parsed = JSON.parse(data);
        
        // Check different data formats
        let orders = [];
        if (parsed.value && Array.isArray(parsed.value)) {
          orders = parsed.value;
          console.log(`   📊 Format: Wrapped (${orders.length} orders)`);
        } else if (Array.isArray(parsed)) {
          orders = parsed;
          console.log(`   📊 Format: Direct array (${orders.length} orders)`);
        } else {
          console.log(`   📊 Format: Unknown (${typeof parsed})`);
          console.log(`   📋 Keys: ${Object.keys(parsed)}`);
        }
        
        if (orders.length > 0) {
          foundData = true;
          console.log(`   📋 Sample orders:`);
          orders.slice(0, 3).forEach((order, index) => {
            const date = order.created ? new Date(order.created).toLocaleDateString() : 'No date';
            console.log(`      ${index + 1}. ${order.soNo || order.id} - ${order.customer || 'No customer'} (${date})`);
          });
          
          // Check for deleted items
          const deletedCount = orders.filter(o => o.deleted === true).length;
          const activeCount = orders.length - deletedCount;
          console.log(`   📊 Active: ${activeCount}, Deleted: ${deletedCount}`);
        }
        
        if (parsed.timestamp) {
          console.log(`   🕐 Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`);
        }
        
      } catch (e) {
        console.log(`   ❌ Invalid JSON: ${e.message}`);
      }
      
      console.log('');
      
    } else {
      console.log(`❌ No data at key: ${key}`);
    }
  });
  
  if (!foundData) {
    console.log('\n❌ NO GT DATA FOUND IN LOCALSTORAGE');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if file exists: /run/media/zelwar/Data2/Trimalaksana/trimalaksana2/data/localStorage/general-trading/gt_salesOrders.json');
    console.log('   2. Run: runGTDataReload() to force load from file');
    console.log('   3. Check Electron file loading');
  } else {
    console.log('\n✅ GT DATA FOUND IN LOCALSTORAGE');
    console.log('\n💡 If UI not showing data:');
    console.log('   1. Check GT SalesOrders component console logs');
    console.log('   2. Run: quickFixGTData() to trigger UI update');
    console.log('   3. Refresh GT Sales Orders page');
  }
}

// Quick check function
function quickGTCheck() {
  const key = 'general-trading/gt_salesOrders';
  const data = localStorage.getItem(key);
  
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const orders = parsed.value || parsed || [];
      console.log(`✅ GT Data: ${Array.isArray(orders) ? orders.length : 0} orders`);
      return orders.length;
    } catch (e) {
      console.log('❌ GT Data: Invalid format');
      return 0;
    }
  } else {
    console.log('❌ GT Data: Not found');
    return 0;
  }
}

// Force trigger UI update
function triggerGTUIUpdate() {
  console.log('🔄 Triggering GT UI update...');
  
  const key = 'general-trading/gt_salesOrders';
  const data = localStorage.getItem(key);
  
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const orders = parsed.value || parsed || [];
      
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { 
          key: key,
          value: orders,
          action: 'manual-trigger'
        }
      }));
      
      console.log(`✅ Triggered UI update for ${orders.length} orders`);
      
    } catch (e) {
      console.log('❌ Failed to trigger update: Invalid data format');
    }
  } else {
    console.log('❌ Failed to trigger update: No data found');
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.testGTLocalStorage = testGTLocalStorage;
  window.quickGTCheck = quickGTCheck;
  window.triggerGTUIUpdate = triggerGTUIUpdate;
  
  console.log('🎯 GT LocalStorage Test loaded!');
  console.log('Commands:');
  console.log('  testGTLocalStorage() - Full localStorage check');
  console.log('  quickGTCheck() - Quick data count');
  console.log('  triggerGTUIUpdate() - Force UI update');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  testGTLocalStorage();
}