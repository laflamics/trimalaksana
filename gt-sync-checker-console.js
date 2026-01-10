
/**
 * GT Sync Status Checker
 * Run this in browser console to check GT sync status
 */

// Check GT sync service status
function checkGTSyncStatus() {
  console.log('🔍 Checking GT Sync Status...');
  
  try {
    // Check if gtSync is available
    if (typeof gtSync !== 'undefined') {
      console.log('✅ GT Sync service is loaded');
      
      const status = gtSync.getSyncStatus();
      console.log('📊 Current sync status:', status);
      
      const queueStatus = gtSync.getQueueStatus();
      console.log('📋 Queue status:', queueStatus);
      
      // Force sync
      console.log('🚀 Forcing sync...');
      gtSync.forceSyncAll().then(() => {
        console.log('✅ Force sync completed');
        console.log('📊 New status:', gtSync.getSyncStatus());
      }).catch(error => {
        console.error('❌ Force sync failed:', error);
      });
      
    } else {
      console.error('❌ GT Sync service not found');
      console.log('💡 Try importing: import { gtSync } from "./src/services/gt-sync.ts"');
    }
  } catch (error) {
    console.error('❌ Error checking GT sync:', error);
  }
}

// Check storage data
function checkGTStorageData() {
  console.log('🔍 Checking GT Storage Data...');
  
  try {
    // Check localStorage directly
    const storageKeys = Object.keys(localStorage).filter(key => 
      key.includes('gt_') || key.includes('general-trading')
    );
    
    console.log('📂 GT-related localStorage keys:', storageKeys);
    
    storageKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.value && Array.isArray(data.value)) {
          console.log(`📊 ${key}: ${data.value.length} items`);
        } else if (Array.isArray(data)) {
          console.log(`📊 ${key}: ${data.length} items`);
        } else {
          console.log(`📊 ${key}: ${typeof data}`);
        }
      } catch (e) {
        console.log(`📊 ${key}: Invalid JSON`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

// Force reload GT sales orders
function forceReloadGTSalesOrders() {
  console.log('🔄 Force reloading GT Sales Orders...');
  
  try {
    // Trigger storage event to force reload
    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { 
        key: 'general-trading/gt_salesOrders',
        action: 'reload'
      }
    }));
    
    console.log('✅ Reload event dispatched');
    console.log('💡 Check GT Sales Orders page for updated data');
    
  } catch (error) {
    console.error('❌ Error forcing reload:', error);
  }
}

// Run all checks
console.log('🚀 GT Sync Diagnostic Started');
console.log('Run these functions in console:');
console.log('- checkGTSyncStatus()');
console.log('- checkGTStorageData()'); 
console.log('- forceReloadGTSalesOrders()');

// Auto-run basic checks
checkGTSyncStatus();
checkGTStorageData();
