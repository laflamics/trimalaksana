const fs = require('fs');

// Baca data products dan bom
const productsPath = './data/localStorage/products.json';
const bomPath = './data/localStorage/bom.json';

console.log('🔄 Merging BOM data...');

try {
  // Baca files
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
  
  console.log(`📊 Found ${productsData.value.length} products`);
  console.log(`📦 Found ${bomData.value.length} BOM entries`);
  
  // Build BOM lookup map dari bom.json
  const bomMap = new Map();
  bomData.value.forEach(bom => {
    if (bom.product_id) {
      if (!bomMap.has(bom.product_id)) {
        bomMap.set(bom.product_id, []);
      }
      bomMap.get(bom.product_id).push({
        material_id: bom.material_id,
        material_name: bom.material_id, // Akan diupdate nanti
        ratio: bom.ratio
      });
    }
  });
  
  // Update products dengan BOM data
  let updatedCount = 0;
  const updatedProducts = productsData.value.map(product => {
    const updatedProduct = { ...product };
    
    // Cek apakah product punya BOM inline
    if (product.bom && Array.isArray(product.bom) && product.bom.length > 0) {
      console.log(`✅ Product ${product.kode || product.product_id} already has inline BOM`);
      updatedCount++;
    }
    // Cek BOM dari bom.json berdasarkan product_id
    else if (product.product_id && bomMap.has(product.product_id)) {
      updatedProduct.bom = bomMap.get(product.product_id);
      console.log(`🔗 Merged BOM for ${product.kode || product.product_id}`);
      updatedCount++;
    }
    // Cek BOM dari bom.json berdasarkan kode
    else if (product.kode && bomMap.has(product.kode)) {
      updatedProduct.bom = bomMap.get(product.kode);
      console.log(`🔗 Merged BOM for ${product.kode} (by kode)`);
      updatedCount++;
    }
    
    return updatedProduct;
  });
  
  // Update timestamp
  const now = Date.now();
  const updatedData = {
    ...productsData,
    value: updatedProducts,
    timestamp: now,
    _timestamp: now
  };
  
  // Simpan hasil
  fs.writeFileSync(productsPath, JSON.stringify(updatedData, null, 2));
  
  console.log(`✅ Success! Updated ${updatedCount} products with BOM data`);
  console.log(`💾 Saved to ${productsPath}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
