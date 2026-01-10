/**
 * Debug Supplier Duplicates
 * 
 * Script untuk debug masalah duplikasi supplier
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Supplier Duplicates...');
console.log('=' .repeat(60));

// Check all supplier-related files
const filesToCheck = [
  'data/localStorage/suppliers.json',
  'data/localStorage/gt_suppliers.json', 
  'data/localStorage/general-trading/gt_suppliers.json',
  'data/localStorage/trucking/trucking_suppliers.json'
];

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`\n📁 Checking: ${filePath}`);
      
      const content = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(content);
      
      let suppliers = [];
      if (Array.isArray(data)) {
        suppliers = data;
      } else if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
        suppliers = data.value;
      }
      
      console.log(`   Total suppliers: ${suppliers.length}`);
      
      if (suppliers.length > 0) {
        // Check for duplicates by kode
        const kodeCounts = {};
        suppliers.forEach(supplier => {
          if (supplier && supplier.kode) {
            const kode = supplier.kode;
            kodeCounts[kode] = (kodeCounts[kode] || 0) + 1;
          }
        });
        
        const duplicates = Object.entries(kodeCounts).filter(([kode, count]) => count > 1);
        
        if (duplicates.length > 0) {
          console.log(`   🚨 Found duplicates:`);
          duplicates.forEach(([kode, count]) => {
            console.log(`      ${kode}: ${count} times`);
          });
        } else {
          console.log(`   ✅ No duplicates found`);
        }
        
        // Show first few suppliers
        console.log(`   📋 First 5 suppliers:`);
        suppliers.slice(0, 5).forEach((supplier, index) => {
          console.log(`      ${index + 1}. ${supplier.kode} - ${supplier.nama || 'No name'}`);
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Error reading ${filePath}: ${error.message}`);
    }
  } else {
    console.log(`\n⚠️  File not found: ${filePath}`);
  }
});

// Check if there are any backup or temporary files
console.log(`\n🔍 Checking for backup/temp files:`);
const dataDir = path.join(__dirname, 'data/localStorage');
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  const supplierFiles = files.filter(f => 
    f.toLowerCase().includes('supplier') || 
    f.toLowerCase().includes('customer')
  );
  
  console.log(`   Found ${supplierFiles.length} supplier/customer related files:`);
  supplierFiles.forEach(file => {
    console.log(`      ${file}`);
  });
}

console.log(`\n💡 Possible causes of duplicates:`);
console.log(`1. Multiple data sources being merged`);
console.log(`2. Storage service returning wrapped data multiple times`);
console.log(`3. React component re-rendering and adding data multiple times`);
console.log(`4. Data migration issues from old format`);

console.log(`\n🎯 Debug completed!`);