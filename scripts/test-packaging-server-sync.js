/**
 * Test server sync functionality
 */

const fs = require('fs');

console.log('🧪 TESTING SERVER SYNC FUNCTIONALITY\n');

async function testServerSync() {
  const serverUrl = 'https://vercel-proxy-blond-nine.vercel.app';
  
  // Test 1: Check server connectivity
  console.log('1. Testing server connectivity...');
  try {
    const response = await fetch(`${serverUrl}/api/storage/packaging%2Fproducts`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Server accessible, products data: ${Array.isArray(data.value) ? data.value.length : 'unknown'} items`);
    } else {
      console.log(`   ❌ Server error: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Connection error: ${error.message}`);
  }
  
  // Test 2: Test write operation
  console.log('\n2. Testing write operation...');
  const testData = {
    value: [{ id: 'test-' + Date.now(), name: 'Test Item' }],
    timestamp: Date.now(),
    _timestamp: Date.now()
  };
  
  try {
    const response = await fetch(`${serverUrl}/api/storage/packaging%2Ftest-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    if (response.ok) {
      console.log(`   ✅ Write test successful`);
    } else {
      console.log(`   ❌ Write test failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Write test error: ${error.message}`);
  }
  
  // Test 3: Test read operation
  console.log('\n3. Testing read operation...');
  try {
    const response = await fetch(`${serverUrl}/api/storage/packaging%2Ftest-data`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Read test successful, data: ${JSON.stringify(data).substring(0, 100)}...`);
    } else {
      console.log(`   ❌ Read test failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Read test error: ${error.message}`);
  }
}

// Run test
testServerSync().catch(console.error);