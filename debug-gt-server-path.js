/**
 * Debug GT Server Path
 * Check what paths exist on server for GT data
 */

const SERVER_URL = 'https://vercel-proxy-blond-nine.vercel.app';

async function debugGTServerPaths() {
  console.log('🔍 DEBUGGING GT SERVER PATHS\n');
  
  const possiblePaths = [
    'general-trading/gt_salesOrders',
    'generaltrading/gt_salesOrders', 
    'gt_salesOrders',
    'general-trading/salesOrders',
    'generaltrading/salesOrders',
    'salesOrders',
    'gt/salesOrders',
    'gt/gt_salesOrders'
  ];
  
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  console.log(`📋 Testing ${possiblePaths.length} possible paths...\n`);
  
  for (const path of possiblePaths) {
    try {
      const encodedKey = encodeURIComponent(path);
      const url = `${SERVER_URL}/api/storage/${encodedKey}`;
      
      console.log(`🔍 Testing: ${path}`);
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        let orders = [];
        
        if (data && data.value && Array.isArray(data.value)) {
          orders = data.value;
        } else if (Array.isArray(data)) {
          orders = data;
        }
        
        console.log(`   ✅ SUCCESS! Found ${orders.length} orders`);
        
        if (orders.length > 0) {
          console.log(`   📋 Sample orders:`);
          orders.slice(0, 3).forEach((order, index) => {
            const date = order.created ? new Date(order.created).toLocaleDateString() : 'No date';
            console.log(`      ${index + 1}. ${order.soNo || order.id} - ${order.customer || 'No customer'} (${date})`);
          });
        }
        
        console.log(`   🎯 CORRECT PATH: ${path}\n`);
        
        return {
          success: true,
          correctPath: path,
          orderCount: orders.length,
          sampleData: orders.slice(0, 2)
        };
        
      } else {
        console.log(`   ❌ ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ No valid path found!');
  console.log('🔧 Possible issues:');
  console.log('   1. Server is not running');
  console.log('   2. GT data not uploaded to server yet');
  console.log('   3. Different path structure on server');
  console.log('   4. Authentication required');
  
  return {
    success: false,
    error: 'No valid path found'
  };
}

// Check what data exists locally
function checkLocalGTData() {
  console.log('📂 CHECKING LOCAL GT DATA\n');
  
  const localPaths = [
    'general-trading/gt_salesOrders',
    'gt_salesOrders',
    'generaltrading/gt_salesOrders'
  ];
  
  localPaths.forEach(path => {
    const data = localStorage.getItem(path);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const orders = parsed.value || parsed || [];
        console.log(`✅ ${path}: ${Array.isArray(orders) ? orders.length : 0} orders`);
        
        if (parsed.serverSyncAt) {
          console.log(`   🕐 Last server sync: ${new Date(parsed.serverSyncAt).toLocaleString()}`);
        }
      } catch (e) {
        console.log(`⚠️  ${path}: Invalid data format`);
      }
    } else {
      console.log(`❌ ${path}: No data`);
    }
  });
}

// Test server connectivity
async function testServerConnectivity() {
  console.log('\n🌐 TESTING SERVER CONNECTIVITY\n');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/health`, {
      method: 'GET'
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

// Main debug function
async function runGTPathDebug() {
  console.log('🚀 GT SERVER PATH DEBUG\n');
  
  // Check local data first
  checkLocalGTData();
  
  // Test server connectivity
  const isConnected = await testServerConnectivity();
  if (!isConnected) {
    console.log('\n❌ Cannot connect to server - stopping debug');
    return;
  }
  
  // Debug server paths
  const result = await debugGTServerPaths();
  
  if (result.success) {
    console.log('\n🎉 SUCCESS!');
    console.log(`✅ Correct server path: ${result.correctPath}`);
    console.log(`📊 Orders found: ${result.orderCount}`);
    console.log('\n💡 Next steps:');
    console.log(`   1. Update GT sync service to use path: ${result.correctPath}`);
    console.log('   2. Test sync again');
    console.log('   3. Verify data appears in GT Sales Orders');
  } else {
    console.log('\n❌ DEBUG FAILED');
    console.log('🔧 Troubleshooting needed:');
    console.log('   1. Check if GT data exists on server');
    console.log('   2. Verify server API endpoints');
    console.log('   3. Check server logs for errors');
  }
  
  return result;
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.debugGTServerPaths = debugGTServerPaths;
  window.checkLocalGTData = checkLocalGTData;
  window.testServerConnectivity = testServerConnectivity;
  window.runGTPathDebug = runGTPathDebug;
  
  console.log('🎯 GT Path Debug loaded!');
  console.log('Commands:');
  console.log('  runGTPathDebug() - Full debug process');
  console.log('  debugGTServerPaths() - Test server paths only');
  console.log('  checkLocalGTData() - Check local data only');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  console.log('🚀 Auto-running GT path debug...');
  runGTPathDebug();
}