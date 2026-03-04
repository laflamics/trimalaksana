#!/usr/bin/env node

/**
 * Test script untuk verify path di server
 * Cek apakah data ada di lokasi yang benar
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Keys yang perlu di-test
const testKeys = [
  // Trucking keys
  'trucking_suratJalan',
  'trucking_products',
  'trucking_suppliers',
  'trucking_customers',
  'trucking_drivers',
  'trucking_vehicles',
  'trucking_routes',
  'trucking_delivery_orders',
  'trucking_invoices',
  'trucking_payments',
  'trucking_suratJalanNotifications',
  'trucking_invoiceNotifications',
  
  // GT keys
  'gt_customers',
  'gt_suppliers',
  'gt_products',
  'gt_salesOrders',
  'gt_invoices',
  'gt_expenses',
  'gt_invoiceNotifications',
  'gt_paymentNotifications',
  
  // Packaging keys
  'products',
  'customers',
  'suppliers',
  'invoices',
  'payments',
  'salesOrders',
  'delivery',
  'deliveryNotes',
];

function getFilePath(key) {
  // Packaging keys
  const packagingKeys = ['products', 'bom', 'materials', 'customers', 'suppliers', 'staff', 
    'spk', 'schedule', 'production', 'qc', 'productionResults', 'ptp',
    'purchaseRequests', 'purchaseOrders', 'grn', 'grnPackaging', 'inventory',
    'salesOrders', 'delivery', 'deliveryNotes',
    'productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications',
    'payments', 'journalEntries', 'accounts', 'invoices', 'expenses',
    'audit', 'outbox', 'companySettings'];
  
  if (key.startsWith('packaging/')) {
    const actualKey = key.replace('packaging/', '');
    return path.join(DATA_DIR, 'localStorage', `${actualKey}.json`);
  }
  
  if (packagingKeys.includes(key)) {
    return path.join(DATA_DIR, 'localStorage', `${key}.json`);
  }
  
  if (key.startsWith('gt_')) {
    return path.join(DATA_DIR, 'localStorage', 'general-trading', `${key}.json`);
  }
  
  if (key.startsWith('trucking_')) {
    return path.join(DATA_DIR, 'localStorage', 'trucking', `${key}.json`);
  }
  
  return path.join(DATA_DIR, `${key}.json`);
}

console.log('🔍 Testing server paths...\n');
console.log(`📁 DATA_DIR: ${DATA_DIR}\n`);

const results = {
  found: [],
  notFound: [],
  errors: []
};

for (const key of testKeys) {
  const filePath = getFilePath(key);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      const itemCount = Array.isArray(data) ? data.length : (data.value ? (Array.isArray(data.value) ? data.value.length : 1) : 1);
      
      results.found.push({
        key,
        path: filePath,
        size: stats.size,
        items: itemCount
      });
      
      console.log(`✅ ${key}`);
      console.log(`   📍 ${filePath}`);
      console.log(`   📊 ${itemCount} items, ${stats.size} bytes\n`);
    } catch (error) {
      results.errors.push({
        key,
        path: filePath,
        error: error.message
      });
      console.log(`⚠️  ${key} - ERROR parsing JSON`);
      console.log(`   📍 ${filePath}`);
      console.log(`   ❌ ${error.message}\n`);
    }
  } else {
    results.notFound.push({
      key,
      path: filePath
    });
    console.log(`❌ ${key} - NOT FOUND`);
    console.log(`   📍 ${filePath}\n`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Found: ${results.found.length}/${testKeys.length}`);
console.log(`❌ Not found: ${results.notFound.length}/${testKeys.length}`);
console.log(`⚠️  Errors: ${results.errors.length}/${testKeys.length}`);

if (results.notFound.length > 0) {
  console.log('\n❌ Missing keys:');
  results.notFound.forEach(item => {
    console.log(`   - ${item.key}`);
  });
}

if (results.errors.length > 0) {
  console.log('\n⚠️  Keys with errors:');
  results.errors.forEach(item => {
    console.log(`   - ${item.key}: ${item.error}`);
  });
}

console.log('\n✅ Path test complete!');
