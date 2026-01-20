// Debug BOM Set Actual Contents
console.log('🔍 Debugging actual BOM Set contents...');

// Get current BOM data
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

console.log('Business context:', selectedBusiness || 'packaging');
console.log('BOM storage key:', bomStorageKey);

const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

console.log('📊 Current BOM Data:');
console.log('Total items:', bomItems.length);

// Recreate the exact same logic as Products.tsx
const bomProductIdsSet = new Set();

// Helper function to normalize BOM product ID (same as in Products.tsx)
const normalizeBomId = (id) => {
  if (!id) return '';
  
  let normalized = String(id).trim().toLowerCase();
  
  // Remove FG- prefix if exists
  if (normalized.startsWith('fg-')) {
    normalized = normalized.substring(3);
  }
  
  // Remove customer code suffix but keep KRT-style codes intact
  if (normalized.includes('-') && !normalized.match(/^[a-z]{3}-?\d{4,5}$/)) {
    const parts = normalized.split('-');
    if (parts.length > 1 && parts[parts.length - 1].match(/^[a-z]{3}\d{4,5}$/)) {
      normalized = parts[parts.length - 1];
    } else if (parts.length > 1 && parts[0].match(/^[a-z]{3}\d{4,5}$/)) {
      normalized = parts[0];
    }
  }
  
  // Remove dashes for KRT codes
  if (normalized.match(/^[a-z]{3}-\d{4,5}$/)) {
    normalized = normalized.replace('-', '');
  }
  
  return normalized;
};

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

console.log('✅ BOM Set created:', {
  size: bomProductIdsSet.size,
  allIds: Array.from(bomProductIdsSet).sort()
});

// Check problem products
const problemIds = ['krt02722', 'krt04173', 'krt00199', 'krt04072'];
console.log('\n🎯 Problem Products Check:');
problemIds.forEach(id => {
  const found = bomProductIdsSet.has(id);
  console.log(`${id.toUpperCase()}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});

// Check for invalid/corrupted IDs
console.log('\n🔍 Invalid ID Analysis:');
const allIds = Array.from(bomProductIdsSet);
const validIds = allIds.filter(id => /^[a-z]{3}\d{4,5}$/.test(id));
const invalidIds = allIds.filter(id => !/^[a-z]{3}\d{4,5}$/.test(id));

console.log('Valid IDs:', validIds.length);
console.log('Invalid IDs:', invalidIds.length);
if (invalidIds.length > 0) {
  console.log('Invalid IDs sample:', invalidIds.slice(0, 10));
}

// Check raw BOM data for corruption
console.log('\n🔍 Raw BOM Data Analysis:');
const rawProductIds = bomItems.map(b => b.product_id).filter(Boolean);
const uniqueRawIds = [...new Set(rawProductIds)];
console.log('Raw product IDs count:', rawProductIds.length);
console.log('Unique raw product IDs:', uniqueRawIds.length);

// Look for the specific IDs in raw data
console.log('\n📋 Raw Data Check for Problem IDs:');
problemIds.forEach(id => {
  const upperCaseId = id.toUpperCase();
  const foundInRaw = rawProductIds.includes(upperCaseId);
  const bomItem = bomItems.find(b => b.product_id === upperCaseId);
  
  console.log(`${upperCaseId}:`);
  console.log(`  • In raw BOM data: ${foundInRaw ? '✅ YES' : '❌ NO'}`);
  if (bomItem) {
    console.log(`  • BOM item:`, {
      id: bomItem.id,
      product_id: bomItem.product_id,
      material_id: bomItem.material_id,
      ratio: bomItem.ratio
    });
  }
});

// Check for corruption indicators
console.log('\n⚠️ Corruption Indicators:');
const corruptionSigns = {
  tooManyItems: bomItems.length > 100,
  invalidIds: invalidIds.length > 0,
  missingProblemIds: !bomProductIdsSet.has('krt02722') || !bomProductIdsSet.has('krt04173'),
  duplicateIds: rawProductIds.length !== uniqueRawIds.length
};

Object.entries(corruptionSigns).forEach(([sign, detected]) => {
  console.log(`${sign}: ${detected ? '🚨 DETECTED' : '✅ OK'}`);
});

if (Object.values(corruptionSigns).some(Boolean)) {
  console.log('\n🔧 CORRUPTION DETECTED! Need to clean BOM data.');
  console.log('Run the clean BOM script to fix this.');
} else {
  console.log('\n✅ BOM data looks clean. Issue might be elsewhere.');
}