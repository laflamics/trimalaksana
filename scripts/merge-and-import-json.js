#!/usr/bin/env node

/**
 * Merge and Import JSON files - MERGE with existing data, don't replace
 * Usage: node scripts/merge-and-import-json.js <serverUrl>
 * Example: node scripts/merge-and-import-json.js http://100.81.50.37:9999
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = process.argv[2] || 'http://100.81.50.37:9999';
const INPUT_DIR = path.join(__dirname, 'master/packaging');

console.log(`🚀 Starting MERGE import to: ${API_URL}`);
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

async function callApi(endpoint, method = 'GET', data = null) {
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
    if (method === 'GET' && error.response?.status === 404) {
      return null; // Key doesn't exist yet
    }
    console.error(`❌ API Error [${method} ${endpoint}]:`, error.response?.data || error.message);
    throw error;
  }
}

async function mergeAndImportFile(filePath, storageKey, description) {
  if (!fs.existsSync(filePath)) {
    console.log(`   ⏭️  Skipping ${path.basename(filePath)} (not found)`);
    return 0;
  }
  
  const newData = readJsonFile(filePath);
  if (!newData) return 0;
  
  try {
    // Step 1: Fetch existing data from server
    const endpoint = `/api/storage/${encodeURIComponent(storageKey)}`;
    const existingResponse = await callApi(endpoint, 'GET');
    
    let existingData = [];
    if (existingResponse && existingResponse.value) {
      existingData = Array.isArray(existingResponse.value) ? existingResponse.value : [existingResponse.value];
    }
    
    // Step 2: Merge data (combine old + new)
    const newDataArray = Array.isArray(newData) ? newData : [newData];
    const mergedData = [...existingData, ...newDataArray];
    
    // Step 3: Remove duplicates by ID
    const uniqueMap = new Map();
    mergedData.forEach(item => {
      if (item && item.id) {
        uniqueMap.set(item.id, item);
      }
    });
    const finalData = Array.from(uniqueMap.values());
    
    // Step 4: POST merged data back to server
    const payload = { value: finalData };
    await callApi(endpoint, 'POST', payload);
    
    console.log(`   ✅ ${description}: ${newDataArray.length} new items merged (total: ${finalData.length})`);
    return newDataArray.length;
  } catch (error) {
    console.log(`   ⚠️  ${description}: Merge failed`);
    return 0;
  }
}

async function main() {
  try {
    let totalImported = 0;
    
    // Packaging Module
    console.log(`\n📦 Packaging Module`);
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'salesOrders.json'),
      'salesOrders',
      'Sales Orders'
    );
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'invoices.json'),
      'invoices',
      'Invoices'
    );
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'deliveryNotes.json'),
      'delivery',
      'Delivery Notes'
    );
    
    // General Trading Module
    console.log(`\n🏪 General Trading Module`);
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'gt_salesOrders.json'),
      'gt_salesOrders',
      'Sales Orders'
    );
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'gt_invoices.json'),
      'gt_invoices',
      'Invoices'
    );
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'gt_deliveryNotes.json'),
      'gt_delivery',
      'Delivery Notes'
    );
    
    // Trucking Module
    console.log(`\n🚚 Trucking Module`);
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'trucking_invoices.json'),
      'trucking_invoices',
      'Invoices'
    );
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'trucking_deliveryNotes.json'),
      'trucking_suratJalan',
      'Delivery Notes (Surat Jalan)'
    );
    totalImported += await mergeAndImportFile(
      path.join(INPUT_DIR, 'trucking_deliveryOrders.json'),
      'trucking_delivery_orders',
      'Delivery Orders'
    );
    
    console.log(`\n✅ All merges completed! Total new items: ${totalImported}`);
  } catch (error) {
    console.error(`\n❌ Merge failed:`, error.message);
    process.exit(1);
  }
}

main();
