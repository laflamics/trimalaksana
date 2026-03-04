const fs = require('fs');
const path = require('path');

// Read both CSV files
const invoicePath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/INVOICE_JAN_26_CLEAN.csv';
const deliveryPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/Delivery_enriched.csv';
const outputPath = path.join(__dirname, '../data/raw/Delivery_enriched_with_invoice.csv');

console.log('Reading files...');
const invoiceContent = fs.readFileSync(invoicePath, 'utf-8');
const deliveryContent = fs.readFileSync(deliveryPath, 'utf-8');

const invoiceLines = invoiceContent.split('\n');
const deliveryLines = deliveryContent.split('\n');

console.log(`Invoice lines: ${invoiceLines.length}`);
console.log(`Delivery lines: ${deliveryLines.length}`);

// Parse invoice data into a map
// Key: padCode|itemCode -> Set of invoice numbers
const invoiceMap = new Map();

for (let i = 1; i < invoiceLines.length; i++) {
  const line = invoiceLines[i].trim();
  if (!line) continue;
  
  const columns = line.split(',');
  if (columns.length < 9) continue;
  
  const padCode = columns[1];
  const itemCode = columns[3];
  const invoiceNo = columns[8];
  
  if (!padCode || !itemCode || !invoiceNo) continue;
  
  const key = `${padCode}|${itemCode}`;
  
  if (!invoiceMap.has(key)) {
    invoiceMap.set(key, new Set());
  }
  invoiceMap.get(key).add(invoiceNo);
}

console.log(`Invoice map size: ${invoiceMap.size}`);

// Process delivery data and add invoice numbers
let matchedCount = 0;
let unmatchedCount = 0;

const deliveryWithInvoice = deliveryLines.map((line, index) => {
  if (index === 0) {
    // Header - add Invoice No column
    return line.trim() + ',Invoice No';
  }
  
  const columns = line.split(',');
  if (columns.length < 7) {
    return line + ',';
  }
  
  const padCode = columns[0];
  const itemCode = columns[5]; // Kode column
  
  if (!padCode || !itemCode) {
    return line + ',';
  }
  
  // Try to find invoice number
  const key = `${padCode}|${itemCode}`;
  const invoiceSet = invoiceMap.get(key);
  
  if (invoiceSet && invoiceSet.size > 0) {
    matchedCount++;
    const invoiceNos = Array.from(invoiceSet).join('; ');
    if (matchedCount <= 10) {
      console.log(`✓ Match: ${key} -> ${invoiceNos}`);
    }
    return line + ',' + invoiceNos;
  } else {
    unmatchedCount++;
    return line + ',';
  }
});

// Write output
fs.writeFileSync(outputPath, deliveryWithInvoice.join('\n'), 'utf-8');

console.log(`\n✅ Processing complete!`);
console.log(`📊 Matched: ${matchedCount} deliveries`);
console.log(`📊 Unmatched: ${unmatchedCount} deliveries`);
console.log(`📄 Output saved to: ${outputPath}`);
