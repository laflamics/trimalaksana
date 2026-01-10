/**
 * Test Server Response Format
 * Check exact format of server response for GT data
 */

async function testServerResponseFormat() {
  console.log('🔍 TESTING SERVER RESPONSE FORMAT\n');
  
  const SERVER_URL = 'https://vercel-proxy-blond-nine.vercel.app';
  const path = 'general-trading/gt_salesOrders';
  const encodedKey = encodeURIComponent(path);
  const url = `${SERVER_URL}/api/storage/${encodedKey}`;
  
  console.log(`📡 Testing URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.log(`❌ Server error: ${response.status}`);
      const errorText = await response.text();
      console.log(`📄 Error response: ${errorText}`);
      return;
    }
    
    const rawResponse = await response.text();
    console.log(`📄 Raw Response (first 500 chars):`);
    console.log(rawResponse.substring(0, 500));
    
    try {
      const jsonData = JSON.parse(rawResponse);
      console.log(`\n📋 Parsed JSON Structure:`);
      console.log(`   Type: ${typeof jsonData}`);
      console.log(`   Is Array: ${Array.isArray(jsonData)}`);
      
      if (jsonData && typeof jsonData === 'object') {
        console.log(`   Keys: ${Object.keys(jsonData)}`);
        
        // Check for common patterns
        if (jsonData.value !== undefined) {
          console.log(`   ✅ Has 'value' property: ${typeof jsonData.value}`);
          console.log(`   ✅ Value is array: ${Array.isArray(jsonData.value)}`);
          if (Array.isArray(jsonData.value)) {
            console.log(`   📊 Array length: ${jsonData.value.length}`);
            if (jsonData.value.length > 0) {
              console.log(`   📋 First item keys: ${Object.keys(jsonData.value[0])}`);
              console.log(`   📋 Sample order: ${jsonData.value[0].soNo} - ${jsonData.value[0].customer}`);
            }
          }
        }
        
        if (jsonData.data !== undefined) {
          console.log(`   ✅ Has 'data' property: ${typeof jsonData.data}`);
          console.log(`   ✅ Data is array: ${Array.isArray(jsonData.data)}`);
        }
        
        if (jsonData.timestamp) {
          console.log(`   🕐 Timestamp: ${new Date(jsonData.timestamp).toLocaleString()}`);
        }
        
        if (jsonData._timestamp) {
          console.log(`   🕐 _timestamp: ${new Date(jsonData._timestamp).toLocaleString()}`);
        }
      }
      
      // Test extraction logic
      console.log(`\n🧪 TESTING EXTRACTION LOGIC:`);
      
      let extractedOrders = [];
      
      // Method 1: Check for .value property (wrapped format)
      if (jsonData && jsonData.value && Array.isArray(jsonData.value)) {
        extractedOrders = jsonData.value;
        console.log(`   ✅ Method 1 (wrapped): Found ${extractedOrders.length} orders`);
      }
      // Method 2: Direct array
      else if (Array.isArray(jsonData)) {
        extractedOrders = jsonData;
        console.log(`   ✅ Method 2 (direct): Found ${extractedOrders.length} orders`);
      }
      // Method 3: Check for .data property
      else if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
        extractedOrders = jsonData.data;
        console.log(`   ✅ Method 3 (data): Found ${extractedOrders.length} orders`);
      }
      else {
        console.log(`   ❌ No extraction method worked`);
        console.log(`   📋 Available properties: ${Object.keys(jsonData)}`);
      }
      
      if (extractedOrders.length > 0) {
        console.log(`\n🎉 SUCCESS! Found ${extractedOrders.length} orders`);
        console.log(`📋 Sample orders:`);
        extractedOrders.slice(0, 3).forEach((order, index) => {
          const date = order.created ? new Date(order.created).toLocaleDateString() : 'No date';
          console.log(`   ${index + 1}. ${order.soNo || order.id} - ${order.customer || 'No customer'} (${date})`);
        });
        
        return {
          success: true,
          format: jsonData.value ? 'wrapped' : Array.isArray(jsonData) ? 'direct' : 'data',
          orderCount: extractedOrders.length,
          sampleOrder: extractedOrders[0]
        };
      } else {
        console.log(`\n❌ No orders found in response`);
        return {
          success: false,
          error: 'No orders in response',
          responseStructure: Object.keys(jsonData)
        };
      }
      
    } catch (parseError) {
      console.error(`❌ JSON Parse Error: ${parseError.message}`);
      console.log(`📄 Raw response was: ${rawResponse}`);
      return {
        success: false,
        error: 'JSON parse failed',
        rawResponse: rawResponse.substring(0, 200)
      };
    }
    
  } catch (error) {
    console.error(`❌ Fetch Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Quick test with better error handling
async function quickServerTest() {
  console.log('🚀 QUICK SERVER TEST\n');
  
  const result = await testServerResponseFormat();
  
  if (result.success) {
    console.log(`\n✅ SERVER RESPONSE WORKING!`);
    console.log(`📊 Format: ${result.format}`);
    console.log(`📋 Orders: ${result.orderCount}`);
    console.log(`\n💡 GT Sync should work with this format`);
  } else {
    console.log(`\n❌ SERVER RESPONSE ISSUE:`);
    console.log(`📋 Error: ${result.error}`);
    if (result.responseStructure) {
      console.log(`📋 Response structure: ${result.responseStructure}`);
    }
    console.log(`\n🔧 Need to debug server response format`);
  }
  
  return result;
}

// Export for console
if (typeof window !== 'undefined') {
  window.testServerResponseFormat = testServerResponseFormat;
  window.quickServerTest = quickServerTest;
  
  console.log('🎯 Server Response Test loaded!');
  console.log('Run: quickServerTest()');
}

// Auto-run
if (typeof window !== 'undefined' && window.location) {
  quickServerTest();
}