const XLSX = require('xlsx');

const wb = XLSX.readFile('/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Sample matched records:');
data.filter(r => r['Nomor Delivery']).slice(0, 3).forEach(r => {
  console.log('SO:', r['So No'], '| Delivery No:', r['Nomor Delivery'], '| Date:', r['Tanggal Delivery'], '| Qty:', r['Qty Delivery']);
});

console.log('\nSample unmatched records:');
data.filter(r => !r['Nomor Delivery']).slice(0, 3).forEach(r => {
  console.log('SO:', r['So No']);
});

const matched = data.filter(r => r['Nomor Delivery']).length;
const total = data.length;
console.log(`\nTotal: ${matched}/${total} matched`);
