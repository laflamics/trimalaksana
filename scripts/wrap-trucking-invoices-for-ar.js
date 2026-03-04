/**
 * Wrap Trucking Invoices JSON dengan { value: [...] } format
 * Supaya extractStorageValue() di AR bisa extract dengan benar
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'master/trucking/trucking_invoices.json');
const outputFile = path.join(__dirname, 'master/trucking/trucking_invoices.json');

console.log('Reading trucking invoices...');
const rawData = fs.readFileSync(inputFile, 'utf8');
const invoices = JSON.parse(rawData);

console.log(`Found ${invoices.length} invoices`);

// Wrap dengan { value: [...] } format
const wrappedData = {
  value: invoices
};

console.log('Wrapping data...');
fs.writeFileSync(outputFile, JSON.stringify(wrappedData, null, 2), 'utf8');

console.log('✅ Wrapping complete!');
console.log(`Output: ${outputFile}`);
console.log(`Format: { value: [${invoices.length} invoices] }`);
