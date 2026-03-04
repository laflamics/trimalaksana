#!/usr/bin/env node

/**
 * Import JSON data to PostgreSQL via REST API
 * Usage: node scripts/import-json-to-server.js <serverUrl> <storageKey> <jsonFile>
 * Example: node scripts/import-json-to-server.js http://100.81.50.37:3001 gt_salesOrders public/import-output/salesOrders.json
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function importData() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('❌ Usage: node scripts/import-json-to-server.js <serverUrl> <storageKey> <jsonFile>');
    console.error('Example: node scripts/import-json-to-server.js http://100.81.50.37:3001 gt_salesOrders public/import-output/salesOrders.json');
    process.exit(1);
  }

  const [serverUrl, storageKey, jsonFilePath] = args;

  try {
    // Read JSON file
    const fullPath = path.resolve(jsonFilePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array');
    }

    console.log(`📥 Importing ${data.length} items to ${storageKey}...`);
    console.log(`🔗 Server: ${serverUrl}`);

    // POST to server
    const response = await axios.post(
      `${serverUrl}/api/storage/${encodeURIComponent(storageKey)}`,
      { value: data },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    if (response.data.success) {
      console.log(`✅ Successfully imported ${data.length} items to ${storageKey}`);
      console.log(`📊 Response:`, JSON.stringify(response.data.data, null, 2));
    } else {
      console.error(`❌ Import failed:`, response.data.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('📋 Server response:', error.response.data);
    }
    process.exit(1);
  }
}

importData();
