/**
 * Force sync trucking data from local storage to server
 * Gunakan ini untuk push data yang stuck di local
 */

const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../data/localStorage/trucking');
const SERVER_URL = 'https://server-tljp.tail75a421.ts.net';

const keys = [
  'trucking_suratJalan',
  'trucking_suratJalanNotifications',
  'trucking_delivery_orders',
  'trucking_unitSchedules',
  'trucking_drivers',
  'trucking_vehicles',
  'trucking_routes',
  'trucking_customers',
  'trucking_suppliers',
  'trucking_products',
];

async function syncToServer() {
  console.log('🚀 Starting force sync to server...\n');
  
  let syncedCount = 0;
  let errorCount = 0;
  
  for (const key of keys) {
    try {
      const filePath = path.join(STORAGE_PATH, `${key}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  ${key}: File not found, skipping`);
        continue;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Extract value if wrapped
      const value = data.value || data;
      
      // Skip if empty
      if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
        console.log(`⏭️  ${key}: Empty data, skipping`);
        continue;
      }
      
      // POST to server
      const url = `${SERVER_URL}/api/storage/trucking/${key}`;
      console.log(`📤 Syncing ${key}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, timestamp: Date.now() })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${key}: Synced successfully`);
        syncedCount++;
      } else {
        console.log(`❌ ${key}: HTTP ${response.status}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ ${key}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary: ${syncedCount} synced, ${errorCount} errors`);
}

syncToServer().catch(console.error);
