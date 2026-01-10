/**
 * Fix GT Data Loading
 * Force reload GT data from files to fix sync issues
 */

async function fixGTDataLoading() {
  console.log('🔧 FIXING GT DATA LOADING\n');
  
  try {
    // Import storage service
    const { storageService } = await import('./src/services/storage.ts');
    console.log('✅ Storage service imported');
    
    // Check business unit
    const selectedBusiness = localStorage.getItem('selectedBusiness');
    if (selectedBusiness !== 'general-trading') {
      console.log('⚠️  Please switch to General Trading business unit first');
      return;
    }
    
    console.log('✅ In General Trading business unit');
    
    // Force reload GT sales orders
    console.log('\n📂 Force reloading GT sales orders...');
    const orders = await storageService.forceReloadFromFile('gt_salesOrders');
    
    if (orders && Array.isArray(orders)) {
      console.log(`✅ Loaded ${orders.length} orders from file`);
      
      if (orders.length > 0) {
        console.log('📋 Sample orders:');
        orders.slice(0, 5).forEach((order, index) => {
          const date = new Date(order.created || order.timestamp).toLocaleDateString();
          console.log(`   ${index + 1}. ${order.soNo} - ${order.customer} (${date})`);
        });
      }
    } else {
      console.log('❌ Failed to load orders from file');
    }
    
    // Force reload other GT data
    const gtDataTypes = [
      { key: 'gt_quotations', name: 'Quotations' },
      { key: 'gt_customers', name: 'Customers' },
      { key: 'gt_products', name: 'Products' },
      { key: 'gt_suppliers', name: 'Suppliers' }
    ];
    
    for (const dataType of gtDataTypes) {
      console.log(`\n📂 Force reloading GT ${dataType.name}...`);
      const data = await storageService.forceReloadFromFile(dataType.key);
      
      if (data && Array.isArray(data)) {
        console.log(`✅ Loaded ${data.length} ${dataType.name.toLowerCase()} from file`);
      } else {
        console.log(`⚠️  No ${dataType.name.toLowerCase()} file found or failed to load`);
      }
    }
    
    console.log('\n🎉 GT DATA LOADING FIXED!');
    console.log('💡 Refresh GT Sales Orders page to see all data');
    
    return {
      success: true,
      ordersLoaded: orders ? orders.length : 0
    };
    
  } catch (error) {
    console.error('❌ Failed to fix GT data loading:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Quick fix for GT orders only
async function quickFixGTOrders() {
  console.log('⚡ QUICK FIX GT ORDERS\n');
  
  try {
    const { storageService } = await import('./src/services/storage.ts');
    
    const orders = await storageService.forceReloadFromFile('gt_salesOrders');
    
    if (orders && Array.isArray(orders) && orders.length > 0) {
      console.log(`✅ Fixed! Loaded ${orders.length} GT orders`);
      console.log('💡 Refresh GT Sales Orders page now');
      return orders.length;
    } else {
      console.log('❌ No orders loaded');
      return 0;
    }
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
    return 0;
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.fixGTDataLoading = fixGTDataLoading;
  window.quickFixGTOrders = quickFixGTOrders;
  
  console.log('🎯 GT Data Loading Fix loaded!');
  console.log('Commands:');
  console.log('  fixGTDataLoading() - Fix all GT data');
  console.log('  quickFixGTOrders() - Quick fix GT orders only');
}

// Auto-run quick fix
if (typeof window !== 'undefined' && window.location) {
  console.log('🚀 Auto-running GT data fix...');
  quickFixGTOrders();
}