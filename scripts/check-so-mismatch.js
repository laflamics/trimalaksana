const XLSX = require('xlsx');

function normalizeSO(soNumber) {
  if (!soNumber) return '';
  let normalized = String(soNumber).trim();
  const romanMap = {
    'XII': '12', 'XI': '11', 'X': '10', 'IX': '9', 'VIII': '8', 'VII': '7', 'VI': '6',
    'IV': '4', 'III': '3', 'II': '2', 'I': '1', 'V': '5'
  };
  Object.keys(romanMap).sort((a, b) => b.length - a.length).forEach(roman => {
    normalized = normalized.replace(new RegExp('\\b' + roman + '\\b', 'gi'), romanMap[roman]);
  });
  return normalized.replace(/\s+/g, '').toLowerCase();
}

const odsWb = XLSX.readFile('/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/SObaruJan2026.ods');
const odsWs = odsWb.Sheets[odsWb.SheetNames[0]];
const odsData = XLSX.utils.sheet_to_json(odsWs);

const soMap = {};
odsData.forEach(row => {
  const soNo = normalizeSO(row['No Transaksi']);
  if (soNo) soMap[soNo] = true;
});

const delWb = XLSX.readFile('/home/zelwar/Data2/backup/trimalaksanasaving1/data/raw/DELIVERY_SCHEDULE_FORMATTED.csv');
const delWs = delWb.Sheets[delWb.SheetNames[0]];
const delData = XLSX.utils.sheet_to_json(delWs);

const notInOds = {};
delData.forEach(del => {
  const soNo = normalizeSO(del['So No']);
  if (!soMap[soNo]) {
    notInOds[del['So No']] = (notInOds[del['So No']] || 0) + 1;
  }
});

console.log('SO in delivery but NOT in ODS:');
Object.entries(notInOds).slice(0, 10).forEach(([so, count]) => {
  console.log(`  ${so}: ${count} times`);
});
console.log(`Total unique SO not in ODS: ${Object.keys(notInOds).length}`);

console.log('\nSO in ODS:');
Object.keys(soMap).slice(0, 10).forEach(so => {
  console.log(`  ${so}`);
});
