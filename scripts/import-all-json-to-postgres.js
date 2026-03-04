#!/usr/bin/env node

/**
 * Import all JSON files (Packaging, GT, Trucking) to PostgreSQL
 * Usage: node scripts/import-all-json-to-postgres.js <serverUrl>
 * Example: node scripts/import-all-json-to-postgres.js http://100.81.50.37:9999
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = process.argv[2] || 'http://100.81.50.37:9999';
const INPUT_DIR = path.join(__dirname, 'master/packaging');

console.log(`🚀 Starting import to: ${API_URL}`);
console.log(`📁 Reading from: ${INPUT_DIR}\n`);

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return null;
  }
}

async function callApi(endpoint, method = 'POST', data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ API Error [${method} ${endpoint}]:`, error.response?.data || error.message);
    throw error;
  }
}

async function importFile(filePath, storageKey, description) {
  if (!fs.existsSync(filePath)) {
    console.log(`   ⏭️  Skipping ${path.basename(filePath)} (not found)`);
    return 0;
  }
  
  const data = readJsonFile(filePath);
  if (!data) return 0;
  
  try {
    const endpoint = `/api/storage/${encodeURIComponent(storageKey)}`;
    const payload = { value: Array.isArray(data) ? data : [data] };
    
    await callApi(endpoint, 'POST', payload);
    const count = Array.isArray(data) ? data.length : 1;
    console.log(`   ✅ ${description}: ${count} items imported`);
    return count;
  } catch (error) {
    console.log(`   ⚠️  ${description}: Import failed`);
    return 0;
  }
}

async function main() {
  try {
    let totalImported = 0;
    
    // Packaging Module (no prefix)
    console.log(`\n📦 Packaging Module`);
    totalImported += await importFile(
      path.join(INPUT_DIR, 'salesOrders.json'),
      'salesOrders',
      'Sales Orders'
    );
    totalImported += await importFile(
      path.join(INPUT_DIR, 'invoices.json'),
      'invoices',
      'Invoices'
    );
    totalImported += await importFile(
      path.join(INPUT_DIR, 'deliveryNotes.json'),
      'delivery',
      'Delivery Notes'
    );
    
    // General Trading Module (gt_ prefix)
    console.log(`\n🏪 General Trading Module`);
    totalImported += await importFile(
      path.join(INPUT_DIR, 'gt_salesOrders.json'),
      'gt_salesOrders',
      'Sales Orders'
    );
    totalImported += await importFile(
      path.join(INPUT_DIR, 'gt_invoices.json'),
      'gt_invoices',
      'Invoices'
    );
    totalImported += await importFile(
      path.join(INPUT_DIR, 'gt_deliveryNotes.json'),
      'gt_delivery',
      'Delivery Notes'
    );
    
    // Trucking Module (trucking_ prefix)
    console.log(`\n🚚 Trucking Module`);
    totalImported += await importFile(
      path.join(INPUT_DIR, 'trucking_invoices.json'),
      'trucking_invoices',
      'Invoices'
    );
    totalImported += await importFile(
      path.join(INPUT_DIR, 'trucking_suratJalan.json'),
      'trucking_suratJalan',
      'Delivery Notes (Surat Jalan)'
    );
    totalImported += await importFile(
      path.join(INPUT_DIR, 'trucking_deliveryOrders.json'),
      'trucking_delivery_orders',
      'Delivery Orders'
    );
    
    console.log(`\n✅ All imports completed! Total items: ${totalImported}`);
  } catch (error) {
    console.error(`\n❌ Import failed:`, error.message);
    process.exit(1);
  }
}

main();
