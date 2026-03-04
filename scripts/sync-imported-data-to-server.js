#!/usr/bin/env node

/**
 * Sync Imported Data to Server
 * 
 * This script uploads the imported packaging data (SO, Deliveries, Invoices, Tax Records)
 * to the server so it can be synced to other devices.
 * 
 * Usage: node scripts/sync-imported-data-to-server.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Server configuration - update these based on your setup
const SERVER_CONFIG = {
  host: process.env.SERVER_HOST || 'localhost',
  port: process.env.SERVER_PORT || 3000,
  protocol: process.env.SERVER_PROTOCOL || 'http',
  basePath: process.env.SERVER_BASE_PATH || '/api'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load JSON file
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${filePath}`);
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
    console.error(`   ❌ Error loading ${filePath}:`, error.message);
    return [];
  }
};

/**
 * Make HTTP request to server
 */
const makeRequest = (method, path, data) => {
  return new Promise((resolve, reject) => {
    const protocol = SERVER_CONFIG.protocol === 'https' ? https : http;
    
    const options = {
      hostname: SERVER_CONFIG.host,
      port: SERVER_CONFIG.port,
      path: `${SERVER_CONFIG.basePath}${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Source': 'packaging-import'
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
};

/**
 * Upload data to server
 */
const uploadToServer = async (endpoint, data, description) => {
  try {
    console.log(`   📤 Uploading ${description}...`);
    
    const response = await makeRequest('POST', endpoint, {
      records: data,
      timestamp: Date.now(),
      source: 'packaging-import'
    });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`   ✅ ${description} uploaded successfully`);
      return { success: true, count: data.length };
    } else {
      console.log(`   ⚠️  ${description} upload returned status ${response.status}`);
      return { success: false, count: 0, status: response.status };
    }
  } catch (error) {
    console.log(`   ⚠️  Could not upload ${description}: ${error.message}`);
    console.log(`      (This is OK if server is not running - data is saved locally)`);
    return { success: false, count: 0, error: error.message };
  }
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

const syncImportedDataToServer = async () => {
  console.log('🚀 Starting Sync Imported Data to Server...\n');
  
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // STEP 1: Check Server Connection
    // ========================================================================
    console.log('🔗 Step 1: Checking server connection...');
    console.log(`   Server: ${SERVER_CONFIG.protocol}://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}\n`);
    
    try {
      const healthResponse = await makeRequest('GET', '/health');
      if (healthResponse.status === 200) {
        console.log('   ✅ Server is online\n');
      } else {
        console.log(`   ⚠️  Server returned status ${healthResponse.status}\n`);
      }
    } catch (error) {
      console.log(`   ⚠️  Server not reachable: ${error.message}`);
      console.log('   ℹ️  Data will remain in local storage\n');
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
    // STEP 3: Filter Historical Data
    // ========================================================================
    console.log('🔍 Step 3: Filtering historical data...');
    
    const historicalSOs = salesOrders.filter(so => so.isHistoricalData === true);
    const historicalDeliveries = deliveries.filter(d => d.invoiceNo); // Linked to invoice = historical
    const historicalInvoices = invoices.filter(inv => inv.isHistoricalData !== false); // All imported invoices
    const historicalTaxRecords = taxRecords.filter(t => t.source === 'packaging-import' || t.timestamp > Date.now() - 86400000); // Last 24h
    
    console.log(`   ✅ Found ${historicalSOs.length} historical Sales Orders`);
    console.log(`   ✅ Found ${historicalDeliveries.length} historical Deliveries`);
    console.log(`   ✅ Found ${historicalInvoices.length} historical Invoices`);
    console.log(`   ✅ Found ${historicalTaxRecords.length} historical Tax Records\n`);
    
    // ========================================================================
    // STEP 4: Upload to Server
    // ========================================================================
    console.log('📤 Step 4: Uploading to server...\n');
    
    const results = {
      salesOrders: await uploadToServer('/packaging/salesOrders/sync', historicalSOs, 'Sales Orders'),
      deliveries: await uploadToServer('/packaging/deliveries/sync', historicalDeliveries, 'Deliveries'),
      invoices: await uploadToServer('/packaging/invoices/sync', historicalInvoices, 'Invoices'),
      taxRecords: await uploadToServer('/finance/taxRecords/sync', historicalTaxRecords, 'Tax Records')
    };
    
    // ========================================================================
    // STEP 5: Summary
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SYNC COMPLETE!');
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
    console.log('   1. Open the app on other devices');
    console.log('   2. Pull to refresh or restart the app');
    console.log('   3. Data should sync automatically from server');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return {
      success: true,
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
  syncImportedDataToServer()
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

module.exports = { syncImportedDataToServer };
