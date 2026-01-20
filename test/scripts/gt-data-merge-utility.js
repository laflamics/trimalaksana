
/**
 * GT Data Merge Utility
 * Merge GT sales orders from multiple sources
 */

// Merge GT sales orders from device B
function mergeGTSalesOrdersFromDeviceB(deviceBData) {
  console.log('🔄 Merging GT Sales Orders from Device B...');
  
  try {
    // Get current local data
    const currentKey = 'general-trading/gt_salesOrders';
    const currentData = JSON.parse(localStorage.getItem(currentKey) || '{"value":[]}');
    const currentOrders = currentData.value || [];
    
    console.log(`📊 Current local orders: ${currentOrders.length}`);
    console.log(`📊 Device B orders: ${deviceBData.length}`);
    
    // Merge data (avoid duplicates)
    const mergedOrders = [...currentOrders];
    let addedCount = 0;
    
    deviceBData.forEach(deviceBOrder => {
      const exists = currentOrders.some(localOrder => 
        localOrder.id === deviceBOrder.id || 
        localOrder.soNo === deviceBOrder.soNo
      );
      
      if (!exists) {
        mergedOrders.push(deviceBOrder);
        addedCount++;
        console.log(`➕ Added: ${deviceBOrder.soNo} - ${deviceBOrder.customer}`);
      }
    });
    
    // Save merged data
    const mergedData = {
      value: mergedOrders,
      timestamp: Date.now(),
      _timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      mergedFrom: 'device-b',
      mergedAt: new Date().toISOString()
    };
    
    localStorage.setItem(currentKey, JSON.stringify(mergedData));
    
    console.log(`✅ Merge completed: ${addedCount} new orders added`);
    console.log(`📊 Total orders: ${mergedOrders.length}`);
    
    // Trigger reload
    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { 
        key: currentKey,
        value: mergedOrders,
        action: 'merge'
      }
    }));
    
    return {
      success: true,
      added: addedCount,
      total: mergedOrders.length
    };
    
  } catch (error) {
    console.error('❌ Merge failed:', error);
    return { success: false, error: error.message };
  }
}

// Example usage:
// const deviceBData = [/* paste device B sales orders here */];
// mergeGTSalesOrdersFromDeviceB(deviceBData);
