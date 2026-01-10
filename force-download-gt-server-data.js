/**
 * Force Download GT Server Data
 * Download GT sales orders from server when local device is not syncing
 */

// Mock fetch for testing (replace with actual server URL)
const SERVER_URL = 'https://server-tljp.tail75a421.ts.net';

async function forceDownloadGTSalesOrders() {
  console.log('🌐 Force downloading GT Sales Orders from server...\n');
  
  try {
    // 1. Check current local data
    console.log('📂 Checking current local data...');
    const storageKey = 'general-trading/gt_salesOrders';
    const currentData = localStorage.getItem(storageKey);
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
    
    // 2. Download from server (server also uses general-trading/ with dash)
    console.log('\n🌐 Downloading from server...');
    const encodedKey = encodeURIComponent(storageKey);
    const serverUrl = `${SERVER_URL}/api/storage/${encodedKey}`;
    
    console.log(`📡 Storage key: ${storageKey}`);
    console.log(`📡 Server URL: ${serverUrl}`);
    
    const response = await fetch(serverUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const serverData = await response.json();
    console.log('✅ Server response received');
    
    // 3. Process server data
    let serverOrders = [];
    if (serverData && serverData.value && Array.isArray(serverData.value)) {
      serverOrders = serverData.value;
    } else if (Array.isArray(serverData)) {
      serverOrders = serverData;
    } else {
      console.log('⚠️  Server returned unexpected data format:', typeof serverData);
      return;
    }
    
    console.log(`📊 Server orders: ${serverOrders.length}`);
    
    if (serverOrders.length === 0) {
      console.log('❌ No orders found on server');
      return;
    }
    
    // 4. Show server orders
    console.log('\n📋 Orders from server:');
    serverOrders.forEach((order, index) => {
      const date = new Date(order.created || order.timestamp).toLocaleDateString();
      console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
    });
    
    // 5. Merge with local data (avoid duplicates)
    console.log('\n🔄 Merging with local data...');
    const mergedOrders = [...currentOrders];
    let newCount = 0;
    
    serverOrders.forEach(serverOrder => {
      const exists = currentOrders.some(localOrder => 
        localOrder.id === serverOrder.id || 
        localOrder.soNo === serverOrder.soNo
      );
      
      if (!exists) {
        mergedOrders.push(serverOrder);
        newCount++;
        console.log(`   ➕ Added: ${serverOrder.soNo} - ${serverOrder.customer}`);
      } else {
        console.log(`   ⏭️  Skipped (exists): ${serverOrder.soNo}`);
      }
    });
    
    // 6. Save merged data
    const finalData = {
      value: mergedOrders,
      timestamp: Date.now(),
      _timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      syncedFromServer: true,
      serverSyncAt: new Date().toISOString(),
      serverOrderCount: serverOrders.length,
      newOrdersAdded: newCount
    };
    
    localStorage.setItem(storageKey, JSON.stringify(finalData));
    
    console.log('\n✅ Data successfully downloaded and merged!');
    console.log(`📊 Total orders: ${mergedOrders.length}`);
    console.log(`➕ New orders added: ${newCount}`);
    
    // 7. Trigger UI update
    console.log('\n🔄 Triggering UI update...');
    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { 
        key: storageKey,
        value: mergedOrders,
        action: 'server-sync'
      }
    }));
    
    console.log('✅ UI update event dispatched');
    console.log('💡 Refresh GT Sales Orders page to see new data');
    
    return {
      success: true,
      serverCount: serverOrders.length,
      localCount: currentOrders.length,
      totalCount: mergedOrders.length,
      newCount: newCount
    };
    
  } catch (error) {
    console.error('❌ Failed to download from server:', error);
    
    // Show detailed error info
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('🔧 Network Error - Check:');
      console.log('   1. Internet connection');
      console.log('   2. Server URL is correct');
      console.log('   3. Server is running');
      console.log('   4. CORS settings on server');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Alternative method using storage service
async function forceDownloadUsingStorageService() {
  console.log('🔧 Alternative: Using storage service for download...\n');
  
  try {
    // Import storage service
    const { storageService } = await import('./src/services/storage.ts');
    
    console.log('✅ Storage service loaded');
    
    // Force get from server (bypass cache)
    console.log('🌐 Forcing server fetch...');
    
    // Clear local cache first
    localStorage.removeItem('general-trading/gt_salesOrders');
    console.log('🗑️  Local cache cleared');
    
    // Get fresh data from server
    const serverData = await storageService.get('gt_salesOrders');
    console.log(`📊 Downloaded ${serverData?.length || 0} orders from server`);
    
    if (serverData && serverData.length > 0) {
      console.log('\n📋 Downloaded orders:');
      serverData.forEach((order, index) => {
        const date = new Date(order.created || order.timestamp).toLocaleDateString();
        console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
      });
      
      console.log('\n✅ Data downloaded successfully!');
      console.log('💡 Refresh GT Sales Orders page to see new data');
      
      return {
        success: true,
        count: serverData.length
      };
    } else {
      console.log('❌ No data received from server');
      return {
        success: false,
        error: 'No data from server'
      };
    }
    
  } catch (error) {
    console.error('❌ Storage service method failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check server connectivity
async function checkServerConnectivity() {
  console.log('🔍 Checking server connectivity...\n');
  
  try {
    const healthUrl = `${SERVER_URL}/api/health`;
    console.log(`📡 Testing: ${healthUrl}`);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Server is reachable');
      return true;
    } else {
      console.log(`⚠️  Server responded with: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Server connectivity failed:', error.message);
    return false;
  }
}

// Main function to run in browser console
async function runForceDownload() {
  console.log('🚀 GT SERVER DATA FORCE DOWNLOAD\n');
  console.log('This will download GT sales orders from server to your device.\n');
  
  // Check connectivity first
  const isConnected = await checkServerConnectivity();
  
  if (!isConnected) {
    console.log('❌ Cannot connect to server');
    console.log('🔧 Check:');
    console.log('   1. Internet connection');
    console.log('   2. Server URL in storage config');
    console.log('   3. VPN/firewall settings');
    return;
  }
  
  // Try direct fetch method first
  console.log('📥 Method 1: Direct server fetch...');
  const result1 = await forceDownloadGTSalesOrders();
  
  if (result1.success) {
    console.log('\n🎉 SUCCESS! Data downloaded successfully');
    console.log(`📊 Summary: ${result1.newCount} new orders added`);
    console.log('💡 Go to GT Sales Orders page to see the new data');
    return;
  }
  
  // Try storage service method as fallback
  console.log('\n📥 Method 2: Storage service fetch...');
  const result2 = await forceDownloadUsingStorageService();
  
  if (result2.success) {
    console.log('\n🎉 SUCCESS! Data downloaded via storage service');
    console.log(`📊 Summary: ${result2.count} orders downloaded`);
    console.log('💡 Go to GT Sales Orders page to see the new data');
  } else {
    console.log('\n❌ Both methods failed');
    console.log('🔧 Manual steps:');
    console.log('   1. Check storage_config.json');
    console.log('   2. Verify server URL');
    console.log('   3. Test server in browser');
    console.log('   4. Contact system admin');
  }
}

// Export for browser console use
if (typeof window !== 'undefined') {
  window.forceDownloadGTData = runForceDownload;
  window.downloadGTSalesOrders = forceDownloadGTSalesOrders;
  window.checkGTServerConnectivity = checkServerConnectivity;
  
  console.log('🎯 GT Force Download loaded!');
  console.log('Run in console: forceDownloadGTData()');
}

// For Node.js testing
if (typeof module !== 'undefined') {
  module.exports = {
    forceDownloadGTSalesOrders,
    checkServerConnectivity,
    runForceDownload
  };
}

// Auto-run if in browser
if (typeof window !== 'undefined' && window.location) {
  console.log('🚀 Auto-running GT force download...');
  runForceDownload();
}