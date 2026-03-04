#!/usr/bin/env node

/**
 * Filter Packaging JSON files - remove entries from Feb 1-9, 2026
 * Usage: node scripts/filter-packaging-json-by-date.js <input_dir>
 * Example: node scripts/filter-packaging-json-by-date.js scripts/master/packaging/
 */

const fs = require('fs');
const path = require('path');

const inputDir = process.argv[2];

if (!inputDir) {
  console.error('❌ Error: Input directory is required');
  console.error('Usage: node scripts/filter-packaging-json-by-date.js <input_dir>');
  process.exit(1);
}

if (!fs.existsSync(inputDir)) {
  console.error(`❌ Error: Directory not found: ${inputDir}`);
  process.exit(1);
}

console.log(`📖 Reading from: ${inputDir}`);

// Date range to filter (Feb 1-9, 2026)
const startDate = new Date('2026-02-01T00:00:00Z');
const endDate = new Date('2026-02-09T23:59:59Z');

console.log(`🗑️  Filtering out dates: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

const filterByDate = (data, dateField = 'created') => {
  return data.filter(item => {
    if (!item[dateField]) return true;
    
    const itemDate = new Date(item[dateField]);
    const isInRange = itemDate >= startDate && itemDate <= endDate;
    
    if (isInRange) {
      console.log(`  ❌ Removing: ${item.soNo || item.invoiceNo || item.sjNo} (${itemDate.toISOString().split('T')[0]})`);
    }
    
    return !isInRange;
  });
};

// Process salesOrders.json
const soFile = path.join(inputDir, 'salesOrders.json');
if (fs.existsSync(soFile)) {
  console.log(`\n📦 Processing salesOrders.json...`);
  let soData = JSON.parse(fs.readFileSync(soFile, 'utf-8'));
  const originalSoCount = soData.length;
  soData = filterByDate(soData, 'created');
  const removedSo = originalSoCount - soData.length;
  fs.writeFileSync(soFile, JSON.stringify(soData, null, 2));
  console.log(`   ✅ Removed ${removedSo} entries (${soData.length} remaining)`);
}

// Process invoices.json
const invFile = path.join(inputDir, 'invoices.json');
if (fs.existsSync(invFile)) {
  console.log(`\n📄 Processing invoices.json...`);
  let invData = JSON.parse(fs.readFileSync(invFile, 'utf-8'));
  const originalInvCount = invData.length;
  invData = filterByDate(invData, 'created');
  const removedInv = originalInvCount - invData.length;
  fs.writeFileSync(invFile, JSON.stringify(invData, null, 2));
  console.log(`   ✅ Removed ${removedInv} entries (${invData.length} remaining)`);
}

// Process deliveryNotes.json
const dlvFile = path.join(inputDir, 'deliveryNotes.json');
if (fs.existsSync(dlvFile)) {
  console.log(`\n🚚 Processing deliveryNotes.json...`);
  let dlvData = JSON.parse(fs.readFileSync(dlvFile, 'utf-8'));
  const originalDlvCount = dlvData.length;
  dlvData = filterByDate(dlvData, 'deliveryDate');
  const removedDlv = originalDlvCount - dlvData.length;
  fs.writeFileSync(dlvFile, JSON.stringify(dlvData, null, 2));
  console.log(`   ✅ Removed ${removedDlv} entries (${dlvData.length} remaining)`);
}

console.log(`\n✅ Done! All files updated.`);
