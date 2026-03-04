#!/usr/bin/env node

/**
 * Check timestamps on operational data keys
 * invoices, payments, delivery, expenses, operationalExpenses, journalEntries, returns, grn
 */

const fs = require('fs');
const path = require('path');

console.log('⏰ [CHECK OPERATIONAL KEYS TIMESTAMPS]\n');

const operationalKeys = [
  'invoices', 'payments', 'delivery', 'expenses', 'operationalExpenses',
  'journalEntries', 'returns', 'grn', 'deliveryNotifications', 'invoiceNotifications',
  'financeNotifications', 'productionNotifications'
];

const basePaths = [
  { name: 'Device', path: path.join(__dirname, '../data/localStorage/Packaging') },
  { name: 'Server', path: path.join(__dirname, '../docker/data/localStorage/packaging') },
];

basePaths.forEach(({ name, path: basePath }) => {
  console.log(`\n📁 ${name}: ${basePath}`);
  console.log('=' .repeat(70));
  
  operationalKeys.forEach(key => {
    const filePath = path.join(basePath, `${key}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  ${key}: file not found`);
      return;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items = data.value || data;
      
      if (!Array.isArray(items)) {
        console.log(`  ⏭️  ${key}: not an array (${typeof items})`);
        return;
      }
      
      const withTimestamp = items.filter(item => item.created || item.timestamp || item._timestamp).length;
      const withoutTimestamp = items.length - withTimestamp;
      
      if (items.length === 0) {
        console.log(`  ⏭️  ${key}: empty (0 items)`);
      } else if (withoutTimestamp === 0) {
        console.log(`  ✓ ${key}: ${items.length} items, ALL have timestamps`);
      } else {
        console.log(`  ⚠️  ${key}: ${items.length} items, ${withoutTimestamp} MISSING timestamps`);
      }
    } catch (e) {
      console.log(`  ✗ ${key}: error - ${e.message}`);
    }
  });
});

console.log(`\n${'=' .repeat(70)}\n`);
