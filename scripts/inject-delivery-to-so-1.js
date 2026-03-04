const XLSX = require('xlsx');
const fs = require('fs');

// Paths
const deliveryPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/DELIVERY_SCHEDULE_FORMATTED.csv';
const soPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026_1.csv';

// Helper: normalize SO number
function normalizeSO(soNumber) {
  if (!soNumber) return '';
  let normalized = String(soNumber).trim();
  
  // Convert roman numerals to numbers
  const romanMap = {
    'XII': '12', 'XI': '11', 'X': '10', 'IX': '9', 'VIII': '8', 'VII': '7', 'VI': '6',
    'IV': '4', 'III': '3', 'II': '2', 'I': '1', 'V': '5'
  };
  
  Object.keys(romanMap).sort((a, b) => b.length - a.length).forEach(roman => {
    normalized = normalized.replace(new RegExp('\\b' + roman + '\\b', 'gi'), romanMap[roman]);
  });
  
  return normalized.replace(/\s+/g, '').toLowerCase();
}

// Read delivery schedule
console.log('Reading delivery schedule...');
const delWb = XLSX.readFile(deliveryPath);
const delWs = delWb.Sheets[delWb.SheetNames[0]];
const delData = XLSX.utils.sheet_to_json(delWs);

console.log(`Found ${delData.length} delivery records`);

// Create map: normalized SO -> first delivery
const deliveryMap = {};
delData.forEach(row => {
  const soNo = normalizeSO(row['So No']);
  if (soNo && !deliveryMap[soNo]) {
    deliveryMap[soNo] = {
      deliveryDate: row['Delivery Date'] || '',
      quantity: row['Delivery QTY'] || '',
      suratJalan: row['Surat Jalan'] || ''
    };
  }
});

console.log(`Created delivery map with ${Object.keys(deliveryMap).length} unique SO numbers`);

// Read SO file
console.log('Reading SO file...');
const soWb = XLSX.readFile(soPath);
const soWs = soWb.Sheets[soWb.SheetNames[0]];
const soData = XLSX.utils.sheet_to_json(soWs);

console.log(`Found ${soData.length} SO records`);

// Inject delivery data
let matchCount = 0;
const updatedData = soData.map(row => {
  const soNo = normalizeSO(row['So No']);
  
  if (soNo && deliveryMap[soNo]) {
    row['Delivery Date'] = deliveryMap[soNo].deliveryDate;
    row['Delivery QTY'] = deliveryMap[soNo].quantity;
    row['Surat Jalan'] = deliveryMap[soNo].suratJalan;
    matchCount++;
  } else {
    row['Delivery Date'] = row['Delivery Date'] || '';
    row['Delivery QTY'] = row['Delivery QTY'] || '';
    row['Surat Jalan'] = row['Surat Jalan'] || '';
  }
  
  return row;
});

console.log(`Matched ${matchCount}/${soData.length} SO records`);

// Write back
console.log('Writing output...');
const outWb = XLSX.utils.book_new();
const outWs = XLSX.utils.json_to_sheet(updatedData);
XLSX.utils.book_append_sheet(outWb, outWs, 'Sheet1');
XLSX.writeFile(outWb, soPath);

console.log('✓ Done!');
console.log(`Injected delivery data: ${matchCount} matched, ${soData.length - matchCount} no match (abaikan)`);
