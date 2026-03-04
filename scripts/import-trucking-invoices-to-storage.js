/**
 * Import Trucking Invoices dari JSON file ke storage
 * Jalankan di server/backend untuk populate storage
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'master/trucking/trucking_invoices.json');

console.log('Reading trucking invoices from file...');
const rawData = fs.readFileSync(inputFile, 'utf8');
let invoices = JSON.parse(rawData);

// Handle wrapped format
if (invoices && typeof invoices === 'object' && 'value' in invoices) {
  invoices = invoices.value;
}

console.log(`Found ${invoices.length} invoices`);

// Output untuk di-import ke storage
const storageData = {
  key: 'trucking_invoices',
  value: invoices,
  count: invoices.length,
  timestamp: new Date().toISOString()
};

console.log('\n✅ Ready to import:');
console.log(JSON.stringify(storageData, null, 2));

console.log('\n📋 Sample invoice:');
console.log(JSON.stringify(invoices[0], null, 2));

// Export untuk digunakan di backend
module.exports = storageData;
