const XLSX = require('xlsx');
const fs = require('fs');

// Paths
const deliverySchedulePath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/DELIVERY_SCHEDULE_FORMATTED.csv';
const soFilePath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.csv';
const soFilePathXlsx = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.xlsx';

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

// Read delivery schedule using XLSX
console.log('Reading delivery schedule...');
const deliveryWb = XLSX.readFile(deliverySchedulePath);
const deliveryWs = deliveryWb.Sheets[deliveryWb.SheetNames[0]];
const deliveryData = XLSX.utils.sheet_to_json(deliveryWs);

console.log(`Found ${deliveryData.length} delivery records`);

// Create map: normalized SO -> array of deliveries
const deliveryMap = {};
deliveryData.forEach(row => {
  const soNo = normalizeSO(row['So No']);
  if (soNo) {
    if (!deliveryMap[soNo]) {
      deliveryMap[soNo] = [];
    }
    deliveryMap[soNo].push({
      deliveryNo: row['Surat Jalan'] || '',
      deliveryDate: row['Delivery Date'] || '',
      quantity: row['Delivery QTY'] || ''
    });
  }
});

console.log(`Created delivery map with ${Object.keys(deliveryMap).length} unique SO numbers`);
console.log('Sample keys:', Object.keys(deliveryMap).slice(0, 5));

// Read SO file using XLSX
console.log('Reading SO file...');
const soWb = XLSX.readFile(soFilePathXlsx);
const soWs = soWb.Sheets[soWb.SheetNames[0]];
const soData = XLSX.utils.sheet_to_json(soWs);

console.log(`Found ${soData.length} SO records`);

// Match and inject delivery data
let matchCount = 0;
const updatedData = soData.map(row => {
  const soNo = normalizeSO(row['So No']);
  
  if (soNo && deliveryMap[soNo] && deliveryMap[soNo].length > 0) {
    const delivery = deliveryMap[soNo][0];
    row['Nomor Delivery'] = delivery.deliveryNo;
    row['Tanggal Delivery'] = delivery.deliveryDate;
    row['Qty Delivery'] = delivery.quantity;
    matchCount++;
  } else {
    row['Nomor Delivery'] = row['Nomor Delivery'] || '';
    row['Tanggal Delivery'] = row['Tanggal Delivery'] || '';
    row['Qty Delivery'] = row['Qty Delivery'] || '';
  }
  
  return row;
});

console.log(`Matched ${matchCount} SO records with delivery data`);

// Write back to XLSX
console.log('Writing updated data...');
const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.json_to_sheet(updatedData);
XLSX.utils.book_append_sheet(newWb, newWs, 'Sheet1');
XLSX.writeFile(newWb, soFilePathXlsx);

console.log('✓ Done! Delivery data injected into SO file');
console.log(`Matched: ${matchCount}/${soData.length} records`);
