// Force complete reload of products data by triggering storage events
const fs = require('fs');
const path = require('path');

console.log('🔄 Force reloading products and BOM data...\n');

// Read current data to get a baseline
const productsPath = path.join(__dirname, '../data/localStorage/products.json');
const bomPath = path.join(__dirname, '../data/localStorage/bom.json');

try {
  const productsWrapper = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const bomWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
  
  const productsData = productsWrapper.value || [];
  const bomData = bomWrapper.value || [];
  
  console.log(`📊 Current state:`);
  console.log(`   Products: ${productsData.length}`);
  console.log(`   BOM entries: ${bomData.length}`);
  
  // Find products that should have BOM indicators
  const productsWithBOM = productsData.filter(product => {
    const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
    return bomData.some(bom => {
      const bomProductId = (bom.product_id || bom.padCode || bom.kode || '').toString().trim().toLowerCase();
      return bomProductId === productId;
    });
  });
  
  console.log(`   Products with BOM: ${productsWithBOM.length}`);
  
  // Modify a timestamp on one BOM entry to force storage event
  if (bomData.length > 0) {
    const firstBOM = bomData[0];
    firstBOM.forceReloadTimestamp = new Date().toISOString();
    console.log(`📝 Updated BOM entry ${firstBOM.id} with force reload timestamp`);
  }
  
  // Also modify one product to trigger products storage event
  if (productsData.length > 0) {
    const firstProduct = productsData[0];
    firstProduct.forceReloadTimestamp = new Date().toISOString();
    console.log(`📝 Updated product ${firstProduct.id} with force reload timestamp`);
  }
  
  // Write back the modified data
  fs.writeFileSync(productsPath, JSON.stringify(productsWrapper, null, 2));
  fs.writeFileSync(bomPath, JSON.stringify(bomWrapper, null, 2));
  
  console.log('\n✅ Force reload triggers added to data files');
  console.log('💡 The React components should now detect the changes and reload');
  console.log('   If not, try refreshing your browser (F5 or Ctrl+R)');
  
  // Clean up the temporary timestamps after a short delay
  setTimeout(() => {
    try {
      const cleanProductsWrapper = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
      const cleanBOMWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
      
      // Remove the temporary timestamps
      (cleanProductsWrapper.value || []).forEach(p => {
        delete p.forceReloadTimestamp;
      });
      
      (cleanBOMWrapper.value || []).forEach(b => {
        delete b.forceReloadTimestamp;
      });
      
      fs.writeFileSync(productsPath, JSON.stringify(cleanProductsWrapper, null, 2));
      fs.writeFileSync(bomPath, JSON.stringify(cleanBOMWrapper, null, 2));
      
      console.log('✅ Temporary timestamps cleaned up');
    } catch (error) {
      console.log('⚠️  Could not clean up temporary timestamps:', error.message);
    }
  }, 2000);
  
} catch (error) {
  console.error('❌ Error during force reload:', error.message);
}