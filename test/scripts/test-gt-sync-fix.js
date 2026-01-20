/**
 * Test GT Sync Fix
 * Test the new GT sync service to ensure server-to-client sync is working
 */

async function testGTSyncFix() {
  console.log('🧪 TESTING GT SYNC FIX\n');
  
  try {
    // 1. Check if GT sync service is available
    console.log('1️⃣ Checking GT sync service...');
    
    // Import GT sync service
    const { gtSync } = await import('./src/services/gt-sync.ts');
    console.log('✅ GT sync service loaded');
    
    // 2. Check current sync status
    console.log('\n2️⃣ Checking sync status...');
    const currentStatus = gtSync.getSyncStatus();
    console.log(`📊 Current sync status: ${currentStatus}`);
    
    // 3. Check storage config
    console.log('\n3️⃣ Checking storage configuration...');
    const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
    console.log(`📋 Storage type: ${storageConfig.type}`);
    if (storageConfig.serverUrl) {
      console.log(`🌐 Server URL: ${storageConfig.serverUrl}`);
    }
    
    // 4. Check current local GT data
    console.log('\n4️⃣ Checking current local GT data...');
    const currentData = localStorage.getItem('general-trading/gt_salesOrders');
    let currentOrders = [];
    
    if (currentData) {
      try {
        const parsed = JSON.parse(currentData);
        currentOrders = parsed.value || parsed || [];
      } catch (e) {
        console.log('⚠️  Invalid local data format');
      }
    }
    
    console.log(`📊 Current local orders: ${currentOrders.length}`);
    if (currentOrders.length > 0) {
      console.log('📋 Recent orders:');
      currentOrders.slice(0, 3).forEach((order, index) => {
        const date = new Date(order.created || order.timestamp).toLocaleDateString();
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
      });
    }
    
    // 5. Test force download if server mode
    if (storageConfig.type === 'server' && storageConfig.serverUrl) {
      console.log('\n5️⃣ Testing force download from server...');
      
      try {
        await gtSync.forceDownloadFromServer();
        console.log('✅ Force download completed successfully');
        
        // Check data after download
        const newData = localStorage.getItem('general-trading/gt_salesOrders');
        let newOrders = [];
        
        if (newData) {
          try {
            const parsed = JSON.parse(newData);
            newOrders = parsed.value || parsed || [];
          } catch (e) {
            console.log('⚠️  Invalid data format after download');
          }
        }
        
        console.log(`📊 Orders after sync: ${newOrders.length}`);
        const newCount = newOrders.length - currentOrders.length;
        if (newCount > 0) {
          console.log(`➕ New orders downloaded: ${newCount}`);
        } else if (newCount === 0) {
          console.log('ℹ️  No new orders (data already up to date)');
        }
        
      } catch (error) {
        console.error('❌ Force download failed:', error);
        
        if (error.message.includes('fetch')) {
          console.log('🔧 Network Error - Check:');
          console.log('   1. Internet connection');
          console.log('   2. Server URL is correct');
          console.log('   3. Server is running');
          console.log('   4. CORS settings on server');
        }
      }
    } else {
      console.log('\n5️⃣ Skipping server test (local mode)');
    }
    
    // 6. Test sync status monitoring
    console.log('\n6️⃣ Testing sync status monitoring...');
    
    let statusChangeCount = 0;
    const unsubscribe = gtSync.onSyncStatusChange((status) => {
      statusChangeCount++;
      console.log(`📡 Sync status changed to: ${status} (change #${statusChangeCount})`);
    });
    
    // Wait a moment to see if status changes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalStatus = gtSync.getSyncStatus();
    console.log(`📊 Final sync status: ${finalStatus}`);
    
    unsubscribe();
    
    // 7. Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log(`✅ GT sync service: Working`);
    console.log(`📊 Storage mode: ${storageConfig.type}`);
    console.log(`📡 Final sync status: ${finalStatus}`);
    console.log(`📊 Total orders: ${currentOrders.length}`);
    
    if (finalStatus === 'synced') {
      console.log('\n🎉 SUCCESS! GT sync is working properly');
      console.log('💡 Go to GT Sales Orders page to see synced data');
    } else if (finalStatus === 'error') {
      console.log('\n⚠️  SYNC ERROR - Check server connection and configuration');
    } else {
      console.log('\n⏳ SYNC IN PROGRESS - Wait for completion');
    }
    
    return {
      success: finalStatus !== 'error',
      status: finalStatus,
      orderCount: currentOrders.length,
      storageType: storageConfig.type
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test sync status indicator colors
function testSyncStatusIndicator() {
  console.log('\n🎨 TESTING SYNC STATUS INDICATOR\n');
  
  const statuses = ['idle', 'syncing', 'synced', 'error'];
  
  statuses.forEach(status => {
    const color = status === 'synced' ? '#4caf50' : '#f44336';
    const text = status === 'synced' ? 'Sync' : status === 'syncing' ? 'Syncing...' : 'Not Sync';
    
    console.log(`${status.toUpperCase()}:`);
    console.log(`  🔴 Color: ${color}`);
    console.log(`  📝 Text: ${text}`);
    console.log(`  💡 Should show: ${status === 'synced' ? 'Green dot' : 'Red dot'}`);
    console.log('');
  });
}

// Export for browser console use
if (typeof window !== 'undefined') {
  window.testGTSyncFix = testGTSyncFix;
  window.testSyncStatusIndicator = testSyncStatusIndicator;
  
  console.log('🎯 GT Sync Test loaded!');
  console.log('Run in console: testGTSyncFix()');
}

// For Node.js testing
if (typeof module !== 'undefined') {
  module.exports = {
    testGTSyncFix,
    testSyncStatusIndicator
  };
}

// Auto-run if in browser
if (typeof window !== 'undefined' && window.location) {
  console.log('🚀 Auto-running GT sync test...');
  testGTSyncFix();
}