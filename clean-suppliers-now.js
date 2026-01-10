const fs = require('fs');

// Read suppliers.json
const data = JSON.parse(fs.readFileSync('data/localStorage/suppliers.json', 'utf8'));

console.log('Original count:', data.value.length);

// Find duplicates
const seen = new Map();
const unique = [];
const duplicates = [];

data.value.forEach((supplier, index) => {
  const kode = supplier.kode;
  if (seen.has(kode)) {
    duplicates.push({ index, kode, nama: supplier.nama });
  } else {
    seen.set(kode, true);
    unique.push({ ...supplier, no: unique.length + 1 });
  }
});

console.log('Unique count:', unique.length);
console.log('Duplicates found:', duplicates.length);

if (duplicates.length > 0) {
  console.log('Duplicate entries:');
  duplicates.forEach(dup => {
    console.log(`  ${dup.kode} - ${dup.nama}`);
  });
  
  // Save cleaned data
  const cleaned = { ...data, value: unique };
  fs.writeFileSync('data/localStorage/suppliers.json', JSON.stringify(cleaned, null, 2));
  console.log('✅ Cleaned data saved!');
} else {
  console.log('No duplicates found in storage.');
}

console.log('\nFirst 5 suppliers:');
unique.slice(0, 5).forEach(s => {
  console.log(`${s.no}. ${s.kode} - ${s.nama}`);
});