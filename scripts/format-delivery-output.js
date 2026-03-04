const XLSX = require('xlsx');
const fs = require('fs');

const deliveryPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/delivjan2026.csv';
const outputPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/delivjan2026_FORMATTED.csv';

console.log('Reading delivery file...');
const wb = XLSX.readFile(deliveryPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`Total rows: ${rawData.length}`);

// Row 0: Headers
// Row 1: Dates (1-31)
// Row 2: Surat Jalan
// Row 3+: Data

const headers = rawData[0];
const dateRow = rawData[1];
const suratJalanRow = rawData[2];

console.log('Headers:', headers.slice(0, 12));

// Output format: So No, Code Item, Nama Item, Customer, Delivery Date, Delivery QTY, Surat Jalan
const outputData = [];

// Process each data row (starting from row 3)
for (let i = 3; i < rawData.length; i++) {
  const row = rawData[i];
  
  const poNo = row[2]; // NO PO
  const codeItem = row[3]; // CODE ITEM
  const namaItem = row[4]; // NAMA ITEM
  const customer = row[1]; // List Customer
  
  if (!poNo || poNo === '') continue;
  
  // Find all deliveries in this row (columns 10+)
  for (let colIdx = 10; colIdx < row.length; colIdx++) {
    const qty = row[colIdx];
    
    // Only process if there's a quantity
    if (qty && qty !== '' && qty !== 0 && !isNaN(qty)) {
      const dateVal = dateRow[colIdx];
      const suratJalanVal = suratJalanRow[colIdx];
      
      // Format date as dd/01/2026
      const day = String(dateVal).padStart(2, '0');
      const deliveryDate = `${day}/01/2026`;
      
      outputData.push({
        'So No': poNo,
        'Code Item': codeItem || '',
        'Nama Item': namaItem || '',
        'Customer': customer || '',
        'Delivery Date': deliveryDate,
        'Delivery QTY': qty,
        'Surat Jalan': suratJalanVal || ''
      });
    }
  }
}

console.log(`\nProcessed ${outputData.length} delivery records`);

// Write to CSV
console.log('Writing output file...');
const outWb = XLSX.utils.book_new();
const outWs = XLSX.utils.json_to_sheet(outputData);
XLSX.utils.book_append_sheet(outWb, outWs, 'Sheet1');
XLSX.writeFile(outWb, outputPath);

console.log(`✓ Done! Output: ${outputPath}`);
console.log(`Columns: So No, Code Item, Nama Item, Customer, Delivery Date, Delivery QTY, Surat Jalan`);
