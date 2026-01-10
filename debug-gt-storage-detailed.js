/**
 * Debug GT Storage Detailed
 * Deep dive into why only 1 order is read when file has 10 orders
 */

async function debugGTStorageDetailed() {
  console.log('🔍 DETAILED GT STORAGE DEBUG\n');
  
  // 1. Check raw localStorage content
  console.log('📂 STEP 1: RAW LOCALSTORAGE CONTENT\n');
  
  const storageKey = 'general-trading/gt_salesOrders';
  const rawData = localStorage.getItem(storageKey);
  
  if (rawData) {
    console.log(`📊 Raw localStorage size: ${rawData.length} characters`);
    console.log(`📋 First 200 chars: ${rawData.substring(0, 200)}...`);
    
    try {
      const parsed = JSON.parse(rawData);
      console.log(`📊 Parsed object keys: ${Object.keys(parsed)}`);
      
      if (parsed.value) {
        console.log(`📊 Value type: ${typeof parsed.value}`);
        console.log(`📊 Value is array: ${Array.isArray(parsed.value)}`);
        
        if (Array.isArray(parsed.value)) {
          console.log(`📊 Array length: ${parsed.value.length}`);
          
          // Check each order in detail
          console.log('\n📋 DETAILED ORDER ANALYSIS:');
          parsed.value.forEach((order, index) => {
            console.log(`\n   Order ${index + 1}:`);
            console.log(`     ID: ${order.id}`);
            console.log(`     SO No: ${order.soNo}`);
            console.log(`     Customer: ${order.customer}`);
            console.log(`     Status: ${order.status}`);
            console.log(`     Created: ${order.created}`);
            console.log(`     Deleted: ${order.deleted || 'false'}`);
            console.log(`     Items: ${order.items ? order.items.length : 0}`);
            
            // Check for any properties that might cause filtering
            const suspiciousProps = ['deleted', 'hidden', 'archived', 'inactive'];
            suspiciousProps.forEach(prop => {
              if (order[prop] !== undefined) {
                console.log(`     ${prop}: ${order[prop]}`);
              }
            });
          });
        }
      }
      
      if (parsed.timestamp) {
        console.log(`🕐 Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`);
      }
      
    } catch (e) {
      console.error('❌ JSON parse error:', e.message);
    }
  } else {
    console.log('❌ No raw data in localStorage');
  }
  
  // 2. Test storage service step by step
  console.log('\n📂 STEP 2: STORAGE SERVICE STEP BY STEP\n');
  
  try {
    const { storageService } = await import('./src/services/storage.ts');
    console.log('✅ Storage service imported');
    
    // Check storage config
    const config = storageService.getConfig();
    console.log(`📋 Storage config: ${JSON.stringify(config)}`);
    
    // Check business context
    const business = storageService.getBusinessContext();
    console.log(`🏢 Business context: ${business}`);
    
    // Test get method
    console.log('\n🧪 Testing storageService.get("gt_salesOrders")...');
    const result = await storageService.get('gt_salesOrders');
    
    console.log(`📊 Result type: ${typeof result}`);
    console.log(`📊 Result is array: ${Array.isArray(result)}`);
    console.log(`📊 Result length: ${result ? result.length : 'null'}`);
    
    if (result && Array.isArray(result)) {
      console.log('\n📋 Storage service returned orders:');
      result.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (deleted: ${order.deleted || 'false'})`);
      });
    } else if (result) {
      console.log(`📋 Result structure: ${Object.keys(result)}`);
    }
    
  } catch (error) {
    console.error('❌ Storage service error:', error);
  }
  
  // 3. Test filter function in isolation
  console.log('\n📂 STEP 3: FILTER FUNCTION ISOLATION TEST\n');
  
  try {
    const { filterActiveItems } = await import('./src/utils/gt-delete-helper.ts');
    console.log('✅ GT delete helper imported');
    
    // Create test data based on what we see in localStorage
    const testData = JSON.parse(localStorage.getItem(storageKey) || '{"value":[]}');
    const testOrders = testData.value || [];
    
    console.log(`📊 Test data: ${testOrders.length} orders`);
    
    if (testOrders.length > 0) {
      console.log('\n🧪 Testing filterActiveItems function...');
      
      // Test with original data
      const filtered = filterActiveItems(testOrders);
      console.log(`📊 Filtered result: ${filtered.length} orders`);
      
      if (filtered.length !== testOrders.length) {
        console.log(`⚠️  Filter removed ${testOrders.length - filtered.length} orders`);
        
        // Find what was removed
        const removed = testOrders.filter(order => !filtered.some(f => f.id === order.id));
        console.log('\n📋 Removed orders:');
        removed.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.soNo} - ${order.customer}`);
          console.log(`      Deleted: ${order.deleted}`);
          console.log(`      Status: ${order.status}`);
          
          // Check all properties that might cause filtering
          Object.keys(order).forEach(key => {
            if (key.includes('delet') || key.includes('remov') || key.includes('hidden')) {
              console.log(`      ${key}: ${order[key]}`);
            }
          });
        });
      }
      
      console.log('\n📋 Active orders after filtering:');
      filtered.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Filter function error:', error);
  }
  
  // 4. Test component loading simulation
  console.log('\n📂 STEP 4: COMPONENT LOADING SIMULATION\n');
  
  try {
    console.log('🧪 Simulating GT SalesOrders loadOrders function...');
    
    // Simulate exact same steps as component
    const { storageService } = await import('./src/services/storage.ts');
    const { filterActiveItems } = await import('./src/utils/gt-delete-helper.ts');
    
    console.log('1. Getting data from storage service...');
    const data = await storageService.get('gt_salesOrders') || [];
    console.log(`   Result: ${data.length} items`);
    
    console.log('2. Filtering active items...');
    const activeOrders = filterActiveItems(data);
    console.log(`   Result: ${activeOrders.length} items`);
    
    console.log('3. Final orders that would be set to state:');
    activeOrders.forEach((order, index) => {
      const date = new Date(order.created || order.timestamp).toLocaleDateString();
      console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
    });
    
    // Compare with actual log
    console.log('\n📊 COMPARISON WITH ACTUAL LOG:');
    console.log(`Expected: ${activeOrders.length} orders`);
    console.log(`Actual log: 1 order (PO-L-202512000214)`);
    
    if (activeOrders.length === 1) {
      console.log('✅ Simulation matches actual log');
      console.log('🔧 Problem: 9 orders are being filtered out');
    } else {
      console.log('❌ Simulation does not match actual log');
      console.log('🔧 Problem: Different issue than filtering');
    }
    
  } catch (error) {
    console.error('❌ Component simulation error:', error);
  }
  
  // 5. Check for data corruption or format issues
  console.log('\n📂 STEP 5: DATA INTEGRITY CHECK\n');
  
  const rawData2 = localStorage.getItem(storageKey);
  if (rawData2) {
    try {
      const parsed = JSON.parse(rawData2);
      const orders = parsed.value || [];
      
      console.log('🧪 Checking data integrity...');
      
      let validOrders = 0;
      let invalidOrders = 0;
      let deletedOrders = 0;
      
      orders.forEach((order, index) => {
        const hasId = order.id !== undefined;
        const hasSoNo = order.soNo !== undefined;
        const hasCustomer = order.customer !== undefined;
        const isDeleted = order.deleted === true;
        
        if (isDeleted) {
          deletedOrders++;
        } else if (hasId && hasSoNo && hasCustomer) {
          validOrders++;
        } else {
          invalidOrders++;
          console.log(`   ⚠️  Invalid order ${index + 1}: missing ${!hasId ? 'id' : ''} ${!hasSoNo ? 'soNo' : ''} ${!hasCustomer ? 'customer' : ''}`);
        }
      });
      
      console.log(`📊 Data integrity results:`);
      console.log(`   Valid orders: ${validOrders}`);
      console.log(`   Invalid orders: ${invalidOrders}`);
      console.log(`   Deleted orders: ${deletedOrders}`);
      console.log(`   Total orders: ${orders.length}`);
      
      if (deletedOrders === 9 && validOrders === 1) {
        console.log('\n🎯 FOUND THE PROBLEM!');
        console.log('❌ 9 orders are marked as deleted');
        console.log('✅ Only 1 order is active');
        console.log('\n💡 SOLUTION: Run quickRestoreDeletedOrders() to restore deleted orders');
      }
      
    } catch (e) {
      console.error('❌ Data integrity check failed:', e);
    }
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.debugGTStorageDetailed = debugGTStorageDetailed;
  
  console.log('🎯 GT Storage Detailed Debug loaded!');
  console.log('Run: debugGTStorageDetailed()');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  debugGTStorageDetailed();
}