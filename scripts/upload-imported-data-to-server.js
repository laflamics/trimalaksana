#!/usr/bin/env node

/**
 * Upload Imported Data Directly to Server Storage
 * 
 * This script uploads imported data directly to the server's storage
 * so it's available for all devices to sync.
 * 
 * Usage: node scripts/upload-imported-data-to-server.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 3000;
const SERVER_PROTOCOL = process.env.SERVER_PROTOCOL || 'http';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load JSON file
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Handle wrapped storage format: { value: [...] }
    if (parsed && typeof parsed === 'object' && 'value' in parsed && Array.isArray(parsed.value)) {
      return parsed.value;
    }
    
    // Handle direct array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return [];
  }
};

/**
 * Make HTTP request to server
 */
const makeRequest = (method, path, data) => {
  return new Promise((resolve, reject) => {
    const protocol = SERVER_PROTOCOL === 'https' ? https : http;
    
    const jsonData = JSON.stringify(data);
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData),
        'X-Sync-Source': 'packaging-import-direct'
      }
    };
    
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(jsonData);
    req.end();
  });
};

/**
 * Upload data to server storage
 */
const uploadDataToServer = async (storageKey, data, description) => {
  try {
    console.log(`   📤 Uploading ${description} to server...`);
    
    // Use the /api/storage/* endpoint to save data
    const response = await makeRequest('POST', `/api/storage/${storageKey}`, {
      data: data,
      timestamp: Date.now(),
      source: 'packaging-import-direct'
    });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`   ✅ ${description} uploaded (${data.length} records)`);
      return { success: true, count: data.length };
    } else {
      console.log(`   ⚠️  Upload returned status ${response.status}`);
      console.log(`      Response: ${JSON.stringify(response.data).substring(0, 100)}`);
      return { success: false, count: 0, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ Upload failed: ${error.message}`);
    return { success: false, count: 0, error: error.message };
  }
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

const uploadImportedDataToServer = async () => {
  console.log('🚀 Starting Upload Imported Data to Server...\n');
  
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // STEP 1: Check Server Connection
    // ========================================================================
    console.log('🔗 Step 1: Checking server connection...');
    console.log(`   Server: ${SERVER_PROTOCOL}://${SERVER_HOST}:${SERVER_PORT}\n`);
    
    try {
      const healthResponse = await makeRequest('GET', '/health', {});
      if (healthResponse.status === 200) {
        console.log('   ✅ Server is online\n');
      } else {
        console.log(`   ⚠️  Server returned status ${healthResponse.status}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Server not reachable: ${error.message}`);
      console.log('   ℹ️  Make sure the server is running on port 3000\n');
      process.exit(1);
    }
    
    // ========================================================================
    // STEP 2: Load Data
    // ========================================================================
    console.log('📦 Step 2: Loading imported data...');
    
    const dataPath = path.join(__dirname, '../data/localStorage');
    
    const salesOrders = loadJSON(path.join(dataPath, 'salesOrders.json'));
    const deliveries = loadJSON(path.join(dataPath, 'delivery.json'));
    const invoices = loadJSON(path.join(dataPath, 'invoices.json'));
    const taxRecords = loadJSON(path.join(dataPath, 'taxRecords.json'));
    
    console.log(`   ✅ Loaded ${salesOrders.length} Sales Orders`);
    console.log(`   ✅ Loaded ${deliveries.length} Deliveries`);
    console.log(`   ✅ Loaded ${invoices.length} Invoices`);
    console.log(`   ✅ Loaded ${taxRecords.length} Tax Records\n`);
    
    // ========================================================================
    // STEP 3: Upload to Server
    // ========================================================================
    console.log('📤 Step 3: Uploading to server...\n');
    
    const results = {
      salesOrders: await uploadDataToServer('salesOrders', salesOrders, 'Sales Orders'),
      deliveries: await uploadDataToServer('delivery', deliveries, 'Deliveries'),
      invoices: await uploadDataToServer('invoices', invoices, 'Invoices'),
      taxRecords: await uploadDataToServer('taxRecords', taxRecords, 'Tax Records')
    };
    
    console.log('');
    
    // ========================================================================
    // STEP 4: Summary
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const allSuccess = Object.values(results).every(r => r.success);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(allSuccess ? '✅ UPLOAD COMPLETE!' : '⚠️  UPLOAD PARTIAL');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('');
    console.log('📊 Upload Summary:');
    console.log(`   • Sales Orders:   ${results.salesOrders.count} records`);
    console.log(`   • Deliveries:     ${results.deliveries.count} records`);
    console.log(`   • Invoices:       ${results.invoices.count} records`);
    console.log(`   • Tax Records:    ${results.taxRecords.count} records`);
    console.log('');
    console.log('ℹ️  Next Steps:');
    console.log('   1. Open the app on any device');
    console.log('   2. Pull to refresh or restart the app');
    console.log('   3. Data should appear immediately from server');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return {
      success: allSuccess,
      summary: results,
      duration: duration
    };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  uploadImportedDataToServer()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { uploadImportedDataToServer };
