#!/usr/bin/env node

/**
 * Combine all JSON data from 3 sources:
 * 1. Packaging: scripts/master/master2/import-output/
 * 2. GT: scripts/master/gt/
 * 3. Trucking: scripts/master/trucking/
 * 
 * Output: scripts/master/packaging/ (combined files)
 * 
 * Usage: node scripts/combine-all-data.js
 */

const fs = require('fs');
const path = require('path');

const PACKAGING_DIR = path.join(__dirname, 'master/master2/import-output');
const GT_DIR = path.join(__dirname, 'master/gt');
const TRUCKING_DIR = path.join(__dirname, 'master/trucking');
const OUTPUT_DIR = path.join(__dirname, 'master/packaging');

console.log(`🔄 Combining all data from 3 sources...\n`);

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Handle wrapped format { value: [...] }
    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      return Array.isArray(parsed.value) ? parsed.value : [];
    }
    
    // Handle direct array format
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error writing ${filePath}:`, error.message);
    return false;
  }
}

function mergeArrays(arr1, arr2) {
  if (!Array.isArray(arr1)) arr1 = [];
  if (!Array.isArray(arr2)) arr2 = [];
  
  // Merge and remove duplicates by ID
  const merged = [...arr1, ...arr2];
  const uniqueMap = new Map();
  
  merged.forEach(item => {
    if (item && item.id) {
      uniqueMap.set(item.id, item);
    }
  });
  
  return Array.from(uniqueMap.values());
}

// Packaging Module
console.log(`📦 Packaging Module`);
const pkgSalesOrders = readJsonFile(path.join(PACKAGING_DIR, 'salesOrders.json')) || [];
const pkgInvoices = readJsonFile(path.join(PACKAGING_DIR, 'invoices.json')) || [];
const pkgDeliveryNotes = readJsonFile(path.join(PACKAGING_DIR, 'deliveryNotes.json')) || [];

writeJsonFile(path.join(OUTPUT_DIR, 'salesOrders.json'), pkgSalesOrders);
console.log(`   ✅ salesOrders.json: ${pkgSalesOrders.length} items`);

writeJsonFile(path.join(OUTPUT_DIR, 'invoices.json'), pkgInvoices);
console.log(`   ✅ invoices.json: ${pkgInvoices.length} items`);

writeJsonFile(path.join(OUTPUT_DIR, 'deliveryNotes.json'), pkgDeliveryNotes);
console.log(`   ✅ deliveryNotes.json: ${pkgDeliveryNotes.length} items`);

// General Trading Module
console.log(`\n🏪 General Trading Module`);
const gtSalesOrders = readJsonFile(path.join(GT_DIR, 'gt_salesOrders.json')) || [];
const gtInvoices = readJsonFile(path.join(GT_DIR, 'gt_invoices.json')) || [];
const gtDelivery = readJsonFile(path.join(GT_DIR, 'gt_delivery.json')) || [];

writeJsonFile(path.join(OUTPUT_DIR, 'gt_salesOrders.json'), gtSalesOrders);
console.log(`   ✅ gt_salesOrders.json: ${gtSalesOrders.length} items`);

writeJsonFile(path.join(OUTPUT_DIR, 'gt_invoices.json'), gtInvoices);
console.log(`   ✅ gt_invoices.json: ${gtInvoices.length} items`);

writeJsonFile(path.join(OUTPUT_DIR, 'gt_deliveryNotes.json'), gtDelivery);
console.log(`   ✅ gt_deliveryNotes.json: ${gtDelivery.length} items`);

// Trucking Module
console.log(`\n🚚 Trucking Module`);
const truckingInvoices = readJsonFile(path.join(TRUCKING_DIR, 'trucking_invoices.json')) || [];
const truckingSuratJalan = readJsonFile(path.join(TRUCKING_DIR, 'trucking_suratJalan.json')) || [];
const truckingDeliveryOrders = readJsonFile(path.join(TRUCKING_DIR, 'trucking_delivery_orders.json')) || [];

writeJsonFile(path.join(OUTPUT_DIR, 'trucking_invoices.json'), truckingInvoices);
console.log(`   ✅ trucking_invoices.json: ${truckingInvoices.length} items`);

writeJsonFile(path.join(OUTPUT_DIR, 'trucking_deliveryNotes.json'), truckingSuratJalan);
console.log(`   ✅ trucking_deliveryNotes.json: ${truckingSuratJalan.length} items`);

writeJsonFile(path.join(OUTPUT_DIR, 'trucking_deliveryOrders.json'), truckingDeliveryOrders);
console.log(`   ✅ trucking_deliveryOrders.json: ${truckingDeliveryOrders.length} items`);

console.log(`\n✅ All data combined to: ${OUTPUT_DIR}`);
console.log(`\n📊 Summary:`);
console.log(`   Packaging: ${pkgSalesOrders.length + pkgInvoices.length + pkgDeliveryNotes.length} items`);
console.log(`   GT: ${gtSalesOrders.length + gtInvoices.length + gtDelivery.length} items`);
console.log(`   Trucking: ${truckingInvoices.length + truckingSuratJalan.length + truckingDeliveryOrders.length} items`);
console.log(`   TOTAL: ${pkgSalesOrders.length + pkgInvoices.length + pkgDeliveryNotes.length + gtSalesOrders.length + gtInvoices.length + gtDelivery.length + truckingInvoices.length + truckingSuratJalan.length + truckingDeliveryOrders.length} items`);
