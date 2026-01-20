#!/usr/bin/env node

/**
 * Debug Product ID Mismatch
 * 
 * Script untuk mengecek apakah ada mismatch antara product_id di BOM vs Products
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debug Product ID Mismatch...\n');

// Read data files
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
const productsPath = path.join(__dirname, 'data/localStorage/products.json');

if (!fs.existsSync(bomPath) || !fs.existsSync(productsPath)) {
  console.log('❌ Required files not found');
  process.exit(1);
}

const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const bomItems = bomData.value || [];
const products = productsData.value || [];

console.log('📊 Data Summary:');
console.log(`• BOM items: ${bomItems.length}`);
console.log(`• Products: ${products.length}`);

// Extract product IDs from BOM
const bomProductIds = new Set();
bomItems.forEach(item => {
  if (item.product_id) {
    bomProductIds.add(item.product_id);
  }
});

console.log(`• Unique BOM product IDs: ${bomProductIds.size}`);

// Extract product IDs from Products
const productIds = new Set();
const productIdMap = new Map(); // For detailed analysis
products.forEach(product => {
  const id = product.product_id || product.padCode || product.kode;
  if (id) {
    productIds.add(id);
    productIdMap.set(id, {
      nama: product.nama,
      product_id: product.product_id,
      padCode: product.padCode,
      kode: product.kode
    });
  }
});

console.log(`• Unique product IDs: ${productIds.size}`);

// Check for exact matches
const exactMatches = Array.from(bomProductIds).filter(id => productIds.has(id));
console.log(`• Exact matches: ${exactMatches.length}/${bomProductIds.size}`);

// Check for mismatches
const mismatches = Array.from(bomProductIds).filter(id => !productIds.has(id));

console.log('\n🔍 Analysis Results:');

if (exactMatches.length === bomProductIds.size) {
  console.log('✅ All BOM product IDs have exact matches in Products');
  console.log('✅ No product ID mismatch detected');
  
  // Show some examples
  console.log('\n📋 Sample matches:');
  exactMatches.slice(0, 10).forEach((id, index) => {
    const product = productIdMap.get(id);
    const bomCount = bomItems.filter(item => item.product_id === id).length;
    console.log(`${index + 1}. ${id} → ${product.nama} (${bomCount} BOM items)`);
  });
  
} else {
  console.log(`❌ Found ${mismatches.length} mismatched BOM product IDs`);
  
  console.log('\n🔍 Mismatched BOM Product IDs:');
  mismatches.forEach((bomId, index) => {
    console.log(`${index + 1}. BOM: "${bomId}"`);
    
    // Try to find similar product IDs (case insensitive)
    const bomIdLower = bomId.toLowerCase();
    const similarProducts = products.filter(p => {
      const pId = (p.product_id || p.padCode || p.kode || '').toLowerCase();
      return pId === bomIdLower || 
             pId.includes(bomIdLower) || 
             bomIdLower.includes(pId);
    });
    
    if (similarProducts.length > 0) {
      console.log(`   Possible matches:`);
      similarProducts.forEach(p => {
        const pId = p.product_id || p.padCode || p.kode;
        console.log(`   - Product: "${pId}" → ${p.nama}`);
      });
    } else {
      console.log(`   No similar products found`);
    }
  });
}

// Check for case sensitivity issues
console.log('\n🔤 Case Sensitivity Check:');
const bomProductIdsLower = new Set(Array.from(bomProductIds).map(id => id.toLowerCase()));
const productIdsLower = new Set(Array.from(productIds).map(id => id.toLowerCase()));

const caseInsensitiveMatches = Array.from(bomProductIdsLower).filter(id => 
  productIdsLower.has(id)
).length;

console.log(`• Case-insensitive matches: ${caseInsensitiveMatches}/${bomProductIds.size}`);

if (caseInsensitiveMatches > exactMatches.length) {
  console.log('⚠️ Case sensitivity issue detected!');
  
  // Find case mismatches
  Array.from(bomProductIds).forEach(bomId => {
    if (!productIds.has(bomId)) {
      const bomIdLower = bomId.toLowerCase();
      const matchingProduct = products.find(p => {
        const pId = (p.product_id || p.padCode || p.kode || '').toLowerCase();
        return pId === bomIdLower;
      });
      
      if (matchingProduct) {
        const actualId = matchingProduct.product_id || matchingProduct.padCode || matchingProduct.kode;
        console.log(`  Case mismatch: BOM "${bomId}" vs Product "${actualId}"`);
      }
    }
  });
}

// Check hasBOM logic simulation
console.log('\n🧪 Simulate hasBOM Logic:');

// Create bomProductIdsSet like in React (lowercase)
const bomProductIdsSet = new Set();
bomItems.forEach(b => {
  if (b && b.product_id) {
    bomProductIdsSet.add(b.product_id.toLowerCase());
  }
});

// Test hasBOM function
const hasBOM = (product) => {
  const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
  if (!productId) return false;
  return bomProductIdsSet.has(productId);
};

// Test first 10 products
console.log('Testing first 10 products:');
products.slice(0, 10).forEach((product, index) => {
  const productId = product.product_id || product.padCode || product.kode || '';
  const hasBom = hasBOM(product);
  const bomCount = bomItems.filter(item => 
    item.product_id && item.product_id.toLowerCase() === productId.toLowerCase()
  ).length;
  
  console.log(`${index + 1}. ${product.nama}`);
  console.log(`   ID: "${productId}"`);
  console.log(`   Has BOM: ${hasBom ? '✅ YES' : '❌ NO'}`);
  console.log(`   BOM Count: ${bomCount}`);
  console.log('');
});

// Summary
const productsWithBOM = products.filter(hasBOM);
console.log(`📊 Summary: ${productsWithBOM.length} products should show BOM indicators`);

console.log('\n💡 DIAGNOSIS:');
if (exactMatches.length === bomProductIds.size) {
  console.log('✅ Product ID matching is correct');
  console.log('🔍 Problem likely in React state or rendering');
} else {
  console.log('❌ Product ID mismatch detected');
  console.log('🔧 Need to fix product ID consistency');
}

console.log('\n✅ Debug complete!');