#!/usr/bin/env node

/**
 * Debug BOM React State Issue
 * 
 * Script untuk menganalisis masalah BOM di React state dan rendering
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging BOM React State Issue...\n');

// 1. Analyze BOM data structure
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

// 2. Create bomProductIdsSet like in React code
const bomProductIdsSet = new Set();
bomItems.forEach(b => {
  if (b) {
    const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
    if (bomProductId) {
      bomProductIdsSet.add(bomProductId);
    }
  }
});

console.log(`• Unique BOM product IDs: ${bomProductIdsSet.size}`);
console.log('• BOM product IDs:', Array.from(bomProductIdsSet).slice(0, 10));

// 3. Test hasBOM function logic
const hasBOM = (product) => {
  const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
  if (!productId) return false;
  return bomProductIdsSet.has(productId);
};

// 4. Test products with BOM
const productsWithBOM = products.filter(hasBOM);
console.log(`\n✅ Products that should show BOM indicator: ${productsWithBOM.length}`);

// 5. Show first 10 products with their BOM status
console.log('\n📋 First 10 products BOM status:');
products.slice(0, 10).forEach((product, index) => {
  const productId = product.product_id || product.padCode || product.kode || '';
  const hasBom = hasBOM(product);
  const bomCount = bomItems.filter(item => item.product_id === productId).length;
  
  console.log(`${index + 1}. ${product.nama}`);
  console.log(`   ID: ${productId}`);
  console.log(`   Has BOM: ${hasBom ? '✅ YES' : '❌ NO'}`);
  console.log(`   BOM Count: ${bomCount}`);
  console.log('');
});

// 6. Check for potential issues
console.log('🔍 Potential Issues Analysis:');

// Check for case sensitivity issues
const bomProductIdsOriginal = new Set();
bomItems.forEach(b => {
  if (b && b.product_id) {
    bomProductIdsOriginal.add(b.product_id); // Original case
  }
});

const productIdsOriginal = new Set();
products.forEach(p => {
  const id = p.product_id || p.padCode || p.kode;
  if (id) {
    productIdsOriginal.add(id); // Original case
  }
});

const exactMatches = Array.from(bomProductIdsOriginal).filter(id => 
  productIdsOriginal.has(id)
);

console.log(`• Exact case matches: ${exactMatches.length}/${bomProductIdsOriginal.size}`);

if (exactMatches.length !== bomProductIdsOriginal.size) {
  console.log('⚠️ Case sensitivity issue detected!');
  
  // Show mismatched cases
  const mismatched = Array.from(bomProductIdsOriginal).filter(id => 
    !productIdsOriginal.has(id)
  );
  
  console.log('Mismatched BOM product IDs:');
  mismatched.slice(0, 5).forEach(id => {
    const lowerCase = id.toLowerCase();
    const matchingProduct = products.find(p => {
      const pId = (p.product_id || p.padCode || p.kode || '').toLowerCase();
      return pId === lowerCase;
    });
    
    if (matchingProduct) {
      const actualId = matchingProduct.product_id || matchingProduct.padCode || matchingProduct.kode;
      console.log(`  BOM: "${id}" → Product: "${actualId}"`);
    } else {
      console.log(`  BOM: "${id}" → No matching product found`);
    }
  });
}

// 7. Generate test data for browser console
console.log('\n🧪 Browser Console Test Code:');
console.log('Copy and paste this in browser console on Products page:\n');

console.log(`// Test BOM data loading
const testBomData = ${JSON.stringify(bomItems.slice(0, 5), null, 2)};

// Test bomProductIdsSet creation
const testBomProductIdsSet = new Set();
testBomData.forEach(b => {
  if (b) {
    const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
    if (bomProductId) {
      testBomProductIdsSet.add(bomProductId);
    }
  }
});

console.log('Test BOM Product IDs Set:', Array.from(testBomProductIdsSet));

// Test hasBOM function
const testHasBOM = (product) => {
  const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
  if (!productId) return false;
  return testBomProductIdsSet.has(productId);
};

// Test with first product that should have BOM
const testProduct = ${JSON.stringify(productsWithBOM[0] || products[0], null, 2)};
console.log('Test Product:', testProduct);
console.log('Test Product Has BOM:', testHasBOM(testProduct));`);

console.log('\n🔧 Debugging Steps:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Products page');
console.log('3. Paste the test code above in Console');
console.log('4. Check if bomData state is populated in React DevTools');
console.log('5. Check if bomProductIdsSet is created correctly');
console.log('6. Verify hasBOM function returns correct values');

console.log('\n💡 Possible Solutions:');
console.log('1. Check React DevTools for bomData state');
console.log('2. Add console.log in loadProducts function');
console.log('3. Check if extractStorageValue is working correctly');
console.log('4. Verify storage service is returning correct data');
console.log('5. Check for React re-rendering issues');

console.log('\n✅ Debug analysis complete!');