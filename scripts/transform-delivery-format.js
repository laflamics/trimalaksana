const fs = require('fs');
const path = require('path');

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
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

// Escape CSV field
function escapeCSV(field) {
  if (!field) return '';
  field = String(field);
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Read the CSV file
const inputFile = path.join(__dirname, '../data/raw/Delivery.csv');
const outputFile = path.join(__dirname, '../data/raw/Delivery_transformed.csv');

console.log('Reading CSV file...');
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

// Parse header row 2 to get the day numbers and their column positions
const headerRow2 = parseCSVLine(lines[1]);
const dayColumnMap = {}; // Maps day number to column index

for (let i = 0; i < headerRow2.length; i++) {
  const value = headerRow2[i].trim();
  const dayNum = parseInt(value);
  if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
    dayColumnMap[dayNum] = i;
  }
}

console.log('Day columns found:', Object.keys(dayColumnMap).length);

// New format headers
const result = [];
result.push('Customer,So No,Item,QTY Delivery,Kode,Delivery date,Surat Jalan');

let currentCustomer = '';

// Process each data row (skip first 2 header rows)
for (let i = 2; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  const columns = parseCSVLine(line);
  
  // Extract main data
  const customer = columns[1] || currentCustomer;
  if (columns[1] && columns[1].trim()) {
    currentCustomer = columns[1].trim();
  }
  
  const soNo = columns[2] || '';
  const item = columns[4] || '';
  const kode = columns[6] || '';
  
  // Surat Jalan is at the last column
  const suratJalan = columns[columns.length - 1] || '';
  
  // Process delivery dates using the day column map
  for (let day = 1; day <= 31; day++) {
    const colIndex = dayColumnMap[day];
    if (colIndex !== undefined && colIndex < columns.length && columns[colIndex] && columns[colIndex].trim()) {
      const qty = columns[colIndex].trim();
      const deliveryDate = `${String(day).padStart(2, '0')}/01/2026`;
      
      // Create new row for each delivery date
      const row = [
        escapeCSV(customer),
        escapeCSV(soNo),
        escapeCSV(item),
        escapeCSV(qty),
        escapeCSV(kode),
        deliveryDate,
        escapeCSV(suratJalan)
      ].join(',');
      
      result.push(row);
    }
  }
}

// Write the output
fs.writeFileSync(outputFile, result.join('\n'), 'utf-8');
console.log(`✓ Transformed file saved to: ${outputFile}`);
console.log(`✓ Total delivery rows created: ${result.length - 1}`);
