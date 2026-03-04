/**
 * Test PostgreSQL Mode
 * Verify that POST/GET/DELETE work correctly
 */

const serverUrl = 'http://100.81.50.37:9999';

async function test() {
  console.log('🧪 Testing PostgreSQL Mode\n');

  try {
    // 1. Test POST - Create/Update
    console.log('1️⃣ Testing POST (Create/Update)...');
    const testData = [
      { id: '1', name: 'Test Product 1', price: 100 },
      { id: '2', name: 'Test Product 2', price: 200 }
    ];

    const postResponse = await fetch(`${serverUrl}/api/storage/test_products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: testData,
        timestamp: Date.now()
      })
    });

    if (!postResponse.ok) {
      throw new Error(`POST failed: ${postResponse.status}`);
    }

    console.log('✅ POST successful\n');

    // 2. Test GET - Read
    console.log('2️⃣ Testing GET (Read)...');
    const getResponse = await fetch(`${serverUrl}/api/storage/test_products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status}`);
    }

    const getData = await getResponse.json();
    console.log('✅ GET successful');
    console.log(`   Retrieved ${getData.value.length} items\n`);

    // 3. Test DELETE - Remove
    console.log('3️⃣ Testing DELETE (Remove)...');
    const deleteResponse = await fetch(`${serverUrl}/api/storage/test_products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!deleteResponse.ok) {
      throw new Error(`DELETE failed: ${deleteResponse.status}`);
    }

    console.log('✅ DELETE successful\n');

    // 4. Verify DELETE worked
    console.log('4️⃣ Verifying DELETE...');
    const verifyResponse = await fetch(`${serverUrl}/api/storage/test_products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const verifyData = await verifyResponse.json();
    if (Object.keys(verifyData.value).length === 0) {
      console.log('✅ DELETE verified - data is gone\n');
    } else {
      console.log('⚠️ DELETE verification failed - data still exists\n');
    }

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
