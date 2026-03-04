const fs = require('fs');
const path = require('path');

// Mapping PL codes to customer names
const plCodeMapping = {
  'PL0013': 'PT. INDONESIA NIPPON SEIKI',
  'PL0091': 'PT. Essilorluxottica Professional Solutions Indonesia',
  'PL0098': 'PT. MIKASA MITRA MULIA',
  'PL0108': 'PT. PAPEROCKS INDONESIA TBK',
  'PL0071': 'PT. YAMATO GOMU INDONESIA', // Fix YAMATOGOMU
  'PL0182': 'MULTI MAYAKA',
  'PL0192': 'PT HEAMEN INDUSTRIAL INDONESIA',
  'PL0205': 'PT. INDOSAFETY SENTOSA INDUSTRY',
  'PL0206': 'PT. PROGRESSA JAYA SINERGI',
  'TR13': 'PT. KAWATA INDONESIA',
  'TR7': 'PT. SANOH INDONESIA' // Fix quote issue
};

// Read the CSV file
const csvPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/INVOICE_JAN_26_CLEAN.csv';
const outputPath = path.join(__dirname, '../data/raw/INVOICE_JAN_26_CLEAN_fixed.csv');

console.log('Reading CSV file...');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log(`Total lines: ${lines.length}`);

let fixedCount = 0;
const fixedLines = lines.map((line, index) => {
  if (index === 0) {
    // Header line
    return line;
  }
  
  const columns = line.split(',');
  if (columns.length < 3) {
    return line;
  }
  
  const padCode = columns[1];
  const customerName = columns[2];
  
  // Check if we need to fix this customer
  if (plCodeMapping[padCode]) {
    // If customer name is empty, needs fixing, or has quote issues
    if (!customerName || customerName.trim() === '' || 
        (padCode === 'PL0071' && customerName.includes('YAMATOGOMU')) ||
        (padCode === 'TR7' && customerName.includes('"'))) {
      
      columns[2] = plCodeMapping[padCode];
      fixedCount++;
      
      console.log(`Line ${index + 1}: ${padCode} "${customerName}" -> "${plCodeMapping[padCode]}"`);
    }
  }
  
  return columns.join(',');
});

// Write the fixed CSV
fs.writeFileSync(outputPath, fixedLines.join('\n'), 'utf-8');

console.log(`\n✅ Fixed ${fixedCount} customer names`);
console.log(`📄 Output saved to: ${outputPath}`);
console.log('\nSummary of changes:');
Object.entries(plCodeMapping).forEach(([code, name]) => {
  console.log(`  ${code} -> ${name}`);
});
