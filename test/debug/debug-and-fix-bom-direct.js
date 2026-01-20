// Debug and Fix BOM Direct - Find exact mismatch
console.log('🔍 Debug and Fix BOM Direct...');

// 1. Check what's in localStorage vs file
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

console.log('Business:', selectedBusiness || 'packaging');
console.log('BOM Key:', bomStorageKey);

const currentBomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const currentBomItems = currentBomData.value || currentBomData;

console.log('📊 Current localStorage BOM:', currentBomItems.length, 'items');

// 2. Check specific problem IDs in current data
const problemIds = ['KRT02722', 'KRT04173', 'KRT04072', 'KRT00199'];
console.log('\n🔍 Problem IDs in current BOM data:');

problemIds.forEach(id => {
  const found = currentBomItems.find(item => item.product_id === id);
  console.log(`${id}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (found) {
    console.log(`  Item:`, found);
  }
});

// 3. Get products data and check identifiers
const productsData = JSON.parse(localStorage.getItem('products') || '[]');
console.log('\n📦 Products with problem names:');

const problemNames = [
  'KARTON BOX 430X350X350',
  'LAYER KARTON', 
  'CARTON BOX DH8 POLOS 727X380X320MM',
  'CARTON BOX DH1 560X380X340'
];

const foundProducts = [];
problemNames.forEach((name, index) => {
  const found = productsData.find(p => 
    p.nama && p.nama.includes(name.substring(0, 15))
  );
  
  if (found) {
    foundProducts.push(found);
    console.log(`\n${index + 1}. ${found.nama}`);
    console.log(`   • product_id: "${found.product_id || 'EMPTY'}"`);
    console.log(`   • kode: "${found.kode || 'EMPTY'}"`);
    console.log(`   • padCode: "${found.padCode || 'EMPTY'}"`);
    console.log(`   • kodeIpos: "${found.kodeIpos || 'EMPTY'}"`);
    
    // Test what hasBOM would use
    const rawId = (found.product_id || found.padCode || found.kode || '').toString().trim();
    console.log(`   • hasBOM uses: "${rawId}"`);
    console.log(`   • Expected: ${problemIds[index]}`);
  }
});

// 4. Manual hasBOM test with current data
console.log('\n🧪 Manual hasBOM Test with Current Data:');

// Recreate exact bomProductIdsSet from current localStorage
const normalizeBomId = (id) => {
  if (!id) return '';
  let normalized = String(id).trim().toLowerCase();
  if (normalized.startsWith('fg-')) normalized = normalized.substring(3);
  if (normalized.includes('-') && !normalized.match(/^[a-z]{3}-?\d{4,5}$/)) {
    const parts = normalized.split('-');
    if (parts.length > 1 && parts[parts.length - 1].match(/^[a-z]{3}\d{4,5}$/)) {
      normalized = parts[parts.length - 1];
    } else if (parts.length > 1 && parts[0].match(/^[a-z]{3}\d{4,5}$/)) {
      normalized = parts[0];
    }
  }
  if (normalized.match(/^[a-z]{3}-\d{4,5}$/)) {
    normalized = normalized.replace('-', '');
  }
  return normalized;
};

const bomProductIdsSet = new Set();
currentBomItems.forEach(b => {
  if (b) {
    const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim();
    if (bomProductId) {
      const normalized = normalizeBomId(bomProductId);
      if (normalized) {
        bomProductIdsSet.add(normalized);
      }
    }
  }
});

console.log('BOM Set size:', bomProductIdsSet.size);
console.log('BOM Set contents:', Array.from(bomProductIdsSet).sort());

// Test each product
foundProducts.forEach((product, index) => {
  const rawId = (product.product_id || product.padCode || product.kode || '').toString().trim();
  const normalized = normalizeBomId(rawId);
  const found = bomProductIdsSet.has(normalized);
  
  console.log(`\n📦 ${product.nama.substring(0, 30)}...`);
  console.log(`   Raw ID: "${rawId}"`);
  console.log(`   Normalized: "${normalized}"`);
  console.log(`   In BOM Set: ${found ? '✅ YES' : '❌ NO'}`);
  console.log(`   Expected: ${problemIds[index]}`);
});

// 5. DIRECT FIX: Add missing product identifiers
console.log('\n🔧 DIRECT FIX: Adding missing identifiers...');

let needsUpdate = false;
const updatedProducts = productsData.map(product => {
  // Find if this product should have a BOM identifier
  const matchIndex = problemNames.findIndex(name => 
    product.nama && product.nama.includes(name.substring(0, 15))
  );
  
  if (matchIndex >= 0) {
    const expectedId = problemIds[matchIndex];
    const currentId = (product.product_id || product.padCode || product.kode || '').toString().trim();
    
    if (!currentId || currentId === '') {
      console.log(`✅ Fixing: ${product.nama} → ${expectedId}`);
      needsUpdate = true;
      return {
        ...product,
        product_id: expectedId,
        kode: expectedId,
        lastUpdate: new Date().toISOString(),
        userUpdate: 'System - BOM Fix'
      };
    }
  }
  
  return product;
});

if (needsUpdate) {
  console.log('\n💾 Saving updated products...');
  localStorage.setItem('products', JSON.stringify(updatedProducts));
  
  // Trigger reload
  window.dispatchEvent(new CustomEvent('app-storage-changed', {
    detail: { key: 'products', value: updatedProducts }
  }));
  
  console.log('✅ Products updated! Refresh page to see green dots.');
} else {
  console.log('\n✅ No product updates needed.');
}

// 6. Final verification
console.log('\n🎯 Final Verification:');
console.log('If BOM data exists but indicators still orange:');
console.log('1. Check if products have proper identifiers (product_id/kode)');
console.log('2. Check if BOM product_id matches product identifiers');
console.log('3. Check if normalization logic is working correctly');
console.log('4. Refresh page after running this script');

console.log('\n🔄 REFRESH THE PAGE NOW!');