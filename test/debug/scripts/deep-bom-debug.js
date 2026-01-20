// Debug script to check BOM Set creation and hasBOM function
const fs = require('fs');
const path = require('path');

console.log('🔍 Deep debugging BOM Set creation...\n');

// Read the data
const productsPath = path.join(__dirname, '../data/localStorage/products.json');
const bomPath = path.join(__dirname, '../data/localStorage/bom.json');

try {
  const productsWrapper = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const bomWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
  
  const productsData = productsWrapper.value || [];
  const bomData = bomWrapper.value || [];
  
  console.log(`📊 Data loaded:`);
  console.log(`   Products: ${productsData.length}`);
  console.log(`   BOM entries: ${bomData.length}`);
  
  // Simulate the BOM Set creation logic from Products.tsx
  console.log('\n🔧 Simulating BOM Set creation (same as in Products.tsx):\n');
  
  const bomProductIdsSet = new Set();
  const bomDetails = [];
  
  bomData.forEach(b => {
    if (b) {
      const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
      if (bomProductId) {
        bomProductIdsSet.add(bomProductId);
        bomDetails.push({
          bomId: b.id,
          productId: bomProductId,
          originalProductId: b.product_id
        });
      }
    }
  });
  
  console.log(`✅ BOM Set created with ${bomProductIdsSet.size} entries`);
  
  // Check specific products from your screenshot
  const targetProducts = ['FG-CTM-00001', 'KRT04072', 'KRT04173', 'KRT00199'];
  
  console.log('\n🔍 Checking target products in BOM Set:\n');
  
  targetProducts.forEach(productId => {
    const productIdLower = productId.toLowerCase();
    const isInSet = bomProductIdsSet.has(productIdLower);
    
    console.log(`Product ID: ${productId}`);
    console.log(`  Lowercase: ${productIdLower}`);
    console.log(`  In BOM Set: ${isInSet ? '✅ YES' : '❌ NO'}`);
    
    if (isInSet) {
      const matchingBOM = bomDetails.filter(b => b.productId === productIdLower);
      console.log(`  Matching BOM entries: ${matchingBOM.length}`);
      matchingBOM.forEach(b => {
        console.log(`    - BOM ID: ${b.bomId}`);
      });
    }
    console.log('');
  });
  
  // Check what's actually in the BOM Set
  console.log('📋 First 10 entries in BOM Set:');
  let count = 0;
  for (const entry of bomProductIdsSet) {
    if (count < 10) {
      console.log(`  ${count + 1}. ${entry}`);
      count++;
    }
  }
  
  if (bomProductIdsSet.size > 10) {
    console.log(`  ... and ${bomProductIdsSet.size - 10} more entries`);
  }
  
  // Check if the products that should have BOM indicators are in the set
  console.log('\n🔍 Verifying products with BOM data:');
  
  const productsWithBOM = productsData.filter(product => {
    const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
    return bomProductIdsSet.has(productId);
  });
  
  console.log(`✅ Products that should show BOM indicators: ${productsWithBOM.length}`);
  
  if (productsWithBOM.length > 0) {
    console.log('\n📋 First 5 products that should have BOM indicators:');
    productsWithBOM.slice(0, 5).forEach((product, index) => {
      const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
      console.log(`${index + 1}. ${product.nama || 'N/A'} (ID: ${product.product_id})`);
      console.log(`   Product ID in Set: ${bomProductIdsSet.has(productId) ? '✅ YES' : '❌ NO'}`);
    });
  }
  
  console.log('\n✅ BOM Set simulation complete!');
  console.log('\n💡 If the simulation shows correct results but UI still doesn\'t display BOM indicators:');
  console.log('   1. The React component might be using cached/stale data');
  console.log('   2. There might be a mismatch in the hasBOM function dependencies');
  console.log('   3. The component might need a forced re-render');
  console.log('   4. Try clearing browser cache and doing a hard refresh (Ctrl+Shift+R)');
  
} catch (error) {
  console.error('❌ Error during deep debug:', error.message);
  console.error(error.stack);
}