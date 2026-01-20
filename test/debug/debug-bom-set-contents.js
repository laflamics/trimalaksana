#!/usr/bin/env node

/**
 * Debug BOM Set Contents
 * 
 * Script untuk debug isi bomProductIdsSet yang bermasalah
 * Issue: bomSetSize: 139 (terlalu banyak), hasBOM: false untuk produk yang seharusnya ada
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debug BOM Set Contents...\n');

// Read all possible BOM files
const dataDir = path.join(__dirname, 'data/localStorage');
const bomFiles = [
  'bom.json',
  'general-trading/bom.json', 
  'trucking/bom.json'
];

let allBomData = [];

console.log('📁 Reading all BOM files:');
bomFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items = data.value || [];
      console.log(`✅ ${file}: ${items.length} items`);
      allBomData = allBomData.concat(items.map(item => ({...item, source: file})));
    } catch (error) {
      console.log(`❌ ${file}: Error - ${error.message}`);
    }
  } else {
    console.log(`⚠️ ${file}: Not found`);
  }
});

console.log(`\n📊 Total BOM items from all files: ${allBomData.length}`);

// Simulate React bomProductIdsSet creation
console.log('\n🔄 Simulating React bomProductIdsSet creation:');
const bomProductIdsSet = new Set();
const bomProductIdsDetails = new Map(); // Track details for debugging

allBomData.forEach((b, index) => {
  if (b) {
    const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
    if (bomProductId) {
      bomProductIdsSet.add(bomProductId);
      
      // Track details
      if (!bomProductIdsDetails.has(bomProductId)) {
        bomProductIdsDetails.set(bomProductId, []);
      }
      bomProductIdsDetails.get(bomProductId).push({
        source: b.source,
        originalId: b.product_id,
        materialId: b.material_id,
        index: index
      });
    }
  }
});

console.log(`✅ bomProductIdsSet size: ${bomProductIdsSet.size}`);
console.log(`📋 Expected size: ~53 (from main bom.json)`);

if (bomProductIdsSet.size > 100) {
  console.log('⚠️ BOM set size is too large! Investigating...');
}

// Check for problematic product IDs
const problemProducts = ['krt04173', 'krt02722', 'krt04072'];
console.log('\n🔍 Checking problem products:');

problemProducts.forEach(productId => {
  const inSet = bomProductIdsSet.has(productId);
  const details = bomProductIdsDetails.get(productId);
  
  console.log(`\n• ${productId.toUpperCase()}:`);
  console.log(`  In BOM Set: ${inSet ? '✅ YES' : '❌ NO'}`);
  
  if (details) {
    console.log(`  Found in ${details.length} BOM entries:`);
    details.forEach((detail, idx) => {
      console.log(`    ${idx + 1}. Source: ${detail.source}, Material: ${detail.materialId}`);
    });
  } else {
    console.log(`  ❌ Not found in any BOM file`);
  }
});

// Show all BOM product IDs (first 20)
console.log('\n📋 All BOM Product IDs (first 20):');
const allIds = Array.from(bomProductIdsSet).sort();
allIds.slice(0, 20).forEach((id, index) => {
  const details = bomProductIdsDetails.get(id);
  const sources = details ? [...new Set(details.map(d => d.source))].join(', ') : 'unknown';
  console.log(`${index + 1}. ${id} (from: ${sources})`);
});

if (allIds.length > 20) {
  console.log(`... and ${allIds.length - 20} more`);
}

// Check for duplicates across files
console.log('\n🔍 Checking for duplicates across files:');
const duplicates = new Map();

bomProductIdsDetails.forEach((details, productId) => {
  if (details.length > 1) {
    const sources = details.map(d => d.source);
    const uniqueSources = [...new Set(sources)];
    if (uniqueSources.length > 1) {
      duplicates.set(productId, {
        count: details.length,
        sources: uniqueSources,
        details: details
      });
    }
  }
});

if (duplicates.size > 0) {
  console.log(`⚠️ Found ${duplicates.size} products with BOM data in multiple files:`);
  Array.from(duplicates.entries()).slice(0, 10).forEach(([productId, info]) => {
    console.log(`• ${productId}: ${info.count} entries across ${info.sources.join(', ')}`);
  });
} else {
  console.log('✅ No duplicates found across files');
}

// Check for invalid product IDs
console.log('\n🔍 Checking for invalid product IDs:');
const invalidIds = [];
const validPattern = /^[A-Z]{3}\d{5}$/; // Expected pattern like KRT04173

allIds.forEach(id => {
  if (!validPattern.test(id.toUpperCase())) {
    invalidIds.push(id);
  }
});

if (invalidIds.length > 0) {
  console.log(`⚠️ Found ${invalidIds.length} invalid product IDs:`);
  invalidIds.slice(0, 10).forEach(id => {
    const details = bomProductIdsDetails.get(id);
    const sources = details ? details.map(d => d.source).join(', ') : 'unknown';
    console.log(`• "${id}" (from: ${sources})`);
  });
} else {
  console.log('✅ All product IDs follow expected pattern');
}

// Generate browser debug script
console.log('\n🧪 Browser Debug Script:');
console.log('Copy and paste this in browser console:\n');

console.log(`// Debug BOM Set Contents
const bomFromStorage = localStorage.getItem('bom');
if (bomFromStorage) {
  const parsed = JSON.parse(bomFromStorage);
  const bomItems = parsed.value || [];
  
  console.log('BOM items from localStorage:', bomItems.length);
  
  // Recreate bomProductIdsSet
  const bomProductIdsSet = new Set();
  bomItems.forEach(b => {
    if (b) {
      const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
      if (bomProductId) {
        bomProductIdsSet.add(bomProductId);
      }
    }
  });
  
  console.log('BOM Product IDs Set size:', bomProductIdsSet.size);
  console.log('BOM Product IDs (first 10):', Array.from(bomProductIdsSet).slice(0, 10));
  
  // Check problem products
  const problemProducts = ['krt04173', 'krt02722', 'krt04072'];
  problemProducts.forEach(id => {
    console.log(\`Product \${id}: \${bomProductIdsSet.has(id) ? 'Found' : 'NOT FOUND'}\`);
  });
  
  // Check for invalid IDs
  const allIds = Array.from(bomProductIdsSet);
  const invalidIds = allIds.filter(id => !/^[a-z]{3}\\d{5}$/.test(id));
  if (invalidIds.length > 0) {
    console.log('Invalid product IDs found:', invalidIds.slice(0, 10));
  }
} else {
  console.log('No BOM data in localStorage');
}`);

console.log('\n💡 DIAGNOSIS:');
if (bomProductIdsSet.size > 100) {
  console.log('❌ BOM set is too large - likely contains invalid or duplicate data');
  console.log('🔧 Need to clean up BOM data files');
} else {
  console.log('✅ BOM set size looks normal');
}

if (duplicates.size > 0) {
  console.log('⚠️ Multiple BOM files contain overlapping data');
  console.log('🔧 Consider consolidating BOM data to single source');
}

if (invalidIds.length > 0) {
  console.log('❌ Invalid product IDs found in BOM data');
  console.log('🔧 Need to clean up invalid entries');
}

console.log('\n✅ Debug complete!');