#!/usr/bin/env node

/**
 * Pull Surat Jalan data dari server dan taro di root data/
 * Lengkap sesuai yang ada di server
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SERVER_URL = 'https://server-tljp.tail75a421.ts.net';

// Keys yang perlu di-pull
const keysToSync = [
  'trucking_suratJalan',
  'trucking_suratJalanNotifications',
  'trucking_delivery_orders',
  'trucking_customers',
  'trucking_drivers',
  'trucking_vehicles',
  'trucking_routes',
  'trucking_invoices',
  'trucking_payments',
  'trucking_products',
  'trucking_suppliers',
  'trucking_invoiceNotifications',
];

async function fetchFromServer(key) {
  return new Promise((resolve, reject) => {
    const url = `${SERVER_URL}/api/storage/${encodeURIComponent(key)}`;
    
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response for ${key}: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Failed to fetch ${key}: ${err.message}`));
    });
  });
}

async function saveToFile(key, data) {
  // Determine file path
  let filePath;
  
  if (key.startsWith('trucking_')) {
    filePath = path.join(DATA_DIR, 'localStorage', 'trucking', `${key}.json`);
  } else {
    filePath = path.join(DATA_DIR, 'localStorage', `${key}.json`);
  }
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Extract value if wrapped
  let finalData = data.value !== undefined ? data.value : data;
  
  // Ensure it's an array or object
  if (!Array.isArray(finalData) && typeof finalData !== 'object') {
    finalData = [];
  }
  
  // Write to file
  fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2), 'utf8');
  
  return {
    key,
    filePath,
    itemCount: Array.isArray(finalData) ? finalData.length : 1,
    size: fs.statSync(filePath).size
  };
}

async function main() {
  console.log('🔄 Pulling Surat Jalan data from server...\n');
  console.log(`📡 Server: ${SERVER_URL}\n`);
  
  const results = {
    success: [],
    failed: [],
    total: keysToSync.length
  };
  
  for (const key of keysToSync) {
    try {
      console.log(`⏳ Fetching ${key}...`);
      const serverData = await fetchFromServer(key);
      
      const saved = await saveToFile(key, serverData);
      results.success.push(saved);
      
      console.log(`✅ ${key}`);
      console.log(`   📍 ${saved.filePath}`);
      console.log(`   📊 ${saved.itemCount} items, ${saved.size} bytes\n`);
    } catch (error) {
      results.failed.push({
        key,
        error: error.message
      });
      console.log(`❌ ${key} - ERROR`);
      console.log(`   ❌ ${error.message}\n`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${results.success.length}/${results.total}`);
  console.log(`❌ Failed: ${results.failed.length}/${results.total}`);
  
  if (results.success.length > 0) {
    console.log('\n✅ Successfully synced:');
    results.success.forEach(item => {
      console.log(`   - ${item.key}: ${item.itemCount} items`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed to sync:');
    results.failed.forEach(item => {
      console.log(`   - ${item.key}: ${item.error}`);
    });
  }
  
  console.log('\n✅ Pull complete!');
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
