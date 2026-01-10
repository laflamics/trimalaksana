/**
 * Force Clean Suppliers - Remove all duplicates
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Force cleaning suppliers...');

const suppliersPath = path.join(__dirname, 'data/localStorage/suppliers.json');

if (fs.existsSync(suppliersPath)) {
  const content = fs.readFileSync(suppliersPath, 'utf8');
  const data = JSON.parse(content);
  
  if (data && data.value && Array.isArray(data.value)) {
    const suppliers = data.value;
    console.log(`Original count: ${suppliers.length}`);
    
    // Remove duplicates by kode, keep first occurrence
    const seen = new Set();
    const unique = [];
    
    suppliers.forEach(supplier => {
      if (supplier && supplier.kode) {
        const key = supplier.kode.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(supplier);
        }
      }
    });
    
    // Renumber
    const final = unique.map((supplier, index) => ({
      ...supplier,
      no: index + 1
    }));
    
    console.log(`Cleaned count: ${final.length}`);
    console.log(`Removed: ${suppliers.length - final.length} duplicates`);
    
    // Save
    const cleanData = { ...data, value: final };
    fs.writeFileSync(suppliersPath, JSON.stringify(cleanData, null, 2));
    
    console.log('✅ Suppliers cleaned!');
    
    // Show first 10 for verification
    console.log('\nFirst 10 suppliers:');
    final.slice(0, 10).forEach(s => {
      console.log(`${s.no}. ${s.kode} - ${s.nama}`);
    });
  }
}

console.log('\n🎯 Done! Refresh the page to see results.');