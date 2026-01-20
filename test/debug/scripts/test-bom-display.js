// Test script to verify BOM display functionality with correct data structure
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing BOM Display Functionality...\n');

// Read the products data
const productsPath = path.join(__dirname, '../data/localStorage/products.json');
const bomPath = path.join(__dirname, '../data/localStorage/bom.json');

try {
  const productsWrapper = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const bomWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
  
  const productsData = productsWrapper.value || [];
  const bomData = bomWrapper.value || [];
  
  console.log(`📊 Found ${productsData.length} products and ${bomData.length} BOM entries`);
  
  // Find products with BOM
  const productsWithBOM = productsData.filter(product => {
    const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
    return bomData.some(bom => {
      const bomProductId = (bom.product_id || bom.padCode || bom.kode || '').toString().trim().toLowerCase();
      return bomProductId === productId;
    });
  });
  
  console.log(`📦 Products with BOM: ${productsWithBOM.length}`);
  
  if (productsWithBOM.length > 0) {
    console.log('\n📋 Products that should show BOM indicator:');
    productsWithBOM.slice(0, 5).forEach((product, index) => {
      const productId = (product.product_id || product.padCode || product.kode || '').toString().trim();
      console.log(`${index + 1}. Product: ${product.nama || 'N/A'} (ID: ${productId})`);
    });
    
    // Show some BOM details
    console.log('\n🔧 Sample BOM entries:');
    const sampleBOM = bomData.slice(0, 3);
    sampleBOM.forEach((bom, index) => {
      console.log(`${index + 1}. Product ID: ${bom.product_id}, Material: ${bom.material_id}, Ratio: ${bom.ratio}`);
    });
  } else {
    console.log('⚠️  No products found with matching BOM data');
  }
  
  // Test specific product ID "321" if it exists
  const testProduct = productsData.find(p => p.product_id === '321');
  if (testProduct) {
    const productId = (testProduct.product_id || '').toString().trim().toLowerCase();
    const hasBOM = bomData.some(bom => {
      const bomProductId = (bom.product_id || '').toString().trim().toLowerCase();
      return bomProductId === productId;
    });
    
    console.log(`\n🎯 Product "321": ${testProduct.nama || 'N/A'}`);
    console.log(`Has BOM: ${hasBOM ? '✅ YES' : '❌ NO'}`);
    
    if (hasBOM) {
      const matchingBOM = bomData.filter(bom => 
        (bom.product_id || '').toString().trim().toLowerCase() === productId
      );
      console.log(`Matching BOM entries: ${matchingBOM.length}`);
      matchingBOM.forEach(bom => {
        console.log(`  - Material: ${bom.material_id}, Ratio: ${bom.ratio}`);
      });
    }
  } else {
    console.log('\nℹ️  Product with ID "321" not found in current data');
  }
  
  console.log('\n✅ BOM data structure verification complete!');
  console.log('💡 Troubleshooting steps if BOM indicators are not showing:');
  console.log('   1. Refresh the browser (F5 or Ctrl+R)');
  console.log('   2. Clear browser cache and hard refresh (Ctrl+Shift+R)');
  console.log('   3. Check browser developer console for JavaScript errors');
  console.log('   4. Verify the React component is properly re-rendering');
  console.log('   5. Check if localStorage data is being loaded correctly');
  
} catch (error) {
  console.error('❌ Error reading data files:', error.message);
  console.error('Full error:', error);
}