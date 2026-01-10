/**
 * Manual GT Server Test
 * Simple manual test to find correct GT path on server
 */

async function testGTServerManual() {
  console.log('🧪 MANUAL GT SERVER TEST\n');
  
  const SERVER_URL = 'https://vercel-proxy-blond-nine.vercel.app';
  
  // Test the most likely paths
  const testPaths = [
    'gt_salesOrders',                    // Simple path
    'general-trading/gt_salesOrders',    // Current path
    'generaltrading/gt_salesOrders',     // No dash
    'gt/salesOrders',                    // Short path
    'salesOrders'                        // Very simple
  ];
  
  for (const path of testPaths) {
    console.log(`\n🔍 Testing path: ${path}`);
    
    try {
      const encodedKey = encodeURIComponent(path);
      const url = `${SERVER_URL}/api/storage/${encodedKey}`;
      
      console.log(`📡 URL: ${url}`);
      
      const response = await fetch(url);
      console.log(`📊 Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📋 Data type: ${typeof data}`);
        
        if (data) {
          if (data.value && Array.isArray(data.value)) {
            console.log(`✅ FOUND! ${data.value.length} orders in data.value`);
            console.log(`📋 Sample: ${data.value[0]?.soNo} - ${data.value[0]?.customer}`);
            return { path, count: data.value.length, format: 'wrapped' };
          } else if (Array.isArray(data)) {
            console.log(`✅ FOUND! ${data.length} orders in direct array`);
            console.log(`📋 Sample: ${data[0]?.soNo} - ${data[0]?.customer}`);
            return { path, count: data.length, format: 'direct' };
          } else {
            console.log(`⚠️  Data exists but not array format:`, Object.keys(data));
          }
        } else {
          console.log(`❌ No data returned`);
        }
      } else {
        console.log(`❌ Failed: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ No GT data found on server');
  console.log('💡 Possible reasons:');
  console.log('   1. GT data not synced to server yet');
  console.log('   2. Different path structure');
  console.log('   3. Server configuration issue');
  
  return null;
}

// Quick test function
async function quickGTTest() {
  const result = await testGTServerManual();
  
  if (result) {
    console.log(`\n🎉 SUCCESS! GT data found at: ${result.path}`);
    console.log(`📊 Orders: ${result.count}`);
    console.log(`📋 Format: ${result.format}`);
    
    // Test updating GT sync service
    console.log('\n💡 To fix GT sync, update the path in gt-sync.ts:');
    console.log(`   Change storageKey to: "${result.path}"`);
  }
}

// Export for console
if (typeof window !== 'undefined') {
  window.testGTServerManual = testGTServerManual;
  window.quickGTTest = quickGTTest;
  
  console.log('🎯 Manual GT Test loaded!');
  console.log('Run: quickGTTest()');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  quickGTTest();
}