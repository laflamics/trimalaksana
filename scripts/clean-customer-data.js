const fs = require('fs');
const path = require('path');

// Read customers data
const customersPath = path.join(__dirname, '../data/localStorage/customers.json');
const customersData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));

let customers = customersData.value || customersData;
if (!Array.isArray(customers)) {
  customers = [];
}

console.log(`[Clean Customer Data] Starting with ${customers.length} customers`);

// Step 1: Replace CTM codes with PL codes
let plCounter = 1;
const codeMap = {}; // Map old CTM codes to new PL codes

customers = customers.map((customer, idx) => {
  const oldKode = customer.kode || '';
  
  // If it's a CTM code, replace with PL code
  if (oldKode.startsWith('CTM-')) {
    const newKode = `PL${String(plCounter).padStart(4, '0')}`;
    codeMap[oldKode] = newKode;
    plCounter++;
    
    console.log(`  Converted: ${oldKode} → ${newKode}`);
    
    return {
      ...customer,
      kode: newKode,
      padCode: customer.padCode || newKode, // Use PL code as padCode if empty
    };
  }
  
  // If it's already a PL code, ensure padCode is set
  if (oldKode.startsWith('PL')) {
    return {
      ...customer,
      padCode: customer.padCode || oldKode, // Use PL code as padCode if empty
    };
  }
  
  // For other codes, set padCode to the code itself if empty
  return {
    ...customer,
    padCode: customer.padCode || oldKode || '',
  };
});

console.log(`[Clean Customer Data] After code conversion: ${customers.length} customers`);

// Step 2: Remove duplicates based on nama (customer name)
const seen = new Map();
const duplicates = [];
const cleaned = [];

customers.forEach((customer) => {
  const nama = (customer.nama || '').trim().toUpperCase();
  
  if (seen.has(nama)) {
    duplicates.push({
      original: seen.get(nama),
      duplicate: customer,
    });
    console.log(`  Duplicate found: "${customer.nama}" (keeping first occurrence)`);
  } else {
    seen.set(nama, customer);
    cleaned.push(customer);
  }
});

console.log(`[Clean Customer Data] Removed ${duplicates.length} duplicates`);
console.log(`[Clean Customer Data] Final count: ${cleaned.length} customers`);

// Step 3: Re-number the 'no' field
const renumbered = cleaned.map((customer, idx) => ({
  ...customer,
  no: idx + 1,
}));

// Step 4: Save cleaned data
const output = {
  value: renumbered,
};

fs.writeFileSync(customersPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`[Clean Customer Data] ✅ Saved cleaned customers to ${customersPath}`);

// Print summary
console.log('\n=== SUMMARY ===');
console.log(`Total customers: ${renumbered.length}`);
console.log(`Duplicates removed: ${duplicates.length}`);
console.log(`CTM codes converted to PL: ${Object.keys(codeMap).length}`);

// Print code mapping
if (Object.keys(codeMap).length > 0) {
  console.log('\n=== CODE MAPPING ===');
  Object.entries(codeMap).forEach(([old, newCode]) => {
    console.log(`  ${old} → ${newCode}`);
  });
}

// Print duplicates removed
if (duplicates.length > 0) {
  console.log('\n=== DUPLICATES REMOVED ===');
  duplicates.forEach(({ original, duplicate }) => {
    console.log(`  Kept: ${original.kode} - ${original.nama}`);
    console.log(`  Removed: ${duplicate.kode} - ${duplicate.nama}`);
  });
}

console.log('\n✅ Customer data cleaning complete!');
