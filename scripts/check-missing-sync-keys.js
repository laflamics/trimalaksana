#!/usr/bin/env node

/**
 * Check which keys exist in server data but are NOT in sync config
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 [CHECK MISSING SYNC KEYS]\n');

// Get all files from server
const serverPath = path.join(__dirname, '../docker/data/localStorage/packaging');
const serverFiles = fs.readdirSync(serverPath)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''))
  .sort();

console.log(`Found ${serverFiles.length} files on server:\n`);

// Keys in sync config (from storage.ts)
const syncKeys = [
  'products', 'materials', 'customers', 'suppliers', 
  'userAccessControl', 'salesOrders', 'purchaseOrders',
  'production', 'inventory', 'bom', 'spk', 'qc', 'quotations',
  'invoices', 'payments', 'delivery', 'grn', 'returns',
  'expenses', 'operationalExpenses', 'journalEntries', 'taxRecords',
  'accounts', 'staff', 'attendance',
  'productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications',
  'activityLogs',
  'purchaseRequests', 'schedule'
];

const syncKeySet = new Set(syncKeys);

// Find missing keys
const missingKeys = serverFiles.filter(key => !syncKeySet.has(key));

console.log('📋 SYNC CONFIG KEYS:');
console.log('=' .repeat(60));
syncKeys.forEach(key => {
  const exists = serverFiles.includes(key);
  const status = exists ? '✓' : '✗';
  console.log(`  ${status} ${key}`);
});

if (missingKeys.length > 0) {
  console.log('\n⚠️  KEYS ON SERVER BUT NOT IN SYNC CONFIG:');
  console.log('=' .repeat(60));
  missingKeys.forEach(key => {
    const filePath = path.join(serverPath, `${key}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items = data.value || data;
      const count = Array.isArray(items) ? items.length : 'N/A';
      console.log(`  ⚠️  ${key}: ${count} items`);
    } catch (e) {
      console.log(`  ⚠️  ${key}: (error reading)`);
    }
  });
} else {
  console.log('\n✓ All server files are in sync config');
}

console.log('\n' + '=' .repeat(60) + '\n');
