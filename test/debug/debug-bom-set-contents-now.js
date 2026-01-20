// Debug BOM Set Contents RIGHT NOW
console.log('🔍 Debugging BOM Set contents RIGHT NOW...');

// Get current BOM data
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

console.log('Business:', selectedBusiness || 'packaging');
console.log('BOM Key:', bomStorageKey);

const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

console.log('📊 Current BOM Data:');
console.log('Total items:', bomItems.length);
console.log('First 5 items:', bomItems.slice(0, 5));

// Recreate exact same Set as Products.tsx
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

console.log('✅ BOM Set size:', bomProductIdsSet.size);
console.log('All IDs in Set:', Array.from(bomProductIdsSet).sort());

// Test exact problem IDs
const problemIds = ['krt02722', 'krt04173', 'krt00199', 'krt04072'];
console.log('\n🎯 Problem IDs Test:');
problemIds.forEach(id => {
  const found = bomProductIdsSet.has(id);
  console.log(`${id.toUpperCase()}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  
  // Find raw BOM item
  const rawItem = bomItems.find(b => {
    const rawId = (b.product_id || '').toString().trim().toLowerCase();
    return rawId === id || rawId === id.toUpperCase();
  });
  
  if (rawItem) {
    console.log(`  Raw item: ${rawItem.product_id} → ${rawItem.material_id}`);
  } else {
    console.log(`  Raw item: NOT FOUND`);
  }
});

// Check for corruption signs
console.log('\n⚠️ Corruption Check:');
const invalidIds = Array.from(bomProductIdsSet).filter(id => !/^[a-z]{3}\d{4,5}$/.test(id));
console.log('Invalid IDs:', invalidIds.length);
if (invalidIds.length > 0) {
  console.log('Invalid IDs sample:', invalidIds.slice(0, 10));
}

// Check if "cartonlay" is in the set
const hasCartonlay = bomProductIdsSet.has('cartonlay');
console.log('Has "cartonlay":', hasCartonlay);

if (bomProductIdsSet.size > 100 || invalidIds.length > 0) {
  console.log('\n🚨 BOM DATA IS STILL CORRUPTED!');
  console.log('Need to force clean again or block server sync.');
} else {
  console.log('\n✅ BOM data looks clean.');
}

// Show which IDs are actually in the set that start with "krt"
const krtIds = Array.from(bomProductIdsSet).filter(id => id.startsWith('krt')).sort();
console.log('\nKRT IDs in set:', krtIds.length);
console.log('KRT IDs:', krtIds);