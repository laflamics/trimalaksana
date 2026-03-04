const XLSX = require('xlsx');
const fs = require('fs');

// Paths
const odsPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.ods';
const deliveryPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/DELIVERY_SCHEDULE_FORMATTED.csv';
const outputPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.csv';

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

// Read ODS file
console.log('Reading ODS file...');
const odsWb = XLSX.readFile(odsPath);
const odsWs = odsWb.Sheets[odsWb.SheetNames[0]];
const odsData = XLSX.utils.sheet_to_json(odsWs);

console.log(`Found ${odsData.length} SO records in ODS`);

// Create map: normalized SO -> SO data
const soMap = {};
odsData.forEach(row => {
  const soNo = normalizeSO(row['No Transaksi']);
  if (soNo && !soMap[soNo]) {
    soMap[soNo] = row;
  }
});

console.log(`Created SO map with ${Object.keys(soMap).length} unique SO numbers`);

// Read delivery schedule
console.log('Reading delivery schedule...');
const delWb = XLSX.readFile(deliveryPath);
const delWs = delWb.Sheets[delWb.SheetNames[0]];
const delData = XLSX.utils.sheet_to_json(delWs);

console.log(`Found ${delData.length} delivery records`);

// Create output: for each delivery, find matching SO and add delivery info
let outputData = [];
let matchCount = 0;
let noMatchCount = 0;

delData.forEach((delivery, idx) => {
  const soNo = normalizeSO(delivery['So No']);
  
  if (soNo && soMap[soNo]) {
    // Copy SO data
    const row = { ...soMap[soNo] };
    // Add delivery info
    row['Surat Jalan'] = delivery['Surat Jalan'] || '';
    row['Delivery Date'] = delivery['Delivery Date'] || '';
    row['Delivery QTY'] = delivery['Delivery QTY'] || '';
    outputData.push(row);
    matchCount++;
  } else {
    noMatchCount++;
    if (noMatchCount <= 5) {
      console.log(`No match for delivery SO: ${delivery['So No']}`);
    }
  }
});

console.log(`\nMatched: ${matchCount}/${delData.length}`);
console.log(`No match: ${noMatchCount}/${delData.length}`);

// Write to CSV
console.log('Writing output file...');
const outWb = XLSX.utils.book_new();
const outWs = XLSX.utils.json_to_sheet(outputData);
XLSX.utils.book_append_sheet(outWb, outWs, 'Sheet1');
XLSX.writeFile(outWb, outputPath);

console.log(`✓ Done! Output: ${outputData.length} rows`);
