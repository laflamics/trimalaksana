const XLSX = require('xlsx');
const fs = require('fs');

// Paths
const deliverySchedulePath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/DELIVERY_SCHEDULE_FORMATTED.csv';
const soFilePath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.csv';

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
const deliveryWb = XLSX.readFile(deliverySchedulePath);
const deliveryWs = deliveryWb.Sheets[deliveryWb.SheetNames[0]];
const deliveryData = XLSX.utils.sheet_to_json(deliveryWs);

console.log(`Found ${deliveryData.length} delivery records`);

// Read SO file to get template data
console.log('Reading SO file...');
const soContent = fs.readFileSync(soFilePath, 'utf-8');
const soWb = XLSX.read(soContent, { type: 'string' });
const soWs = soWb.Sheets[soWb.SheetNames[0]];
const soData = XLSX.utils.sheet_to_json(soWs);

console.log(`Found ${soData.length} SO records`);

// Create map: normalized SO -> SO data
const soMap = {};
soData.forEach(row => {
  const soNo = normalizeSO(row['No Transaksi'] || row['So No']);
  if (soNo && !soMap[soNo]) {
    soMap[soNo] = row;
  }
});

console.log(`Created SO map with ${Object.keys(soMap).length} unique SO numbers`);

// Create output data from delivery schedule
let outputData = [];
let matchCount = 0;

deliveryData.forEach(delivery => {
  const soNo = normalizeSO(delivery['So No']);
  
  if (soNo && soMap[soNo]) {
    // Copy SO data and add delivery info
    const row = { ...soMap[soNo] };
    row['Surat Jalan'] = delivery['Surat Jalan'] || '';
    row['Delivery Date'] = delivery['Delivery Date'] || '';
    row['Delivery QTY'] = delivery['Delivery QTY'] || '';
    outputData.push(row);
    matchCount++;
  }
});

console.log(`Created ${outputData.length} output rows (${matchCount} matched with SO data)`);

// Write to CSV
console.log('Writing output file...');
const outWb = XLSX.utils.book_new();
const outWs = XLSX.utils.json_to_sheet(outputData);
XLSX.utils.book_append_sheet(outWb, outWs, 'Sheet1');
XLSX.writeFile(outWb, soFilePath);

console.log('✓ Done!');
console.log(`Output: ${outputData.length} rows (from ${deliveryData.length} deliveries)`);
