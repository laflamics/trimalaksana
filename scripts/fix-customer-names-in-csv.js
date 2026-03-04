const fs = require('fs');
const path = require('path');

// Mapping customer names to correct format with PL codes
const customerMapping = {
  'YAMATO': { padCode: 'PL0071', name: 'PT. YAMATO GOMU INDONESIA' },
  'GOMU INDONESIA': { padCode: 'PL0071', name: 'PT. YAMATO GOMU INDONESIA' },
  'MTU': { padCode: 'PL0002', name: 'PT. MAJU TEKNIK UTAMA INDONESIA' },
  'MAJU TEKNIK UTAMA': { padCode: 'PL0002', name: 'PT. MAJU TEKNIK UTAMA INDONESIA' },
  'ESSILOR': { padCode: 'PL0091', name: 'PT. Essilorluxottica Professional Solutions Indonesia' },
  'PRADANI SUMBER REJEKI': { padCode: 'PL0005', name: 'PT. PRADANI SUMBER REJEKI' },
  'EHWA': { padCode: 'PL0085', name: 'PT. EHWA INDONESIA' },
  'DHI': { padCode: 'PL0053', name: 'PT. DAE HWA INDONESIA' },
  'GBU': { padCode: 'PL0087', name: 'PT. GUNA BAKTI UNGGUL' },
  'GUNA BHAKTI UNGGUL': { padCode: 'PL0087', name: 'PT. GUNA BAKTI UNGGUL' },
  'FUKOKU': { padCode: 'PL0004', name: 'PT. FUKOKU TOKAI RUBBER INDONESIA' },
  'KAWASAKI': { padCode: 'PL0023', name: 'PT. KAWASAKI MOTOR INDONESIA' },
  'INDOSAFETY': { padCode: 'PL0205', name: 'PT. INDOSAFETY SENTOSA INDUSTRY' },
  'SAMSUNG': { padCode: 'PL0119', name: 'PT. SAMSUNG PRINT & PACK INDONESIA' },
  'STARTEC': { padCode: 'PL0101', name: 'PT. STAR TEC PACIFIC' },
  'CAC PUTRA PERKASA': { padCode: 'PL0069', name: 'PT. CAC PUTRA PERKASA' },
  'ASAHI INDONESIA': { padCode: 'PL0076', name: 'PT. ASAHI INDONESIA' },
  'FLORA JAYA ABADI': { padCode: 'TR48', name: 'CV. FLORA JAYA ABADI' },
  'MULTI INSAN GEMILANG': { padCode: 'PL0181', name: 'PT. MULTI INSAN GEMILANG' },
  'PANASONIC': { padCode: 'PL0049', name: 'PT. PANASONIC MANUFACTURING INDONESIA' },
  'PROGRESSA': { padCode: 'PL0206', name: 'PT. PROGRESSA JAYA SINERGI' },
  'SANOH': { padCode: 'TR7', name: 'PT. SANOH INDONESIA' },
  'SANOH INDONESIA': { padCode: 'TR7', name: 'PT. SANOH INDONESIA' },
  'SIGMA': { padCode: 'PL0168', name: 'PT. SIGMA PACK GEMILANG' },
  'TECHNO': { padCode: 'PL0136', name: 'PT. TECHNO INDONESIA' },
  'WANG SARI': { padCode: 'PL0134', name: 'PT WANG SARIMULTI UTAMA' },
  'YASUNAGA': { padCode: 'PL0039', name: 'PT. YASUNAGA INDONESIA' },
  'EVERPRO': { padCode: 'PL0113', name: 'PT. EVERPRO INDONESIA TECHNOLOGIES' }
};

// Read the CSV file
const csvPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/Delivery_enriched.csv';
const outputPath = path.join(__dirname, '../data/raw/Delivery_enriched_fixed.csv');

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
  if (columns.length < 2) {
    return line;
  }
  
  const padCode = columns[0];
  const customerName = columns[1];
  
  // Check if customer name needs fixing
  for (const [key, value] of Object.entries(customerMapping)) {
    if (customerName.toUpperCase().includes(key.toUpperCase()) || 
        customerName.toUpperCase() === key.toUpperCase()) {
      
      // Update Pad Code if empty
      if (!padCode || padCode.trim() === '') {
        columns[0] = value.padCode;
      }
      
      // Update Customer Name
      columns[1] = value.name;
      fixedCount++;
      
      console.log(`Line ${index + 1}: "${customerName}" -> "${value.name}" (${value.padCode})`);
      break;
    }
  }
  
  return columns.join(',');
});

// Write the fixed CSV
fs.writeFileSync(outputPath, fixedLines.join('\n'), 'utf-8');

console.log(`\n✅ Fixed ${fixedCount} customer names`);
console.log(`📄 Output saved to: ${outputPath}`);
console.log('\nSummary of changes:');
Object.entries(customerMapping).forEach(([key, value]) => {
  console.log(`  ${key} -> ${value.name} (${value.padCode})`);
});
