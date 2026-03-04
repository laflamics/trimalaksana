const XLSX = require('xlsx');

const wb = XLSX.readFile('/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026_1.csv');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Sample matched records:');
data.filter(r => r['Surat Jalan']).slice(0, 3).forEach(r => {
  console.log('SO:', r['So No'], '| Surat Jalan:', r['Surat Jalan'], '| Date:', r['Delivery Date'], '| Qty:', r['Delivery QTY']);
});

console.log('\nSample unmatched records:');
data.filter(r => !r['Surat Jalan']).slice(0, 3).forEach(r => {
  console.log('SO:', r['So No']);
});

const matched = data.filter(r => r['Surat Jalan']).length;
console.log(`\nTotal: ${matched}/${data.length} dengan delivery data`);
