const fs = require('fs');
const path = require('path');

console.log('🔄 Merging packaging invoices...\n');

// Read both files
const file1Path = path.join(__dirname, 'master/packaging/invoices.json');
const file2Path = path.join(__dirname, 'master/master2/import-output/invoices.json');

let invoices1 = [];
let invoices2 = [];

try {
  invoices1 = JSON.parse(fs.readFileSync(file1Path, 'utf8'));
  console.log(`✅ Read file 1: ${invoices1.length} invoices`);
} catch (err) {
  console.error(`❌ Error reading file 1:`, err.message);
}

try {
  invoices2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));
  console.log(`✅ Read file 2: ${invoices2.length} invoices`);
} catch (err) {
  console.error(`❌ Error reading file 2:`, err.message);
}

// Merge and deduplicate by invoiceNo
const mergedMap = new Map();

// Add from file 1
invoices1.forEach(inv => {
  if (inv.invoiceNo) {
    mergedMap.set(inv.invoiceNo, inv);
  }
});

// Add from file 2 (will overwrite if same invoiceNo)
invoices2.forEach(inv => {
  if (inv.invoiceNo) {
    mergedMap.set(inv.invoiceNo, inv);
  }
});

const merged = Array.from(mergedMap.values());

// Normalize each invoice
const normalized = merged.map(inv => {
  // Transform items to lines if needed
  let lines = inv.lines || [];
  if (lines.length === 0 && inv.items && Array.isArray(inv.items)) {
    lines = inv.items.map(item => ({
      itemSku: item.productKode || item.itemSku || item.sku || item.kode || '',
      itemName: item.productName || item.itemName || item.nama || '',
      qty: Number(item.qty || 0),
      unit: item.unit || 'PCS',
      price: Number(item.price || 0),
      total: Number(item.total || item.totalAkhir || 0),
      discount: Number(item.discount || 0),
      soNo: item.soNo || inv.soNo || '',
    }));
  }

  // Transform keterangan to notes if needed
  const notes = inv.notes || inv.keterangan || '';

  return {
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    soNo: inv.soNo,
    sjNo: inv.sjNo || inv.dlvNo || '',
    customer: inv.customer,
    created: inv.created,
    status: inv.status || 'OPEN',
    paymentStatus: inv.paymentStatus || 'OPEN',
    notes: notes,
    lines: lines,
    bom: inv.bom || {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      taxPercent: 0,
      discountPercent: 0,
      biayaLain: 0,
    },
  };
});

// Sort by created date
normalized.sort((a, b) => new Date(a.created) - new Date(b.created));

// Write merged file
fs.writeFileSync(file1Path, JSON.stringify(normalized, null, 2));

console.log(`\n✅ Merged and normalized: ${normalized.length} invoices`);
console.log(`📁 Saved to: ${file1Path}`);

// Show date range
const dates = [...new Set(normalized.map(d => new Date(d.created).toISOString().split('T')[0]))].sort();
console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
console.log(`📊 Total unique dates: ${dates.length}`);
