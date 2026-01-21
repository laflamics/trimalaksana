const fs = require('fs');

// Baca data products
const productsPath = './data/localStorage/products.json';
const bomPath = './data/localStorage/bom.json';

console.log('🔄 Extracting BOM data from products...');

try {
  // Baca products file
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  
  console.log(`📊 Found ${productsData.value.length} products`);
  
  // Extract BOM dari products
  const bomEntries = [];
  let bomCount = 0;
  
  productsData.value.forEach(product => {
    if (product.bom && Array.isArray(product.bom) && product.bom.length > 0) {
      // Gunakan product_id atau kode sebagai key
      const productKey = product.product_id || product.kode;
      
      if (productKey) {
        product.bom.forEach(bomItem => {
          bomEntries.push({
            id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            product_id: productKey,
            material_id: bomItem.material_id,
            ratio: bomItem.ratio,
            created: product.lastUpdate || new Date().toISOString()
          });
          bomCount++;
        });
        
        console.log(`✅ Extracted ${product.bom.length} BOM items for ${productKey} (${product.nama})`);
      }
    }
  });
  
  // Buat bom.json structure
  const bomData = {
    value: bomEntries,
    timestamp: Date.now(),
    _timestamp: Date.now()
  };
  
  // Simpan bom.json
  fs.writeFileSync(bomPath, JSON.stringify(bomData, null, 2));
  
  console.log(`✅ Success! Extracted ${bomCount} total BOM items`);
  console.log(`💾 Saved to ${bomPath}`);
  console.log(`📦 Created ${bomEntries.length} BOM entries`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
