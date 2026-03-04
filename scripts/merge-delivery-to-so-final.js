const XLSX = require('xlsx');
const fs = require('fs');

const deliveryPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/delivjan2026_FORMATTED.csv';
const soPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026_1.csv';
const outputPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026_1_MERGED.csv';

// Helper: convert Excel date number to dd/mm/yyyy
function excelDateToString(excelDate) {
  if (!excelDate || excelDate === '') return '';
  
  // If already formatted as dd/mm/yyyy, return as is
  if (typeof excelDate === 'string' && excelDate.includes('/')) {
    return excelDate;
  }
  
  // Convert Excel date number
  const num = Number(excelDate);
  if (isNaN(num)) return String(excelDate);
  
  // Excel epoch: 1/1/1900
  const date = new Date((num - 25569) * 86400 * 1000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// Helper: normalize SO
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
const delData = XLSX.utils.sheet_to_json(delWs);

console.log(`Found ${delData.length} delivery records`);

// Create delivery map: normalized SO -> array of deliveries
const deliveryMap = {};
delData.forEach(row => {
  const soNo = normalizeSO(row['So No']);
  if (soNo) {
    if (!deliveryMap[soNo]) {
      deliveryMap[soNo] = [];
    }
    
    deliveryMap[soNo].push({
      date: excelDateToString(row['Delivery Date']),
      qty: row['Delivery QTY'],
      suratJalan: row['Surat Jalan'] || ''
    });
  }
});

console.log(`Created delivery map with ${Object.keys(deliveryMap).length} unique SO numbers`);

// Read SO file
console.log('Reading SO file...');
const soWb = XLSX.readFile(soPath);
const soWs = soWb.Sheets[soWb.SheetNames[0]];
const soData = XLSX.utils.sheet_to_json(soWs);

console.log(`Found ${soData.length} SO records`);

// Merge: for each SO, add delivery info
let matchCount = 0;
const outputData = soData.map(soRow => {
  const soNo = normalizeSO(soRow['So No']);
  
  if (soNo && deliveryMap[soNo] && deliveryMap[soNo].length > 0) {
    const delivery = deliveryMap[soNo][0]; // Take first delivery
    soRow['Surat Jalan'] = delivery.suratJalan;
    soRow['Delivery Date'] = delivery.date;
    soRow['Delivery QTY'] = delivery.qty;
    matchCount++;
  }
  
  return soRow;
});

console.log(`\nMatched: ${matchCount}/${soData.length} SO records`);

// Write output
console.log('Writing output file...');
const outWb = XLSX.utils.book_new();
const outWs = XLSX.utils.json_to_sheet(outputData);
XLSX.utils.book_append_sheet(outWb, outWs, 'Sheet1');
XLSX.writeFile(outWb, outputPath);

console.log(`✓ Done! Output: ${outputPath}`);
