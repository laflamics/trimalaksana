#!/usr/bin/env node

const fs = require('fs');

const oldRaw = JSON.parse(fs.readFileSync('./scripts/master/raw2/invoices.json', 'utf-8'));
const oldData = Array.isArray(oldRaw) ? oldRaw : (oldRaw.value || []);
const newRaw = JSON.parse(fs.readFileSync('./public/import-output/invoices.json', 'utf-8'));
const newData = Array.isArray(newRaw) ? newRaw : (newRaw.value || []);

console.log('📊 Invoice Data Comparison\n');
console.log('Old data (raw2):', oldData.length, 'invoices');
console.log('New data (output):', newData.length, 'invoices');

// Extract invoice numbers
const oldInvNos = new Set(oldData.map(inv => inv.invoiceNo));
const newInvNos = new Set(newData.map(inv => inv.invoiceNo));

console.log('\n🔍 Invoices in old but NOT in new:');
const missing = oldData.filter(inv => !newInvNos.has(inv.invoiceNo));
console.log('Count:', missing.length);

if (missing.length > 0) {
  console.log('\nMissing invoices:');
  missing.forEach(inv => {
    console.log('  -', inv.invoiceNo, '|', inv.customer, '|', inv.invoiceDate);
  });
}

// Check January data
console.log('\n📅 January Data Check:');
const oldJan = oldData.filter(inv => {
  const date = inv.invoiceDate || '';
  return date.includes('2026-01');
});
const newJan = newData.filter(inv => {
  const date = inv.created || inv.invoiceDate || '';
  return date.includes('2026-01');
});

console.log('Old January invoices:', oldJan.length);
console.log('New January invoices:', newJan.length);

if (oldJan.length > newJan.length) {
  console.log('\n⚠️  Missing January invoices:');
  const newJanNos = new Set(newJan.map(inv => inv.invoiceNo));
  const missingJan = oldJan.filter(inv => !newJanNos.has(inv.invoiceNo));
  
  console.log('Count:', missingJan.length);
  missingJan.forEach(inv => {
    console.log('  -', inv.invoiceNo, '|', inv.customer, '|', inv.invoiceDate);
  });
}

// Check February data
console.log('\n📅 February Data Check:');
const oldFeb = oldData.filter(inv => {
  const date = inv.invoiceDate || '';
  return date.includes('2026-02');
});
const newFeb = newData.filter(inv => {
  const date = inv.created || inv.invoiceDate || '';
  return date.includes('2026-02');
});

console.log('Old February invoices:', oldFeb.length);
console.log('New February invoices:', newFeb.length);

// Show extra invoices in new
console.log('\n✅ Extra invoices in new (not in old):');
const extra = newData.filter(inv => !oldInvNos.has(inv.invoiceNo));
console.log('Count:', extra.length);

if (extra.length > 0) {
  console.log('\nExtra invoices (first 20):');
  extra.slice(0, 20).forEach(inv => {
    console.log('  -', inv.invoiceNo, '|', inv.customer, '|', inv.created);
  });
}
