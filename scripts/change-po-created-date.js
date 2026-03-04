const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, '../data/localStorage/purchaseOrders.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Target date: January 20, 2026 at 17:05:01.749Z
const targetDate = '2026-01-20T17:05:01.749Z';

// Update all created dates
if (data.value && Array.isArray(data.value)) {
  data.value.forEach(po => {
    po.created = targetDate;
  });
}

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log(`✓ Updated ${data.value.length} purchase orders with created date: ${targetDate}`);
