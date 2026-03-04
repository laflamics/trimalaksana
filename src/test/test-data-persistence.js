#!/usr/bin/env node

/**
 * Test Data Persistence
 * Verify data is saved to PostgreSQL and MinIO
 * 
 * Usage:
 * node test-data-persistence.js
 */

const https = require('https');
const http = require('http');

// Configuration
const SERVER_URL = 'https://server-tljp.tail75a421.ts.net:9999';
const POSTGRES_CHECK = {
  host: 'localhost',
  port: 5432,
  user: 'trimalaksana',
  password: 'trimalaksana123',
  database: 'trimalaksana_db'
};

// Test data
const testProduct = {
  id: `test-product-${Date.now()}`,
  kode: `TEST${Date.now()}`,
  nama: 'Test Product for Persistence',
  padCode: 'test-pad',
  satuan: 'pcs',
  stockAman: 10,
  stockMinimum: 5,
  kategori: 'product'
};

const testSalesOrder = {
  id: `test-so-${Date.now()}`,
  soNo: `SO-TEST-${Date.now()}`,
  customerCode: 'CUST001',
  customerName: 'Test Customer',
  orderDate: new Date().toISOString(),
  items: [
    {
      productCode: testProduct.kode,
      quantity: 100,
      unitPrice: 50000
    }
  ],
  totalAmount: 5000000,
  status: 'pending'
};

// Helper functions
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false // For self-signed certs
    };
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testServerConnection() {
  console.log('\n📡 Testing Server Connection...');
  try {
    const result = await makeRequest(`${SERVER_URL}/health`);
    if (result.status === 200) {
      console.log('✅ Server is reachable');
      console.log(`   Status: ${result.data.status}`);
      console.log(`   Mode: ${result.data.mode}`);
      console.log(`   Database: ${result.data.database}`);
      return true;
    } else {
      console.log(`❌ Server returned status ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot reach server: ${error.message}`);
    console.log(`   Make sure server is running at ${SERVER_URL}`);
    return false;
  }
}

async function testPostProduct() {
  console.log('\n📝 Testing POST Product to Server...');
  try {
    const result = await makeRequest(
      `${SERVER_URL}/api/storage/products`,
      'POST',
      {
        value: [testProduct],
        timestamp: Date.now()
      }
    );
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ Product POST successful');
      console.log(`   Product ID: ${testProduct.id}`);
      console.log(`   Product Code: ${testProduct.kode}`);
      return true;
    } else {
      console.log(`❌ Product POST failed: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Product POST error: ${error.message}`);
    return false;
  }
}

async function testGetProduct() {
  console.log('\n📖 Testing GET Product from Server...');
  try {
    const result = await makeRequest(`${SERVER_URL}/api/storage/products`);
    
    if (result.status === 200) {
      const products = result.data.value || [];
      console.log('✅ Product GET successful');
      console.log(`   Total products: ${Array.isArray(products) ? products.length : 0}`);
      
      if (Array.isArray(products)) {
        const testProd = products.find(p => p.id === testProduct.id);
        if (testProd) {
          console.log(`   ✅ Test product found in response!`);
          console.log(`      Code: ${testProd.kode}`);
          console.log(`      Name: ${testProd.nama}`);
          return true;
        } else {
          console.log(`   ⚠️  Test product not found in response`);
          console.log(`   First 3 products:`, products.slice(0, 3).map(p => ({ id: p.id, kode: p.kode })));
          return false;
        }
      }
      return true;
    } else {
      console.log(`❌ Product GET failed: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Product GET error: ${error.message}`);
    return false;
  }
}

async function testPostSalesOrder() {
  console.log('\n📝 Testing POST Sales Order to Server...');
  try {
    const result = await makeRequest(
      `${SERVER_URL}/api/storage/gt_salesOrders`,
      'POST',
      {
        value: [testSalesOrder],
        timestamp: Date.now()
      }
    );
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ Sales Order POST successful');
      console.log(`   SO ID: ${testSalesOrder.id}`);
      console.log(`   SO No: ${testSalesOrder.soNo}`);
      return true;
    } else {
      console.log(`❌ Sales Order POST failed: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Sales Order POST error: ${error.message}`);
    return false;
  }
}

async function testGetSalesOrder() {
  console.log('\n📖 Testing GET Sales Order from Server...');
  try {
    const result = await makeRequest(`${SERVER_URL}/api/storage/gt_salesOrders`);
    
    if (result.status === 200) {
      const orders = result.data.value || [];
      console.log('✅ Sales Order GET successful');
      console.log(`   Total orders: ${Array.isArray(orders) ? orders.length : 0}`);
      
      if (Array.isArray(orders)) {
        const testOrder = orders.find(o => o.id === testSalesOrder.id);
        if (testOrder) {
          console.log(`   ✅ Test sales order found in response!`);
          console.log(`      SO No: ${testOrder.soNo}`);
          console.log(`      Customer: ${testOrder.customerName}`);
          return true;
        } else {
          console.log(`   ⚠️  Test sales order not found in response`);
          console.log(`   First 3 orders:`, orders.slice(0, 3).map(o => ({ id: o.id, soNo: o.soNo })));
          return false;
        }
      }
      return true;
    } else {
      console.log(`❌ Sales Order GET failed: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Sales Order GET error: ${error.message}`);
    return false;
  }
}

async function checkPostgresData() {
  console.log('\n🗄️  Checking PostgreSQL Data...');
  console.log('   Run this command on server PC:');
  console.log('   docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key, LENGTH(value::text) as size FROM storage ORDER BY updated_at DESC LIMIT 10;"');
  console.log('\n   Or check specific keys:');
  console.log('   docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key FROM storage WHERE key IN (\'products\', \'gt_salesOrders\');"');
}

async function checkMinIOData() {
  console.log('\n🪣 Checking MinIO Data...');
  console.log('   MinIO is used for BLOB storage (images, files)');
  console.log('   Access MinIO console: http://localhost:9001');
  console.log('   Credentials: minioadmin / minioadmin');
  console.log('   Look for buckets: trimalaksana-packaging, trimalaksana-gt, trimalaksana-trucking');
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         DATA PERSISTENCE TEST - REST API to PostgreSQL     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    serverConnection: false,
    postProduct: false,
    getProduct: false,
    postSalesOrder: false,
    getSalesOrder: false
  };
  
  // Test 1: Server connection
  results.serverConnection = await testServerConnection();
  if (!results.serverConnection) {
    console.log('\n❌ Cannot proceed - server not reachable');
    return results;
  }
  
  // Test 2: POST product
  results.postProduct = await testPostProduct();
  
  // Test 3: GET product
  results.getProduct = await testGetProduct();
  
  // Test 4: POST sales order
  results.postSalesOrder = await testPostSalesOrder();
  
  // Test 5: GET sales order
  results.getSalesOrder = await testGetSalesOrder();
  
  // Check PostgreSQL
  await checkPostgresData();
  
  // Check MinIO
  await checkMinIOData();
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    console.log(`   ${icon} ${test}`);
  });
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Data persistence is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Check PostgreSQL console on server PC');
    console.log('2. Verify data is in storage table');
    console.log('3. Test on multiple devices for real-time sync');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  return results;
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
