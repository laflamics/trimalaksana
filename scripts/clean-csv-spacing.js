#!/usr/bin/env node

/**
 * Clean CSV spacing - normalize multiple spaces to single space, remove empty fields
 * Special handling for PO/DO formatting in packaging CSV
 * Usage: node scripts/clean-csv-spacing.js <input_csv> [output_csv] [--format-po-do]
 * Example: node scripts/clean-csv-spacing.js scripts/master/packaging/pkgfeb.csv --format-po-do
 */

const fs = require('fs');
const readline = require('readline');

const inputFile = process.argv[2];
const formatPoDo = process.argv.includes('--format-po-do');
const outputFile = process.argv[3] && !process.argv[3].startsWith('--') 
  ? process.argv[3] 
  : inputFile.replace('.csv', '_cleaned.csv');

if (!inputFile) {
  console.error('❌ Error: Input CSV file is required');
  console.error('Usage: node scripts/clean-csv-spacing.js <input_csv> [output_csv]');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: File not found: ${inputFile}`);
  process.exit(1);
}

console.log(`📖 Reading: ${inputFile}`);
console.log(`💾 Writing to: ${outputFile}`);

const cleanField = (field, isKetColumn = false) => {
  if (!field) return '';
  
  let cleaned = field.trim();
  
  // Special handling for Ket column (PO/DO formatting)
  if (isKetColumn && formatPoDo) {
    // Normalize multiple spaces to single space
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Format PO references: "PO : PA26010369" -> "PO: PA26010369"
    cleaned = cleaned.replace(/PO\s*:\s*/g, 'PO: ');
    
    // Format DO references: "DO : DLV-xxx" -> "DO: DLV-xxx"
    cleaned = cleaned.replace(/DO\s*:\s*/g, 'DO: ');
    
    // Clean up multiple spaces again after formatting
    cleaned = cleaned.replace(/\s+/g, ' ');
  } else {
    // Standard space normalization
    cleaned = cleaned.replace(/\s+/g, ' ');
  }
  
  return cleaned;
};

const processLine = (line, headers = null, lineNum = 0) => {
  // Split by comma, but be careful with quoted fields
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  
  // Clean each field
  const cleanedFields = fields.map((field, idx) => {
    // Check if this is the Ket column
    const isKetColumn = headers && headers[idx] === 'Ket';
    
    // Remove quotes if present
    let cleaned = field.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    // Normalize spaces (with special handling for Ket column)
    cleaned = cleanField(cleaned, isKetColumn);
    // Re-quote if contains comma or quotes
    if (cleaned.includes(',') || cleaned.includes('"')) {
      cleaned = `"${cleaned.replace(/"/g, '""')}"`;
    }
    return cleaned;
  });
  
  // Remove trailing empty fields
  while (cleanedFields.length > 0 && cleanedFields[cleanedFields.length - 1] === '') {
    cleanedFields.pop();
  }
  
  return cleanedFields.join(',');
};

const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

const writeStream = fs.createWriteStream(outputFile);
let lineCount = 0;
let cleanedCount = 0;
let headers = null;

rl.on('line', (line) => {
  lineCount++;
  
  // Parse headers on first line
  if (lineCount === 1) {
    headers = line.split(',').map(h => h.trim());
  }
  
  const cleanedLine = processLine(line, headers, lineCount);
  
  // Check if line was modified
  if (cleanedLine !== line) {
    cleanedCount++;
  }
  
  writeStream.write(cleanedLine + '\n');
});

rl.on('close', () => {
  writeStream.end();
  console.log(`\n✅ Done!`);
  console.log(`📊 Total lines: ${lineCount}`);
  console.log(`🔧 Lines cleaned: ${cleanedCount}`);
  if (formatPoDo) {
    console.log(`📋 PO/DO formatting: ENABLED`);
  }
  console.log(`📁 Output: ${outputFile}`);
});

writeStream.on('error', (err) => {
  console.error('❌ Write error:', err.message);
  process.exit(1);
});

rl.on('error', (err) => {
  console.error('❌ Read error:', err.message);
  process.exit(1);
});
