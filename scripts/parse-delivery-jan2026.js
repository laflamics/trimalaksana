const XLSX = require('xlsx');
const fs = require('fs');

// Paths
const deliveryPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/delivjan2026.csv';
const odsPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.ods';
const outputPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026_DELIVERY_MERGED.csv';

// Helper: normalize SO number
function normalizeSO(soNumber) {
  if (!soNumber) return '';
  let normalized = String(soNumber).trim();
  
  const romanMap = {
    'XII': '12', 'XI': '11', 'X': '10', 'IX': '9', 'VIII': '8', 'VII': '7', 'VI': '6',
    'IV': '4', 'III': '3', 'II': '2', 'I': '1', 'V': '5'
  };
  
  Object.keys(romanMap).sort((a, b) => b.length - a.length).forEach(roman => {
    normalized = normalized.replace(new RegExp('\\b' + roman + '\\b', 'gi'), romanMap[roman]);
  });
  
  return normalized.replace(/\s+/g, '').toLowerCase();
}

// Read delivery file
console.log('Reading delivery file...');
const delWb = XLSX.readFile(deliveryPath);
const delWs = delWb.Sheets[delWb.SheetNames[0]];
const delData = XLSX.utils.sheet_to_json(delWs, { header: 1 });

console.log(`Total rows in delivery file: ${delData.length}`);

// Parse delivery data
// Row 0: Headers
// Row 1: Dates (1-31)
// Row 2: Surat Jalan numbers
// Row 3+: Data

const headers = delData[0];
const dateRow = delData[1];
const suratJalanRow = delData[2];

console.log('Headers:', headers.slice(0, 15));
console.log('Date row sample:', dateRow.slice(10, 20));
console.log('Surat Jalan row sample:', suratJalanRow.slice(10, 20));

// Extract delivery info from each data row
const deliveryMap = {}; // SO -> array of deliveries

for (let i = 3; i < delData.length; i++) {
  const row = delData[i];
  const poNo = row[2]; // NO PO column
  
  if (!poNo || poNo === '') continue;
  
  const soNo = normalizeSO(poNo);
  
  // Find all deliveries for this PO
  const deliveries = [];
  
  for (let colIdx = 10; colIdx < row.length; colIdx++) {
    const qty = row[colIdx];
    
    if (qty && qty !== '' && qty !== 0) {
      const dateVal = dateRow[colIdx];
      const suratJalanVal = suratJalanRow[colIdx];
      
      // Format date as dd/01/2026 (assuming January 2026)
      const day = String(dateVal).padStart(2, '0');
      const deliveryDate = `${day}/01/2026`;
      
      deliveries.push({
        date: deliveryDate,
        quantity: qty,
        suratJalan: suratJalanVal || ''
      });
    }
  }
  
  if (deliveries.length > 0) {
    if (!deliveryMap[soNo]) {
      deliveryMap[soNo] = [];
    }
    deliveryMap[soNo].push(...deliveries);
  }
}

console.log(`\nCreated delivery map with ${Object.keys(deliveryMap).length} unique SO numbers`);
console.log('Sample keys:', Object.keys(deliveryMap).slice(0, 5));

// Read ODS file
console.log('\nReading ODS file...');
const odsWb = XLSX.readFile(odsPath);
const odsWs = odsWb.Sheets[odsWb.SheetNames[0]];
const odsData = XLSX.utils.sheet_to_json(odsWs);

console.log(`Found ${odsData.length} SO records in ODS`);

// Create output: for each delivery, find matching SO
let outputData = [];
let matchCount = 0;

Object.entries(deliveryMap).forEach(([soNo, deliveries]) => {
  // Find matching SO in ODS
  const matchingSO = odsData.find(row => normalizeSO(row['No Transaksi']) === soNo);
  
  if (matchingSO) {
    deliveries.forEach(delivery => {
      const newRow = { ...matchingSO };
      newRow['Surat Jalan'] = delivery.suratJalan;
      newRow['Delivery Date'] = delivery.date;
      newRow['Delivery QTY'] = delivery.quantity;
      outputData.push(newRow);
      matchCount++;
    });
  }
});

console.log(`\nMatched: ${matchCount} delivery records`);
console.log(`Output rows: ${outputData.length}`);

// Write to CSV
console.log('Writing output file...');
const outWb = XLSX.utils.book_new();
const outWs = XLSX.utils.json_to_sheet(outputData);
XLSX.utils.book_append_sheet(outWb, outWs, 'Sheet1');
XLSX.writeFile(outWb, outputPath);

console.log(`✓ Done! Output saved to: ${outputPath}`);
