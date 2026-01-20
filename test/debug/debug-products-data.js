// Debug Products Data - Check Raw Products
console.log('🔍 Debugging Products Data...');

// Get products data
const productsData = JSON.parse(localStorage.getItem('products') || '[]');
console.log('📊 Total products:', productsData.length);

// Find problem products by name
const problemNames = [
  'CARTON BOX DH8 POLOS 727X380X320MM',
  'LAYER KARTON', 
  'KARTON BOX 430X350X350',
  'CARTON BOX DH1 560X380X340'
];

console.log('\n🔍 Problem Products Search:');
problemNames.forEach(name => {
  const found = productsData.filter(p => 
    p.nama && p.nama.includes(name.substring(0, 15))
  );
  
  console.log(`\n📦 "${name.substring(0, 20)}..."`);
  console.log(`Found: ${found.length} products`);
  
  found.forEach((product, index) => {
    console.log(`  ${index + 1}. ${product.nama}`);
    console.log(`     • product_id: "${product.product_id}"`);
    console.log(`     • kode: "${product.kode}"`);
    console.log(`     • padCode: "${product.padCode}"`);
    console.log(`     • kodeIpos: "${product.kodeIpos}"`);
    
    // Test what hasBOM logic would use
    const rawProductId = (product.product_id || product.padCode || product.kode || '').toString().trim();
    console.log(`     • hasBOM uses: "${rawProductId}"`);
    
    // Check if this matches expected IDs
    const expectedIds = ['KRT02722', 'KRT04173', 'KRT04072', 'KRT00199'];
    const matches = expectedIds.find(id => 
      rawProductId.toUpperCase() === id || 
      rawProductId.toLowerCase() === id.toLowerCase()
    );
    console.log(`     • Matches expected: ${matches || 'NO'}`);
  });
});

// Check for CARTONLAY issue
console.log('\n🔍 CARTONLAY Issue:');
const cartonlayProducts = productsData.filter(p => 
  (p.product_id && p.product_id.toString().toUpperCase().includes('CARTONLAY')) ||
  (p.kode && p.kode.toString().toUpperCase().includes('CARTONLAY')) ||
  (p.padCode && p.padCode.toString().toUpperCase().includes('CARTONLAY'))
);

console.log('CARTONLAY products found:', cartonlayProducts.length);
cartonlayProducts.forEach(p => {
  console.log('  • Name:', p.nama);
  console.log('  • product_id:', p.product_id);
  console.log('  • kode:', p.kode);
  console.log('  • padCode:', p.padCode);
});

// Check exact IDs we expect
console.log('\n🎯 Expected ID Check:');
const expectedIds = ['KRT02722', 'KRT04173', 'KRT04072', 'KRT00199'];
expectedIds.forEach(expectedId => {
  const found = productsData.find(p => {
    const productId = (p.product_id || p.padCode || p.kode || '').toString().trim();
    return productId.toUpperCase() === expectedId;
  });
  
  console.log(`${expectedId}:`);
  if (found) {
    console.log(`  ✅ FOUND: ${found.nama}`);
    console.log(`  • product_id: "${found.product_id}"`);
    console.log(`  • kode: "${found.kode}"`);
    console.log(`  • padCode: "${found.padCode}"`);
  } else {
    console.log(`  ❌ NOT FOUND`);
    
    // Look for similar
    const similar = productsData.filter(p => {
      const productId = (p.product_id || p.padCode || p.kode || '').toString().trim();
      return productId.toUpperCase().includes(expectedId.substring(3)) || 
             productId.toLowerCase().includes(expectedId.toLowerCase().substring(3));
    });
    
    if (similar.length > 0) {
      console.log(`  Similar products: ${similar.length}`);
      similar.slice(0, 2).forEach(s => {
        console.log(`    • ${s.nama}: ${s.product_id || s.kode}`);
      });
    }
  }
});

console.log('\n🎯 CONCLUSION:');
console.log('Check if the expected product IDs exist in the products data.');
console.log('If they exist but hasBOM returns false, the issue is in BOM matching.');
console.log('If they don\'t exist, the issue is in product data or ID format.');