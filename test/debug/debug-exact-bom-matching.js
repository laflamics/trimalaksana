// Debug Exact BOM Matching - Focus on Filter Logic
console.log('🎯 Debugging exact BOM matching...');

// Get BOM data and recreate the exact same Set as Products.tsx
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

console.log('📊 BOM Data:', bomItems.length, 'items');

// Recreate exact same normalization as Products.tsx
const normalizeBomId = (id) => {
  if (!id) return '';
  
  let normalized = String(id).trim().toLowerCase();
  
  if (normalized.startsWith('fg-')) {
    normalized = normalized.substring(3);
  }
  
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

// Create the Set exactly like Products.tsx
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

// Test exact problem IDs
const problemIds = ['krt02722', 'krt04173', 'krt04072'];
console.log('\n🔍 Exact Matching Test:');

problemIds.forEach(testId => {
  const found = bomProductIdsSet.has(testId);
  console.log(`\n${testId.toUpperCase()}:`);
  console.log(`  • bomProductIdsSet.has('${testId}'): ${found}`);
  
  // Find the raw BOM item
  const rawBomItem = bomItems.find(b => {
    const rawId = (b.product_id || '').toString().trim();
    return rawId.toLowerCase() === testId || rawId.toUpperCase() === testId.toUpperCase();
  });
  
  if (rawBomItem) {
    console.log(`  • Raw BOM item found:`, rawBomItem.product_id);
    const normalized = normalizeBomId(rawBomItem.product_id);
    console.log(`  • Normalized to: '${normalized}'`);
    console.log(`  • Set contains normalized: ${bomProductIdsSet.has(normalized)}`);
  } else {
    console.log(`  • Raw BOM item: NOT FOUND`);
    
    // Look for similar IDs
    const similarIds = bomItems
      .map(b => b.product_id)
      .filter(id => id && id.toString().toLowerCase().includes(testId.substring(0, 6)))
      .slice(0, 3);
    
    if (similarIds.length > 0) {
      console.log(`  • Similar IDs found:`, similarIds);
    }
  }
});

// Show all IDs in the Set for manual inspection
console.log('\n📋 All IDs in bomProductIdsSet:');
const allSetIds = Array.from(bomProductIdsSet).sort();
console.log('Total unique IDs:', allSetIds.length);
console.log('All IDs:', allSetIds);

// Look for IDs that contain our problem numbers
console.log('\n🔍 IDs containing problem numbers:');
problemIds.forEach(problemId => {
  const number = problemId.replace('krt', '');
  const containing = allSetIds.filter(id => id.includes(number));
  console.log(`IDs containing '${number}':`, containing);
});

// Check if the issue is case sensitivity or exact string matching
console.log('\n🧪 Case Sensitivity Test:');
const testCases = [
  'KRT02722', 'krt02722', 'Krt02722',
  'KRT04173', 'krt04173', 'Krt04173',
  'KRT04072', 'krt04072', 'Krt04072'
];

testCases.forEach(testCase => {
  const normalized = normalizeBomId(testCase);
  const found = bomProductIdsSet.has(normalized);
  console.log(`'${testCase}' → '${normalized}' → ${found ? '✅' : '❌'}`);
});

console.log('\n🎯 CONCLUSION:');
console.log('If KRT04072 works but KRT02722 and KRT04173 don\'t,');
console.log('the issue is likely in the BOM data itself, not the filter logic.');
console.log('Check if those specific IDs exist in the raw BOM data.');