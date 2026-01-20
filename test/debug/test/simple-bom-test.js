// Simple BOM Test - Focus on Reading Logic
console.log('🧪 Simple BOM Test...');

// Get BOM data
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

console.log('📊 BOM Items:', bomItems.length);

// Simple test: Find exact IDs in raw data
const problemIds = ['KRT02722', 'KRT04173', 'KRT04072'];
console.log('\n🔍 Raw Data Search:');

problemIds.forEach(id => {
  const found = bomItems.find(item => item.product_id === id);
  console.log(`${id}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (found) {
    console.log(`  Item:`, found);
  }
});

// Test simple Set creation (no normalization)
console.log('\n🧪 Simple Set Test (no normalization):');
const simpleSet = new Set();
bomItems.forEach(item => {
  if (item && item.product_id) {
    simpleSet.add(item.product_id.toLowerCase());
  }
});

console.log('Simple Set size:', simpleSet.size);
problemIds.forEach(id => {
  const found = simpleSet.has(id.toLowerCase());
  console.log(`${id}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});

// Test the exact normalization from Products.tsx
console.log('\n🧪 Normalization Test:');
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

problemIds.forEach(id => {
  const normalized = normalizeBomId(id);
  console.log(`${id} → ${normalized}`);
});

// Test normalized Set
console.log('\n🧪 Normalized Set Test:');
const normalizedSet = new Set();
bomItems.forEach(item => {
  if (item && item.product_id) {
    const normalized = normalizeBomId(item.product_id);
    if (normalized) {
      normalizedSet.add(normalized);
    }
  }
});

console.log('Normalized Set size:', normalizedSet.size);
problemIds.forEach(id => {
  const normalized = normalizeBomId(id);
  const found = normalizedSet.has(normalized);
  console.log(`${id} → ${normalized} → ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});

// Show all normalized IDs for manual check
console.log('\n📋 All Normalized IDs:');
const allNormalized = Array.from(normalizedSet).sort();
console.log('Count:', allNormalized.length);
console.log('IDs:', allNormalized);

// Check if the problem IDs are in the list
console.log('\n🎯 Manual Check:');
const targetIds = ['krt02722', 'krt04173', 'krt04072'];
targetIds.forEach(target => {
  const exists = allNormalized.includes(target);
  console.log(`"${target}" in list: ${exists ? '✅ YES' : '❌ NO'}`);
  
  if (!exists) {
    // Look for similar
    const similar = allNormalized.filter(id => id.includes(target.substring(3, 8)));
    console.log(`  Similar: ${similar.length > 0 ? similar : 'none'}`);
  }
});