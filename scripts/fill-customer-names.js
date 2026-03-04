const fs = require('fs');
const path = require('path');

// Read SO file to build Pad Code -> Customer mapping
const soPath = 'data/raw/SObaruJan2026.csv';
const soData = fs.readFileSync(soPath, 'utf-8');
const soLines = soData.split('\n');

// Build mapping: Pad Code -> Customer
const padCodeToCustomer = {};
for (let i = 1; i < soLines.length; i++) {
  const line = soLines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  if (parts.length >= 2) {
    const padCode = parts[0].trim();
    const customer = parts[1].trim();
    
    // Store the mapping (use first occurrence)
    if (!padCodeToCustomer[padCode]) {
      padCodeToCustomer[padCode] = customer;
    }
  }
}

console.log(`Found ${Object.keys(padCodeToCustomer).length} unique Pad Codes in SO file`);

// Read invoice file
const invoicePath = 'data/raw/INVOICE_JAN_26_CLEAN.csv';
const invoiceData = fs.readFileSync(invoicePath, 'utf-8');
const invoiceLines = invoiceData.split('\n');

// Process invoice file
const result = [];
let matchCount = 0;
let noMatchCount = 0;

for (let i = 0; i < invoiceLines.length; i++) {
  const line = invoiceLines[i];
  
  if (i === 0) {
    // Header
    result.push(line);
    continue;
  }
  
  if (!line.trim()) continue;
  
  // Parse CSV line carefully (handle quoted fields)
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  if (parts.length < 9) {
    result.push(line);
    continue;
  }
  
  // Extract Pad Code (column 7, 0-indexed)
  const padCode = parts[7];
  
  // Look up customer name
  const customer = padCodeToCustomer[padCode];
  
  if (customer) {
    // Replace customer name (column 8)
    parts[8] = customer;
    matchCount++;
  } else {
    noMatchCount++;
  }
  
  // Reconstruct line
  const newLine = parts.join(',');
  result.push(newLine);
}

// Write output
const outputPath = 'data/raw/INVOICE_JAN_26_CLEAN.csv';
fs.writeFileSync(outputPath, result.join('\n'), 'utf-8');

console.log(`\nProcessing complete:`);
console.log(`- Matched: ${matchCount} rows`);
console.log(`- Not matched: ${noMatchCount} rows`);
console.log(`- Output: ${outputPath}`);
