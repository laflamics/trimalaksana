/**
 * Force Reload GT File Data
 * Force reload data from file system to localStorage for GT
 */

async function forceReloadGTFileData() {
  console.log('🔄 FORCE RELOAD GT FILE DATA\n');
  
  try {
    // Check if Electron API is available
    const electronAPI = (window as any).electronAPI;
    
    if (!electronAPI || !electronAPI.loadStorage) {
      console.log('⚠️  Electron API not available');
      console.log('💡 This function works only in Electron app');
      return;
    }
    
    console.log('✅ Electron API available');
    
    // 1. Try to load from file system
    const storageKey = 'general-trading/gt_salesOrders';
    console.log(`📂 Loading from file: ${storageKey}`);
    
    const result = await electronAPI.loadStorage(storageKey);
    
    if (result.success && result.data !== null) {
      console.log('✅ File data loaded successfully');
      
      const fileData = result.data;
      console.log(`📊 File data type: ${typeof fileData}`);
      
      // Extract orders from file data
      let orders = [];
      if (fileData.value && Array.isArray(fileData.value)) {
        orders = fileData.value;
        console.log(`📋 Found ${orders.length} orders in file data (wrapped format)`);
      } else if (Array.isArray(fileData)) {
        orders = fileData;
        console.log(`📋 Found ${orders.length} orders in file data (direct format)`);
      } else {
        console.log('⚠️  File data format not recognized');
        console.log('📋 File data structure:', Object.keys(fileData));
      }
      
      if (orders.length > 0) {
        // Force save to localStorage
        const dataToSave = {
          value: orders,
          timestamp: Date.now(),
          _timestamp: Date.now(),
          lastUpdate: new Date().toISOString(),
          reloadedFromFile: true,
          reloadedAt: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        console.log(`✅ Saved ${orders.length} orders to localStorage`);
        
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('app-storage-changed', {
          detail: { 
            key: storageKey,
            value: orders,
            action: 'file-reload'
          }
        }));
        
        console.log('✅ Triggered UI update event');
        
        // Show sample orders
        console.log('\n📋 Sample orders from file:');
        orders.slice(0, 5).forEach((order, index) => {
          const date = new Date(order.created || order.timestamp).toLocaleDateString();
          console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
        });
        
        console.log('\n🎉 SUCCESS! GT data reloaded from file');
        console.log('💡 Go to GT Sales Orders page to see the data');
        
        return {
          success: true,
          orderCount: orders.length,
          source: 'file'
        };
        
      } else {
        console.log('❌ No orders found in file data');
        return {
          success: false,
          error: 'No orders in file'
        };
      }
      
    } else {
      console.log('❌ Failed to load from file');
      console.log(`📋 Error: ${result.error || 'Unknown error'}`);
      
      return {
        success: false,
        error: result.error || 'File load failed'
      };
    }
    
  } catch (error) {
    console.error('❌ Force reload failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Alternative method using storage service
async function forceReloadUsingStorageService() {
  console.log('🔄 FORCE RELOAD USING STORAGE SERVICE\n');
  
  try {
    // Import storage service
    const { storageService } = await import('./src/services/storage.ts');
    console.log('✅ Storage service imported');
    
    // Force get data (this should load from file if available)
    const data = await storageService.get('gt_salesOrders');
    console.log(`📊 Storage service returned: ${data ? data.length : 'null'} orders`);
    
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('✅ Data loaded via storage service');
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { 
          key: 'general-trading/gt_salesOrders',
          value: data,
          action: 'storage-reload'
        }
      }));
      
      console.log('✅ Triggered UI update');
      console.log(`📊 Loaded ${data.length} orders`);
      
      return {
        success: true,
        orderCount: data.length,
        source: 'storage-service'
      };
      
    } else {
      console.log('❌ No data from storage service');
      return {
        success: false,
        error: 'No data from storage service'
      };
    }
    
  } catch (error) {
    console.error('❌ Storage service reload failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main reload function
async function runGTDataReload() {
  console.log('🚀 GT DATA RELOAD\n');
  
  // Check current business unit
  const selectedBusiness = localStorage.getItem('selectedBusiness');
  if (selectedBusiness !== 'general-trading') {
    console.log('⚠️  Please switch to General Trading business unit first');
    return;
  }
  
  console.log('✅ In General Trading business unit');
  
  // Try Electron file reload first
  console.log('\n📂 Method 1: Direct file reload...');
  const result1 = await forceReloadGTFileData();
  
  if (result1.success) {
    console.log(`\n🎉 SUCCESS! Reloaded ${result1.orderCount} orders from ${result1.source}`);
    return;
  }
  
  // Try storage service reload
  console.log('\n🔄 Method 2: Storage service reload...');
  const result2 = await forceReloadUsingStorageService();
  
  if (result2.success) {
    console.log(`\n🎉 SUCCESS! Reloaded ${result2.orderCount} orders from ${result2.source}`);
  } else {
    console.log('\n❌ Both methods failed');
    console.log('🔧 Manual steps:');
    console.log('   1. Check if file exists at correct path');
    console.log('   2. Restart Electron app');
    console.log('   3. Check file permissions');
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.forceReloadGTFileData = forceReloadGTFileData;
  window.forceReloadUsingStorageService = forceReloadUsingStorageService;
  window.runGTDataReload = runGTDataReload;
  
  console.log('🎯 GT File Data Reload loaded!');
  console.log('Commands:');
  console.log('  runGTDataReload() - Try all reload methods');
  console.log('  forceReloadGTFileData() - Direct file reload');
  console.log('  forceReloadUsingStorageService() - Storage service reload');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  console.log('🚀 Auto-running GT data reload...');
  runGTDataReload();
}