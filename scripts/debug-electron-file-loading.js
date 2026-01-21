/**
 * Debug Electron File Loading
 * Test why Electron loadStorage is not loading the correct file
 */

async function debugElectronFileLoading() {
  console.log('🔍 DEBUGGING ELECTRON FILE LOADING\n');
  
  // Check if Electron API is available
  const electronAPI = (window as any).electronAPI;
  
  if (!electronAPI) {
    console.log('❌ Electron API not available');
    console.log('💡 This debug only works in Electron app');
    return;
  }
  
  console.log('✅ Electron API available');
  
  if (!electronAPI.loadStorage) {
    console.log('❌ loadStorage method not available');
    return;
  }
  
  console.log('✅ loadStorage method available');
  
  // Test different storage keys
  const testKeys = [
    'gt_salesOrders',                    // Direct key
    'general-trading/gt_salesOrders',    // With business prefix (correct)
    'salesOrders',                       // Packaging key
    'general-trading/gt_quotations',     // Other GT key
  ];
  
  console.log('🧪 Testing different storage keys...\n');
  
  for (const key of testKeys) {
    console.log(`📂 Testing key: "${key}"`);
    
    try {
      const result = await electronAPI.loadStorage(key);
      
      console.log(`   Success: ${result.success}`);
      
      if (result.success && result.data) {
        const data = result.data;
        console.log(`   Data type: ${typeof data}`);
        
        if (data.value && Array.isArray(data.value)) {
          console.log(`   Orders count: ${data.value.length}`);
          if (data.value.length > 0) {
            console.log(`   First order: ${data.value[0].soNo} - ${data.value[0].customer}`);
          }
        } else if (Array.isArray(data)) {
          console.log(`   Orders count: ${data.length}`);
          if (data.length > 0) {
            console.log(`   First order: ${data[0].soNo} - ${data[0].customer}`);
          }
        } else {
          console.log(`   Data structure: ${Object.keys(data)}`);
        }
        
        if (data.timestamp) {
          console.log(`   Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
        }
        
      } else {
        console.log(`   Error: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`   Exception: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Test localStorage content for comparison
  console.log('📂 LOCALSTORAGE COMPARISON:\n');
  
  testKeys.forEach(key => {
    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        const orders = parsed.value || parsed || [];
        console.log(`✅ localStorage["${key}"]: ${Array.isArray(orders) ? orders.length : 'Not array'} orders`);
        if (Array.isArray(orders) && orders.length > 0) {
          console.log(`   First order: ${orders[0].soNo} - ${orders[0].customer}`);
        }
      } catch (e) {
        console.log(`❌ localStorage["${key}"]: Invalid JSON`);
      }
    } else {
      console.log(`❌ localStorage["${key}"]: Not found`);
    }
  });
  
  // Test business context
  console.log('\n🏢 BUSINESS CONTEXT:\n');
  
  const selectedBusiness = localStorage.getItem('selectedBusiness');
  console.log(`Selected business: ${selectedBusiness}`);
  
  // Simulate getBusinessContext
  let businessContext = 'packaging';
  if (selectedBusiness === 'general-trading' || selectedBusiness === 'trucking') {
    businessContext = selectedBusiness;
  }
  console.log(`Business context: ${businessContext}`);
  
  // Simulate getStorageKey for gt_salesOrders
  const key = 'gt_salesOrders';
  let storageKey = key;
  if (businessContext !== 'packaging') {
    storageKey = `${businessContext}/${key}`;
  }
  console.log(`Storage key for "${key}": "${storageKey}"`);
  
  // Test the exact key that should be used
  console.log('\n🎯 TESTING EXACT KEY THAT SHOULD BE USED:\n');
  
  try {
    console.log(`📂 Loading: "${storageKey}"`);
    const result = await electronAPI.loadStorage(storageKey);
    
    if (result.success && result.data) {
      const data = result.data;
      const orders = data.value || data || [];
      
      console.log(`✅ SUCCESS: Loaded ${Array.isArray(orders) ? orders.length : 'Not array'} orders`);
      
      if (Array.isArray(orders) && orders.length > 0) {
        console.log('📋 Orders from file:');
        orders.slice(0, 5).forEach((order, index) => {
          const date = new Date(order.created || order.timestamp).toLocaleDateString();
          console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
        });
        
        // Compare with what GT component shows
        console.log('\n📊 COMPARISON WITH GT COMPONENT:');
        console.log(`File has: ${orders.length} orders`);
        console.log(`GT shows: 1 order (PO-L-202512000214)`);
        
        const hasExpectedOrder = orders.some(o => o.soNo === 'PO-L-202512000214');
        console.log(`File contains PO-L-202512000214: ${hasExpectedOrder}`);
        
        if (!hasExpectedOrder) {
          console.log('❌ MISMATCH: GT shows order not in file');
          console.log('💡 GT is reading from localStorage, not file');
        } else {
          console.log('✅ File contains expected order');
        }
        
      }
      
    } else {
      console.log(`❌ FAILED: ${result.error || 'Unknown error'}`);
      console.log('💡 This explains why GT falls back to localStorage');
    }
    
  } catch (error) {
    console.log(`❌ EXCEPTION: ${error.message}`);
    console.log('💡 This explains why GT falls back to localStorage');
  }
}

// Quick fix to force reload from file
async function forceReloadFromFile() {
  console.log('🔧 FORCE RELOAD FROM FILE\n');
  
  const electronAPI = (window as any).electronAPI;
  
  if (!electronAPI || !electronAPI.loadStorage) {
    console.log('❌ Electron API not available');
    return;
  }
  
  const storageKey = 'general-trading/gt_salesOrders';
  
  try {
    console.log(`📂 Force loading: ${storageKey}`);
    const result = await electronAPI.loadStorage(storageKey);
    
    if (result.success && result.data) {
      const data = result.data;
      const orders = data.value || data || [];
      
      console.log(`✅ Loaded ${orders.length} orders from file`);
      
      // Force save to localStorage
      const dataToSave = {
        value: orders,
        timestamp: Date.now(),
        _timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
        forceReloadedFromFile: true,
        forceReloadedAt: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      console.log(`✅ Saved to localStorage: ${storageKey}`);
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { 
          key: storageKey,
          value: orders,
          action: 'force-file-reload'
        }
      }));
      
      console.log('✅ Triggered UI update');
      console.log('💡 Refresh GT Sales Orders page to see all orders');
      
    } else {
      console.log(`❌ Failed to load from file: ${result.error}`);
    }
    
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.debugElectronFileLoading = debugElectronFileLoading;
  window.forceReloadFromFile = forceReloadFromFile;
  
  console.log('🎯 Electron File Loading Debug loaded!');
  console.log('Commands:');
  console.log('  debugElectronFileLoading() - Full debug');
  console.log('  forceReloadFromFile() - Force reload from file');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  debugElectronFileLoading();
}