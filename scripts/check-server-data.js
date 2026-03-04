#!/usr/bin/env node

/**
 * Check what data is stored in PostgreSQL via REST API
 * Usage: node scripts/check-server-data.js <serverUrl> [storageKey]
 * Example: node scripts/check-server-data.js http://100.81.50.37:3001
 * Example: node scripts/check-server-data.js http://100.81.50.37:3001 gt_salesOrders
 */

const axios = require('axios');

async function checkData() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('❌ Usage: node scripts/check-server-data.js <serverUrl> [storageKey]');
    console.error('Example: node scripts/check-server-data.js http://100.81.50.37:3001');
    process.exit(1);
  }

  const [serverUrl, storageKey] = args;

  try {
    if (storageKey) {
      // Check specific key
      console.log(`🔍 Checking ${storageKey} on ${serverUrl}...`);
      const response = await axios.get(
        `${serverUrl}/api/storage/${encodeURIComponent(storageKey)}`,
        { timeout: 10000 }
      );

      if (response.data.success) {
        const value = response.data.data.value;
        if (Array.isArray(value)) {
          console.log(`✅ Found ${value.length} items in ${storageKey}`);
          console.log(`📊 First item:`, JSON.stringify(value[0], null, 2));
        } else {
          console.log(`📦 Data type: ${typeof value}`);
          console.log(`📊 Data:`, JSON.stringify(value, null, 2).substring(0, 500));
        }
      } else {
        console.error(`❌ Error:`, response.data.error);
      }
    } else {
      // List all keys
      console.log(`📋 Listing all storage keys on ${serverUrl}...`);
      const response = await axios.get(
        `${serverUrl}/api/storage`,
        { timeout: 10000 }
      );

      if (response.data.success) {
        const items = response.data.data.items || [];
        console.log(`✅ Found ${items.length} storage keys:\n`);
        items.forEach(item => {
          console.log(`  • ${item.key}: ${item.count} items (updated: ${item.updatedAt})`);
        });
      } else {
        console.error(`❌ Error:`, response.data.error);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('📋 Server response:', error.response.data);
    }
    process.exit(1);
  }
}

checkData();
