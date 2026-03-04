#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/localStorage/Packaging');

const files = [
  'salesOrders.json',
  'delivery.json',
  'invoices.json'
];

console.log('📊 Data breakdown by month:\n');

files.forEach(file => {
  const filePath = path.join(dataPath, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const records = data.value || [];
  
  const byMonth = {};
  
  records.forEach(record => {
    const dateField = record.created || record.invoiceDate || record.deliveryDate;
    if (dateField) {
      const month = dateField.substring(0, 7); // "2026-01" or "2026-02"
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
  });
  
  console.log(`${file}:`);
  Object.keys(byMonth).sort().forEach(month => {
    console.log(`  ${month}: ${byMonth[month]} records`);
  });
  console.log(`  TOTAL: ${records.length} records\n`);
});
