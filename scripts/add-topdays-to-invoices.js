const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/import-output/invoices.json', 'utf8'));

// Tambahkan topDays ke setiap invoice
data.forEach(inv => {
  if (inv.bom && !inv.bom.topDays) {
    inv.bom.topDays = 30; // Default 30 hari
  }
});

fs.writeFileSync('public/import-output/invoices.json', JSON.stringify(data, null, 2));
console.log('✓ Added topDays to all invoices');
