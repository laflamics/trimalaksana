// Manual hasBOM Test - Direct Function Call
console.log('🧪 Manual hasBOM Test...');

// Get products data
const productsData = JSON.parse(localStorage.getItem('products') || '[]');

// Find exact problem products
const problemProducts = [
  { name: 'CARTON BOX DH8 POLOS 727X380X320MM', expectedId: 'KRT02722' },
  { name: 'LAYER KARTON', expectedId: 'KRT04173' },
  { name: 'KARTON BOX 430X350X350', expectedId: 'KRT04072' },
  { name: 'CARTON BOX DH1 560X380X340', expectedId: 'KRT00199' }
];

console.log('📊 Found products:');
const foundProducts = [];

problemProducts.forEach(({ name, expectedId }) => {
  const found = productsData.find(p => 
    p.nama && p.nama.includes(name.substring(0, 15))
  );
  
  if (found) {
    foundProducts.push({ ...found, expectedId });
    console.log(`✅ ${expectedId}: ${found.nama}`);
    console.log(`   • product_id: "${found.product_id}"`);
    console.log(`   • kode: "${found.kode}"`);
    console.log(`   • padCode: "${found.padCode}"`);
  } else {
    console.log(`❌ ${expectedId}: NOT FOUND`);
  }
});

// Get BOM data and recreate bomProductIdsSet exactly like Products.tsx
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

console.log('\n📊 BOM Data:', bomItems.length, 'items');

// Recreate exact normalization functions from Products.tsx
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

const normalizeProductIdForBOM = (id) => {
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

// Create bomProductIdsSet exactly like Products.tsx
const bomProductIdsSet = new Set();
bomItems.forEach(b => {
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

console.log('✅ BOM Set created:', bomProductIdsSet.size);

// Manual hasBOM function exactly like Products.tsx
const manualHasBOM = (product) => {
  const rawProductId = (product.product_id || product.padCode || product.kode || '').toString().trim();
  if (!rawProductId) return false;
  
  const normalizedProductId = normalizeProductIdForBOM(rawProductId);
  if (!normalizedProductId) return false;
  
  const result = bomProductIdsSet.has(normalizedProductId);
  
  console.log(`🔍 Manual hasBOM test:`, {
    productName: product.nama,
    rawProductId: rawProductId,
    normalizedProductId: normalizedProductId,
    hasBOM: result,
    bomSetSize: bomProductIdsSet.size
  });
  
  return result;
};

// Test each found product
console.log('\n🧪 Manual hasBOM Tests:');
foundProducts.forEach(product => {
  console.log(`\n📦 Testing: ${product.expectedId}`);
  const result = manualHasBOM(product);
  console.log(`Result: ${result ? '✅ HAS BOM' : '❌ NO BOM'}`);
  
  // Also check if the normalized ID exists in the set
  const rawId = (product.product_id || product.padCode || product.kode || '').toString().trim();
  const normalized = normalizeProductIdForBOM(rawId);
  console.log(`Set contains "${normalized}": ${bomProductIdsSet.has(normalized)}`);
});

// Show some IDs from the set for comparison
console.log('\n📋 Sample BOM Set IDs:');
const allSetIds = Array.from(bomProductIdsSet).sort();
console.log('Total IDs in set:', allSetIds.length);
console.log('First 20 IDs:', allSetIds.slice(0, 20));

// Look for our expected IDs in the set
console.log('\n🎯 Expected IDs in Set:');
['krt02722', 'krt04173', 'krt04072', 'krt00199'].forEach(id => {
  const found = bomProductIdsSet.has(id);
  console.log(`${id}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});