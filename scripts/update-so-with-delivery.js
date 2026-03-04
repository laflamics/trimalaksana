const fs = require('fs');
const XLSX = require('xlsx');

// Paths
const soPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/raw2/SObaruJan2026_IMPORT_READY.csv';
const deliveryPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/raw2/DELIVERY_SCHEDULE_FORMATTED.xlsx';

// Parse CSV manually
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

// Read SO CSV
console.log('Reading SO CSV...');
const soContent = fs.readFileSync(soPath, 'utf-8');
const soRecords = parseCSV(soContent);
console.log(`Loaded ${soRecords.length} SO records`);

// Read Delivery Excel
console.log('Reading Delivery Excel...');
const workbook = XLSX.readFile(deliveryPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const deliveryData = XLSX.utils.sheet_to_json(worksheet);
console.log(`Loaded ${deliveryData.length} delivery records`);

// Create lookup map from delivery data by PO number - KEEP ALL DELIVERIES
const deliveryMap = {};
deliveryData.forEach(row => {
  const poNum = row['No PO'] || '';
  if (poNum) {
    if (!deliveryMap[poNum]) {
      deliveryMap[poNum] = [];
    }
    deliveryMap[poNum].push({
      deliveryNumber: row['Surat Jalan'] || '',
      deliveryQty: row['Delivery QTY'] || '',
      deliveryDate: row['Delivery Date'] || ''
    });
  }
});

console.log(`Created delivery map with ${Object.keys(deliveryMap).length} PO entries`);

// Merge data - create separate rows for each delivery
const mergedRecords = [];
soRecords.forEach(soRecord => {
  const soNum = soRecord['No So'] || '';
  const deliveries = deliveryMap[soNum] || [];
  
  if (deliveries.length === 0) {
    // No delivery, keep SO as is
    mergedRecords.push(soRecord);
  } else {
    // Create separate row for each delivery
    deliveries.forEach(delivery => {
      mergedRecords.push({
        'No So': soRecord['No So'] || '',
        'Customer': soRecord['Customer'] || '',
        'Kd. Item': soRecord['Kd. Item'] || '',
        'Nama Item': soRecord['Nama Item'] || '',
        'Jml': soRecord['Jml'] || '',
        'Harga': soRecord['Harga'] || '',
        'Date': soRecord['Date'] || '',
        'Delivery Number': delivery.deliveryNumber || '',
        'Delivery QTY': delivery.deliveryQty || '',
        'Delivery Date': delivery.deliveryDate || ''
      });
    });
  }
});

// Write CSV back to same file
console.log('Writing updated CSV...');
const headers = ['No So', 'Customer', 'Kd. Item', 'Nama Item', 'Jml', 'Harga', 'Date', 'Delivery Number', 'Delivery QTY', 'Delivery Date'];
const csvLines = [headers.join(',')];

mergedRecords.forEach(record => {
  const values = headers.map(h => {
    const val = record[h] || '';
    // Escape quotes and wrap in quotes if contains comma
    if (val.toString().includes(',') || val.toString().includes('"')) {
      return `"${val.toString().replace(/"/g, '""')}"`;
    }
    return val;
  });
  csvLines.push(values.join(','));
});

fs.writeFileSync(soPath, csvLines.join('\n'), 'utf-8');
console.log(`✓ Updated SObaruJan2026_IMPORT_READY.csv`);
console.log(`✓ Original SO records: ${soRecords.length}`);
console.log(`✓ Total rows after split (with separate delivery rows): ${mergedRecords.length}`);

// Show sample
console.log('\nSample updated records:');
mergedRecords.slice(0, 5).forEach((r, i) => {
  console.log(`Row ${i+1}:`, {
    'No So': r['No So'],
    'Delivery Number': r['Delivery Number'],
    'Delivery QTY': r['Delivery QTY'],
    'Delivery Date': r['Delivery Date']
  });
});
