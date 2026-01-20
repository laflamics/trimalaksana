// Debug script to check specific products and their BOM status
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging BOM Display for Specific Products...\n');

// Read the data
const productsPath = path.join(__dirname, '../data/localStorage/products.json');
const bomPath = path.join(__dirname, '../data/localStorage/bom.json');

try {
  const productsWrapper = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const bomWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
  
  const productsData = productsWrapper.value || [];
  const bomData = bomWrapper.value || [];
  
  console.log(`📊 Total products: ${productsData.length}`);
  console.log(`📊 Total BOM entries: ${bomData.length}\n`);
  
  // Products from your screenshot that should have BOM indicators
  const targetProducts = ['FG-CTM-00001', 'KRT04072', 'KRT04173', 'KRT00199'];
  
  console.log('🔍 Checking specific products:\n');
  
  targetProducts.forEach(productId => {
    // Find the product
    const product = productsData.find(p => p.product_id === productId);
    
    if (product) {
      // Check BOM matching using the same logic as hasBOM function
      const productIdLower = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
      
      const matchingBOM = bomData.filter(bom => {
        const bomProductId = (bom.product_id || bom.padCode || bom.kode || '').toString().trim().toLowerCase();
        return bomProductId === productIdLower;
      });
      
      const hasBOM = matchingBOM.length > 0;
      
      console.log(`📦 Product ID: ${productId}`);
      console.log(`   Name: ${product.nama || 'N/A'}`);
      console.log(`   Has BOM: ${hasBOM ? '✅ YES' : '❌ NO'}`);
      console.log(`   Matching BOM entries: ${matchingBOM.length}`);
      
      if (hasBOM) {
        matchingBOM.forEach(bom => {
          console.log(`     - BOM ID: ${bom.id}`);
          console.log(`       Material: ${bom.material_id}`);
          console.log(`       Ratio: ${bom.ratio}`);
        });
      }
      console.log('');
    } else {
      console.log(`❌ Product ID "${productId}" not found!\n`);
    }
  });
  
  // Also check if there are any BOM entries for these product IDs
  console.log('🔍 Checking BOM entries for target product IDs:\n');
  
  targetProducts.forEach(productId => {
    const productIdLower = productId.toLowerCase();
    const matchingBOM = bomData.filter(bom => 
      (bom.product_id || '').toString().trim().toLowerCase() === productIdLower
    );
    
    console.log(`BOM entries for "${productId}": ${matchingBOM.length}`);
    if (matchingBOM.length > 0) {
      matchingBOM.forEach(bom => {
        console.log(`  - ${bom.material_id} (ratio: ${bom.ratio})`);
      });
    }
    console.log('');
  });
  
  console.log('✅ Debug complete!');
  console.log('\n💡 If products show "Has BOM: YES" but no indicator appears in UI:');
  console.log('   1. The React component cache might not be updating');
  console.log('   2. There could be a mismatch in the hasBOM function implementation');
  console.log('   3. The component might be using stale data');
  
} catch (error) {
  console.error('❌ Error during debug:', error.message);
}