const fs = require('fs');
const path = require('path');

// Read the CSV file
const inputFile = path.join(__dirname, '../data/raw/Delivery.csv');
const backupFile = path.join(__dirname, '../data/raw/Delivery_backup.csv');
const outputFile = path.join(__dirname, '../data/raw/Delivery.csv');

console.log('Reading CSV file...');
const content = fs.readFileSync(inputFile, 'utf-8');

// Create backup
fs.writeFileSync(backupFile, content, 'utf-8');
console.log(`✓ Backup created: ${backupFile}`);

const lines = content.split('\n');

// Process the CSV - Replace day columns with dd/mm/yyyy format
const result = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) {
    result.push(line);
    continue;
  }
  
  const columns = line.split(',');
  
  // For header row (row 2), replace day numbers with formatted dates
  if (i === 1) {
    for (let day = 1; day <= 31; day++) {
      const colIndex = 8 + day;
      if (colIndex < columns.length) {
        columns[colIndex] = `${String(day).padStart(2, '0')}/01/2026`;
      }
    }
  }
  
  result.push(columns.join(','));
}

// Write the output
fs.writeFileSync(outputFile, result.join('\n'), 'utf-8');
console.log(`✓ File updated with dd/mm/yyyy format: ${outputFile}`);
console.log(`✓ Total rows processed: ${result.length}`);
