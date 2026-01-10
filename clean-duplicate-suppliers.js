/**
 * Clean Duplicate Suppliers/Customers
 * 
 * Script untuk membersihkan data supplier/customer yang duplikat
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning Duplicate Suppliers/Customers...');
console.log('=' .repeat(60));

// Function to clean duplicates from array
const removeDuplicates = (items, keyField = 'kode') => {
  const seen = new Map();
  const cleaned = [];
  
  items.forEach(item => {
    if (!item || !item[keyField]) return;
    
    const key = item[keyField].toLowerCase().trim();
    
    if (!seen.has(key)) {
      seen.set(key, true);
      cleaned.push(item);
    } else {
      console.log(`  🗑️  Removed duplicate: ${item[keyField]} - ${item.nama || 'No name'}`);
    }
  });
  
  return cleaned;
};

// Function to renumber items
const renumberItems = (items) => {
  return items.map((item, index) => ({
    ...item,
    no: index + 1
  }));
};

// Files to clean
const filesToClean = [
  // Packaging
  { path: 'data/localStorage/suppliers.json', type: 'suppliers' },
  { path: 'data/localStorage/customers.json', type: 'customers' },
  
  // General Trading
  { path: 'data/localStorage/general-trading/gt_suppliers.json', type: 'suppliers' },
  { path: 'data/localStorage/general-trading/gt_customers.json', type: 'customers' },
  
  // Trucking
  { path: 'data/localStorage/trucking/trucking_suppliers.json', type: 'suppliers' },
  { path: 'data/localStorage/trucking/trucking_customers.json', type: 'customers' }
];

let totalCleaned = 0;

filesToClean.forEach(fileInfo => {
  const filePath = path.join(__dirname, fileInfo.path);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fileInfo.path}`);
    return;
  }
  
  try {
    console.log(`\n📁 Processing: ${fileInfo.path}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(content);
    
    // Handle wrapped data format
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
      items = data.value;
    } else {
      console.log(`  ⚠️  Unknown data format, skipping...`);
      return;
    }
    
    const originalCount = items.length;
    console.log(`  📊 Original count: ${originalCount} ${fileInfo.type}`);
    
    if (originalCount === 0) {
      console.log(`  ✅ No data to clean`);
      return;
    }
    
    // Remove duplicates based on 'kode' field
    const cleanedItems = removeDuplicates(items, 'kode');
    
    // Renumber items
    const renumberedItems = renumberItems(cleanedItems);
    
    const newCount = renumberedItems.length;
    const duplicatesRemoved = originalCount - newCount;
    
    console.log(`  ✅ Cleaned count: ${newCount} ${fileInfo.type}`);
    console.log(`  🗑️  Duplicates removed: ${duplicatesRemoved}`);
    
    if (duplicatesRemoved > 0) {
      // Save cleaned data back
      let dataToSave;
      if (Array.isArray(data)) {
        dataToSave = renumberedItems;
      } else {
        dataToSave = { ...data, value: renumberedItems };
      }
      
      fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
      console.log(`  💾 Saved cleaned data to ${fileInfo.path}`);
      
      totalCleaned += duplicatesRemoved;
    }
    
  } catch (error) {
    console.error(`  ❌ Error processing ${fileInfo.path}: ${error.message}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`✅ Total duplicates removed: ${totalCleaned}`);

if (totalCleaned > 0) {
  console.log(`\n💡 Next steps:`);
  console.log(`1. Refresh the suppliers/customers page`);
  console.log(`2. Verify the data looks correct`);
  console.log(`3. Check that numbering is sequential`);
} else {
  console.log(`\n✅ No duplicates found - data is already clean!`);
}

console.log(`\n🎯 Duplicate cleaning completed!`);