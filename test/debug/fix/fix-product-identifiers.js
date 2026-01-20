// Fix Product Identifiers - Add missing kode/product_id
console.log('🔧 Fixing Product Identifiers...');

// Get products and BOM data
const productsData = JSON.parse(localStorage.getItem('products') || '[]');
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';
const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

console.log('📊 Current Data:');
console.log('Products:', productsData.length);
console.log('BOM Items:', bomItems.length);

// Get all BOM product IDs
const bomProductIds = new Set();
bomItems.forEach(b => {
  if (b && b.product_id) {
    bomProductIds.add(b.product_id);
  }
});

console.log('BOM Product IDs:', Array.from(bomProductIds).sort());

// Find products that should have BOM but missing identifiers
const problemProducts = [
  { name: 'KARTON BOX 430X350X350', expectedId: 'KRT04072' },
  { name: 'LAYER KARTON', expectedId: 'KRT04173' },
  { name: 'CARTON BOX DH8 POLOS 727X380X320MM', expectedId: 'KRT02722' },
  { name: 'CARTON BOX DH1 560X380X340', expectedId: 'KRT00199' }
];

console.log('\n🔍 Problem Products Analysis:');
const foundProducts = [];

problemProducts.forEach(({ name, expectedId }) => {
  const found = productsData.find(p => 
    p.nama && p.nama.includes(name.substring(0, 15))
  );
  
  if (found) {
    foundProducts.push({ product: found, expectedId });
    console.log(`\n📦 ${expectedId}: ${found.nama}`);
    console.log(`   • Current product_id: "${found.product_id || 'EMPTY'}"`);
    console.log(`   • Current kode: "${found.kode || 'EMPTY'}"`);
    console.log(`   • Current padCode: "${found.padCode || 'EMPTY'}"`);
    console.log(`   • Expected ID: ${expectedId}`);
    console.log(`   • BOM has this ID: ${bomProductIds.has(expectedId) ? '✅ YES' : '❌ NO'}`);
  } else {
    console.log(`❌ ${expectedId}: Product not found`);
  }
});

// Fix: Add missing identifiers
console.log('\n🔧 Fixing Missing Identifiers:');
let updatedProducts = [...productsData];
let changesCount = 0;

foundProducts.forEach(({ product, expectedId }) => {
  const index = updatedProducts.findIndex(p => p.id === product.id);
  if (index >= 0) {
    const updated = { ...updatedProducts[index] };
    
    // Add missing identifiers
    if (!updated.product_id || updated.product_id.trim() === '') {
      updated.product_id = expectedId;
      console.log(`✅ Added product_id: ${expectedId} to "${updated.nama}"`);
      changesCount++;
    }
    
    if (!updated.kode || updated.kode.trim() === '') {
      updated.kode = expectedId;
      console.log(`✅ Added kode: ${expectedId} to "${updated.nama}"`);
      changesCount++;
    }
    
    // Update timestamp
    updated.lastUpdate = new Date().toISOString();
    updated.userUpdate = 'System - Fix Identifiers';
    
    updatedProducts[index] = updated;
  }
});

if (changesCount > 0) {
  console.log(`\n💾 Saving ${changesCount} changes...`);
  
  // Save updated products
  localStorage.setItem('products', JSON.stringify(updatedProducts));
  
  // Trigger reload
  window.dispatchEvent(new CustomEvent('app-storage-changed', {
    detail: { key: 'products', value: updatedProducts }
  }));
  
  console.log('✅ Products updated and reload triggered');
  console.log('\n🎯 Expected Results:');
  console.log('• Products should now have proper product_id/kode');
  console.log('• BOM indicators should show green dots');
  console.log('• hasBOM should return true for fixed products');
  
} else {
  console.log('\n✅ No changes needed - all products already have identifiers');
}

console.log('\n🔄 Refresh the page to see the changes!');