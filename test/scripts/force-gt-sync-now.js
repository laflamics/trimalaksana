/**
 * Force GT Sync Now
 * Simple script to force GT sync from browser console
 */

async function forceGTSyncNow() {
  console.log('🚀 FORCE GT SYNC NOW\n');
  
  try {
    // Check if we're in GT business unit
    const selectedBusiness = localStorage.getItem('selectedBusiness');
    if (selectedBusiness !== 'general-trading') {
      console.log('⚠️  Please switch to General Trading business unit first');
      console.log('💡 Go to business selector and select "General Trading"');
      return;
    }
    
    // Import GT sync service
    console.log('📥 Loading GT sync service...');
    const { gtSync } = await import('./src/services/gt-sync.ts');
    console.log('✅ GT sync service loaded');
    
    // Check storage config
    const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
    console.log(`📋 Storage mode: ${storageConfig.type}`);
    
    if (storageConfig.type !== 'server') {
      console.log('⚠️  Server mode not configured');
      console.log('💡 Configure server mode in settings to enable sync');
      return;
    }
    
    if (!storageConfig.serverUrl) {
      console.log('⚠️  Server URL not configured');
      console.log('💡 Set server URL in storage configuration');
      return;
    }
    
    console.log(`🌐 Server URL: ${storageConfig.serverUrl}`);
    
    // Get current data count
    const currentData = localStorage.getItem('general-trading/gt_salesOrders');
    let currentCount = 0;
    
    if (currentData) {
      try {
        const parsed = JSON.parse(currentData);
        const orders = parsed.value || parsed || [];
        currentCount = Array.isArray(orders) ? orders.length : 0;
      } catch (e) {
        // Invalid data
      }
    }
    
    console.log(`📊 Current local orders: ${currentCount}`);
    
    // Force sync
    console.log('\n🔄 Starting force sync...');
    
    // Listen for status changes
    let statusUpdates = 0;
    const unsubscribe = gtSync.onSyncStatusChange((status) => {
      statusUpdates++;
      console.log(`📡 Status: ${status} (update #${statusUpdates})`);
    });
    
    try {
      await gtSync.forceDownloadFromServer();
      
      // Check new data count
      const newData = localStorage.getItem('general-trading/gt_salesOrders');
      let newCount = 0;
      
      if (newData) {
        try {
          const parsed = JSON.parse(newData);
          const orders = parsed.value || parsed || [];
          newCount = Array.isArray(orders) ? orders.length : 0;
        } catch (e) {
          // Invalid data
        }
      }
      
      const addedCount = newCount - currentCount;
      
      console.log('\n✅ SYNC COMPLETED!');
      console.log(`📊 Total orders: ${newCount}`);
      if (addedCount > 0) {
        console.log(`➕ New orders added: ${addedCount}`);
      } else if (addedCount === 0) {
        console.log('ℹ️  No new orders (already up to date)');
      }
      
      console.log('\n💡 Next steps:');
      console.log('   1. Go to GT Sales Orders page');
      console.log('   2. Check if new orders are visible');
      console.log('   3. Verify sync status shows green dot');
      
    } catch (error) {
      console.error('\n❌ SYNC FAILED:', error);
      
      if (error.message.includes('fetch')) {
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check internet connection');
        console.log('   2. Verify server URL is correct');
        console.log('   3. Ensure server is running');
        console.log('   4. Check firewall/VPN settings');
      } else if (error.message.includes('Server mode not configured')) {
        console.log('\n🔧 Configuration needed:');
        console.log('   1. Go to Settings');
        console.log('   2. Configure server mode');
        console.log('   3. Set correct server URL');
      }
    }
    
    unsubscribe();
    
  } catch (error) {
    console.error('❌ Failed to load GT sync:', error);
    console.log('\n🔧 Make sure you are on GT page and try again');
  }
}

// Quick status check
function checkGTSyncStatus() {
  console.log('📊 GT SYNC STATUS CHECK\n');
  
  const selectedBusiness = localStorage.getItem('selectedBusiness');
  console.log(`🏢 Selected business: ${selectedBusiness || 'none'}`);
  
  const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
  console.log(`📋 Storage mode: ${storageConfig.type}`);
  
  if (storageConfig.serverUrl) {
    console.log(`🌐 Server URL: ${storageConfig.serverUrl}`);
  }
  
  // Check local data
  const gtData = localStorage.getItem('general-trading/gt_salesOrders');
  if (gtData) {
    try {
      const parsed = JSON.parse(gtData);
      const orders = parsed.value || parsed || [];
      console.log(`📊 Local GT orders: ${Array.isArray(orders) ? orders.length : 0}`);
      
      if (parsed.serverSyncAt) {
        console.log(`🕐 Last server sync: ${new Date(parsed.serverSyncAt).toLocaleString()}`);
      }
    } catch (e) {
      console.log('⚠️  Invalid GT data format');
    }
  } else {
    console.log('📊 No local GT data found');
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.forceGTSyncNow = forceGTSyncNow;
  window.checkGTSyncStatus = checkGTSyncStatus;
  
  console.log('🎯 GT Force Sync loaded!');
  console.log('Commands:');
  console.log('  forceGTSyncNow() - Force sync GT data from server');
  console.log('  checkGTSyncStatus() - Check current sync status');
}

// Auto-run status check
if (typeof window !== 'undefined' && window.location) {
  checkGTSyncStatus();
}