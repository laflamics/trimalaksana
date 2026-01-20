// Clean up duplicate and orphaned BOM entries
const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up BOM data...\n');

// Read data files
const bomPath = path.join(__dirname, '../data/localStorage/bom.json');
const productsPath = path.join(__dirname, '../data/localStorage/products.json');

try {
  // Read current data
  const bomWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
  const productsWrapper = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  
  const bomData = bomWrapper.value || [];
  const productsData = productsWrapper.value || [];
  
  console.log(`📊 Current Data:`);
  console.log(`   BOM entries: ${bomData.length}`);
  console.log(`   Products: ${productsData.length}`);
  
  // Create product ID lookup for validation
  const validProductIds = new Set();
  productsData.forEach(p => {
    if (p.product_id) {
      validProductIds.add(p.product_id.toString().trim().toLowerCase());
    }
  });
  
  console.log(`   Valid product IDs: ${validProductIds.size}`);
  
  // Identify and remove orphaned BOM entries
  const cleanBOM = [];
  const orphanedEntries = [];
  const duplicateTracker = new Map();
  
  bomData.forEach(bom => {
    if (!bom || !bom.product_id) {
      orphanedEntries.push(bom);
      return;
    }
    
    const productId = bom.product_id.toString().trim().toLowerCase();
    
    // Check if product exists
    if (!validProductIds.has(productId)) {
      orphanedEntries.push(bom);
      return;
    }
    
    // Handle duplicates - keep the first occurrence, mark others as duplicates
    const bomKey = `${productId}-${bom.material_id || 'no-material'}`;
    if (duplicateTracker.has(bomKey)) {
      // This is a duplicate, skip it
      return;
    }
    
    duplicateTracker.set(bomKey, true);
    cleanBOM.push(bom);
  });
  
  console.log(`\n🧹 Cleanup Results:`);
  console.log(`   Orphaned entries removed: ${orphanedEntries.length}`);
  console.log(`   Duplicate entries removed: ${bomData.length - cleanBOM.length - orphanedEntries.length}`);
  console.log(`   Clean BOM entries remaining: ${cleanBOM.length}`);
  
  if (orphanedEntries.length > 0) {
    console.log('\n🗑️  Orphaned entries removed:');
    orphanedEntries.slice(0, 5).forEach(bom => {
      console.log(`   - Product ID: ${bom.product_id || 'N/A'}, Material: ${bom.material_id || 'N/A'}`);
    });
  }
  
  // Write cleaned data back
  bomWrapper.value = cleanBOM;
  fs.writeFileSync(bomPath, JSON.stringify(bomWrapper, null, 2));
  
  console.log('\n✅ BOM data cleaned successfully!');
  console.log('💡 Next steps:');
  console.log('1. Refresh your browser (Ctrl+Shift+R)');
  console.log('2. Check if BOM indicators now appear correctly');
  console.log('3. The hasBOM function should now work properly');
  
  // Verify the cleanup worked
  console.log('\n🔍 Verification:');
  const targetProducts = ['KRT04072', 'KRT04173', 'KRT00199'];
  
  targetProducts.forEach(productId => {
    const hasBOM = cleanBOM.some(bom => 
      bom && bom.product_id && 
      bom.product_id.toString().trim().toLowerCase() === productId.toLowerCase()
    );
    
    console.log(`Product ${productId}: ${hasBOM ? '✅ Has BOM' : '❌ No BOM'}`);
  });
  
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
}