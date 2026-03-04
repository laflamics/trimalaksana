const fs = require('fs');
const XLSX = require('xlsx');

// Paths
const excelPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.xlsx';
const csvPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/DELIVERY_SCHEDULE_FORMATTED.csv';
const outputPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026_with_delivery.xlsx';

// Parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const record = {};
    let current = '';
    let inQuotes = false;
    let colIndex = 0;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        record[headers[colIndex]] = current.trim().replace(/^"|"$/g, '');
        current = '';
        colIndex++;
      } else {
        current += char;
      }
    }
    record[headers[colIndex]] = current.trim().replace(/^"|"$/g, '');
    records.push(record);
  }
  
  return records;
}

// Read Excel
console.log('Reading Excel file...');
const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const excelData = XLSX.utils.sheet_to_json(worksheet);
console.log(`Loaded ${excelData.length} records from Excel`);
console.log('Excel Headers:', Object.keys(excelData[0]));

// Read CSV
console.log('Reading CSV file...');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const csvData = parseCSV(csvContent);
console.log(`Loaded ${csvData.length} records from CSV`);
console.log('CSV Headers:', Object.keys(csvData[0]));
console.log('Sample CSV record:', csvData[0]);

// Create lookup map from CSV by So No - KEEP ALL DELIVERIES
const deliveryMap = {};
csvData.forEach(row => {
  const soNum = row['So No'] || '';
  if (soNum) {
    if (!deliveryMap[soNum]) {
      deliveryMap[soNum] = [];
    }
    deliveryMap[soNum].push({
      suratJalan: row['Surat Jalan'] || '',
      deliveryQty: row['Delivery QTY'] || '',
      deliveryDate: row['Delivery Date'] || ''
    });
  }
});

console.log(`Created delivery map with ${Object.keys(deliveryMap).length} So No entries`);

// Merge data - create separate rows for each delivery
const mergedData = [];
excelData.forEach(excelRecord => {
  const soNum = excelRecord['So No'] || '';
  const deliveries = deliveryMap[soNum] || [];
  
  if (deliveries.length === 0) {
    // No delivery, keep record as is with empty delivery columns
    mergedData.push({
      ...excelRecord,
      'Surat Jalan': '',
      'Delivery QTY': '',
      'Delivery Date': ''
    });
  } else {
    // Create separate row for each delivery
    deliveries.forEach(delivery => {
      mergedData.push({
        ...excelRecord,
        'Surat Jalan': delivery.suratJalan || '',
        'Delivery QTY': delivery.deliveryQty || '',
        'Delivery Date': delivery.deliveryDate || ''
      });
    });
  }
});

console.log(`Total merged rows: ${mergedData.length}`);

// Create new workbook with merged data
console.log('Creating new Excel file...');
const newWorksheet = XLSX.utils.json_to_sheet(mergedData);
const newWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');

// Write to file
XLSX.writeFile(newWorkbook, outputPath);
console.log(`✓ Created ${outputPath}`);
console.log(`✓ Original records: ${excelData.length}`);
console.log(`✓ Total rows after split: ${mergedData.length}`);

// Show sample
console.log('\nSample merged records:');
mergedData.slice(0, 5).forEach((r, i) => {
  console.log(`Row ${i+1}:`, {
    'So No': r['So No'],
    'Surat Jalan': r['Surat Jalan'],
    'Delivery QTY': r['Delivery QTY'],
    'Delivery Date': r['Delivery Date']
  });
});
