#!/usr/bin/env node

/**
 * Sync Imported Data to Server (Version 2)
 * 
 * This script syncs data that was imported via import-packaging-historical-data.js
 * to the server so it can be synced to other devices.
 * 
 * Strategy:
 * 1. Read data from data/localStorage/
 * 2. POST each data type to server endpoints
 * 3. Server will broadcast changes to other devices via WebSocket
 * 
 * Usage: node scripts/sync-imported-data-to-server-v2.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Get server URL from environment or use default
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8888';
const TIMEOUT = 30000; // 30 seconds

// Data types to sync
const DATA_TYPES = [
  'salesOrders',
  'delivery',
  'invoices',
  'taxRecords'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make HTTP request to server
 */
const makeRequest = (method, endpoint, data = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SERVER_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: TIMEOUT
    };
    
    // Add certificate verification bypass for self-signed certs (Tailscale)
    if (isHttps) {
      options.rejectUnauthorized = false;
    }
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TIMEOUT}ms`));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
};

/**
 * Read JSON file
 */
const readJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Sync data to server
 */
const syncDataToServer = async (key, data) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log(`   ⏭️  Skipped ${key} (empty)`);
    return { success: true, skipped: true };
  }
  
  try {
    // POST to /api/storage/{key}
    const endpoint = `/api/storage/${key}`;
    console.log(`   📤 Syncing ${key} (${Array.isArray(data) ? data.length : 1} items)...`);
    
    const response = await makeRequest('POST', endpoint, { [key]: data });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`   ✅ ${key} synced successfully`);
      return { success: true, status: response.status };
    } else if (response.status === 404) {
      console.log(`   ⚠️  Endpoint not found: ${endpoint}`);
      return { success: false, status: response.status, error: 'Endpoint not found' };
    } else {
      console.log(`   ⚠️  Server returned ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.error(`   ❌ Error syncing ${key}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// MAIN
// ============================================================================

const main = async () => {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 Starting Data Sync to Server (v2)...');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📡 Server URL: ${SERVER_URL}\n`);
  
  // Step 1: Read data from file system
  console.log('📂 Step 1: Reading data from file system...\n');
  
  const dataDir = path.join(__dirname, '../data/localStorage');
  const dataToSync = {};
  let totalItems = 0;
  
  for (const dataType of DATA_TYPES) {
    const filePath = path.join(dataDir, `${dataType}.json`);
    const data = readJSON(filePath);
    
    if (data) {
      dataToSync[dataType] = data;
      const count = Array.isArray(data) ? data.length : 1;
      totalItems += count;
      console.log(`   ✅ Loaded ${dataType}: ${count} items`);
    } else {
      console.log(`   ⚠️  Not found: ${dataType}`);
    }
  }
  
  console.log(`\n   📊 Total items to sync: ${totalItems}\n`);
  
  if (totalItems === 0) {
    console.log('⚠️  No data to sync. Exiting.\n');
    return;
  }
  
  // Step 2: Sync data to server
  console.log('📤 Step 2: Syncing data to server...\n');
  
  const results = {};
  let successCount = 0;
  let failureCount = 0;
  
  for (const [key, data] of Object.entries(dataToSync)) {
    const result = await syncDataToServer(key, data);
    results[key] = result;
    
    if (result.success && !result.skipped) {
      successCount++;
    } else if (!result.success) {
      failureCount++;
    }
  }
  
  // Step 3: Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ SYNC COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏱️  Duration: ${duration}s\n`);
  
  console.log('📊 Summary:');
  console.log(`   • Synced: ${successCount}`);
  console.log(`   • Failed: ${failureCount}`);
  console.log(`   • Total items: ${totalItems}\n`);
  
  if (failureCount > 0) {
    console.log('⚠️  Some data failed to sync. Check server connectivity.\n');
  } else {
    console.log('✨ All data synced successfully!\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
};

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
