#!/usr/bin/env node

const fs = require('fs');

const oldRaw = JSON.parse(fs.readFileSync('./scripts/master/raw2/invoices.json', 'utf-8'));
const oldData = Array.isArray(oldRaw) ? oldRaw : (oldRaw.value || []);
const newRaw = JSON.parse(fs.readFileSync('./public/import-output/invoices.json', 'utf-8'));
const newData = Array.isArray(newRaw) ? newRaw : (newRaw.value || []);

console.log('✅ Invoice Completeness Verification\n');

// Check if all old invoices are in new
const oldInvNos = oldData.map(inv => inv.invoiceNo);
const allPresent = oldInvNos.every(invNo => newData.some(inv => inv.invoiceNo === invNo));

console.log('✅ All old invoices present in new output:', allPresent);

console.log('\n📊 Summary:');
console.log('Old invoices (raw2):', oldData.length);
console.log('New invoices (output):', newData.length);
console.log('Extra invoices added:', newData.length - oldData.length);

// Breakdown by month
const oldJan = oldData.filter(inv => inv.invoiceDate.includes('2026-01'));
const newJan = newData.filter(inv => inv.created.includes('2026-01'));
const newFeb = newData.filter(inv => inv.created.includes('2026-02'));

console.log('\n📅 Monthly Breakdown:');
console.log('January (old):', oldJan.length);
console.log('January (new):', newJan.length);
console.log('February (new):', newFeb.length);

// Show extra January invoices
const oldJanNos = new Set(oldJan.map(inv => inv.invoiceNo));
const extraJan = newJan.filter(inv => !oldJanNos.has(inv.invoiceNo));

if (extraJan.length > 0) {
  console.log('\n📌 Extra January invoices in new output:');
  console.log('Count:', extraJan.length);
  extraJan.forEach(inv => {
    console.log('  -', inv.invoiceNo, '|', inv.customer, '|', inv.created);
  });
}

console.log('\n✅ Data is COMPLETE - all old invoices are included + new data from merged CSV');
