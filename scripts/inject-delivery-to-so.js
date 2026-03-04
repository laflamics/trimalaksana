const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Paths
const deliverySchedulePath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/DELIVERY_SCHEDULE_FORMATTED.csv';
const soFilePath = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.csv';
const soFilePathXlsx = '/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.xlsx';

// Helper: normalize SO number (convert roman numerals to numbers, remove spaces)
function normalizeSO(soNumber) {
  if (!soNumber) return '';
  let normalized = String(soNumber).trim();
  
  // Convert roman numerals to numbers
  const romanMap = {
    'XII': '12', 'XI': '11', 'X': '10', 'IX': '9', 'VIII': '8', 'VII': '7', 'VI': '6',
    'IV': '4', 'III': '3', 'II': '2', 'I': '1', 'V': '5'
  };
  
  // Replace roman numerals (check longer ones first)
  Object.keys(romanMap).sort((a, b) => b.length - a.length).forEach(roman => {
    normalized = normalized.replace(new RegExp('\\b' + roman + '\\b', 'gi'), romanMap[roman]);
  });
  
  return normalized.replace(/\s+/g, '').toLowerCase();
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Read delivery schedule
console.log('Reading delivery schedule...');
const deliveryContent = fs.readFileSync(deliverySchedulePath, 'utf-8');
const deliveryLines = deliveryContent.split('\n').filter(line => line.trim());
const deliveryHeaders = parseCSVLine(deliveryLines[0]);
const deliveryData = deliveryLines.slice(1).map(line => {
  const values = parseCSVLine(line);
  const obj = {};
  deliveryHeaders.forEach((header, idx) => {
    obj[header] = values[idx] || '';
  });
  return obj;
});

console.log(`Found ${deliveryData.length} delivery records`);

// Create map: normalized SO -> array of deliveries
const deliveryMap = {};
deliveryData.forEach(row => {
  const soNo = normalizeSO(row['SO No'] || row['SO Number'] || row['SO'] || row['No SO']);
  if (soNo) {
    if (!deliveryMap[soNo]) {
      deliveryMap[soNo] = [];
    }
    deliveryMap[soNo].push({
      deliveryNo: row['Delivery No'] || row['No Delivery'] || row['Nomor Delivery'] || '',
      deliveryDate: row['Delivery Date'] || row['Tanggal Delivery'] || '',
      quantity: row['Quantity'] || row['Qty'] || row['Qty Delivery'] || ''
    });
  }
});

console.log(`Created delivery map with ${Object.keys(deliveryMap).length} unique SO numbers`);

// Read SO file (CSV)
console.log('Reading SO file...');
const soContent = fs.readFileSync(soFilePath, 'utf-8');
const soLines = soContent.split('\n').filter(line => line.trim());
const soHeaders = parseCSVLine(soLines[0]);
const soData = soLines.slice(1).map(line => {
  const values = parseCSVLine(line);
  const obj = {};
  soHeaders.forEach((header, idx) => {
    obj[header] = values[idx] || '';
  });
  return obj;
});

console.log(`Found ${soData.length} SO records`);

// Match and inject delivery data
let matchCount = 0;
const updatedData = soData.map(row => {
  const soNo = normalizeSO(row['SO No'] || row['SO Number'] || row['No SO'] || row['SO']);
  
  if (soNo && deliveryMap[soNo] && deliveryMap[soNo].length > 0) {
    const delivery = deliveryMap[soNo][0]; // Take first matching delivery
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

// Write back to CSV
console.log('Writing updated data...');
const csvContent = [soHeaders.join(','), ...updatedData.map(row => {
  return soHeaders.map(header => {
    const val = row[header] || '';
    // Escape quotes and wrap in quotes if contains comma
    if (String(val).includes(',') || String(val).includes('"')) {
      return '"' + String(val).replace(/"/g, '""') + '"';
    }
    return val;
  }).join(',');
})].join('\n');

fs.writeFileSync(soFilePath, csvContent);

// Also convert back to XLSX
console.log('Converting back to XLSX...');
const newWorkbook = XLSX.utils.book_new();
const newSheet = XLSX.utils.json_to_sheet(updatedData);
XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
XLSX.writeFile(newWorkbook, soFilePathXlsx);

console.log('✓ Done! Delivery data injected into SO file');
console.log(`Matched: ${matchCount}/${soData.length} records`);
