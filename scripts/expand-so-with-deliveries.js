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

// Create map: normalized SO -> array of deliveries
const deliveryMap = {};
deliveryData.forEach(row => {
  const soNo = normalizeSO(row['So No']);
  if (soNo) {
    if (!deliveryMap[soNo]) {
      deliveryMap[soNo] = [];
    }
    deliveryMap[soNo].push({
      suratJalan: row['Surat Jalan'] || '',
      deliveryDate: row['Delivery Date'] || '',
      quantity: row['Delivery QTY'] || ''
    });
  }
});

console.log(`Created delivery map with ${Object.keys(deliveryMap).length} unique SO numbers`);

// Read SO file (CSV)
console.log('Reading SO file...');
const soContent = fs.readFileSync(soFilePath, 'utf-8');
const soLines = soContent.split('\n');
const headerLine = soLines[0];
const headers = XLSX.utils.sheet_to_json(XLSX.read(soContent, { type: 'string' }))[0] ? 
  Object.keys(XLSX.utils.sheet_to_json(XLSX.read(soContent, { type: 'string' }))[0]) :
  headerLine.split(',').map(h => h.trim());

// Parse SO data properly
const soWb = XLSX.read(soContent, { type: 'string' });
const soWs = soWb.Sheets[soWb.SheetNames[0]];
const soData = XLSX.utils.sheet_to_json(soWs);

console.log(`Found ${soData.length} SO records`);
console.log('Headers:', headers);

// Expand SO data with deliveries
let expandedData = [];
let matchCount = 0;

soData.forEach(soRow => {
  const soNo = normalizeSO(soRow['No Transaksi'] || soRow['So No']);
  
  if (soNo && deliveryMap[soNo] && deliveryMap[soNo].length > 0) {
    // Create a row for each delivery
    deliveryMap[soNo].forEach(delivery => {
      const newRow = { ...soRow };
      newRow['Surat Jalan'] = delivery.suratJalan;
      newRow['Delivery Date'] = delivery.deliveryDate;
      newRow['Delivery QTY'] = delivery.quantity;
      expandedData.push(newRow);
      matchCount++;
    });
  } else {
    // Keep original row even if no delivery
    expandedData.push(soRow);
  }
});

console.log(`Expanded to ${expandedData.length} rows (${matchCount} with delivery data)`);

// Write back to CSV
console.log('Writing updated data...');
const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.json_to_sheet(expandedData);
XLSX.utils.book_append_sheet(newWb, newWs, 'Sheet1');
XLSX.writeFile(newWb, soFilePath);

console.log('✓ Done! Expanded SO file with delivery rows');
console.log(`Original: ${soData.length} rows → Expanded: ${expandedData.length} rows`);
