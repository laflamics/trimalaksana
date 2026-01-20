#!/usr/bin/env node

/**
 * Debug Format Mismatch
 * 
 * Script untuk mengecek format mismatch antara table list dan string comparison
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debug Format Mismatch...\n');

// Read data files
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
const productsPath = path.join(__dirname, 'data/localStorage/products.json');

const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const bomItems = bomData.value || [];
const products = productsData.value || [];

console.log('📊 Format Analysis:');

// Analyze BOM product_id formats
console.log('\n🔍 BOM product_id formats:');
const bomFormats = new Map();
bomItems.slice(0, 10).forEach((item, index) => {
  const productId = item.product_id;
  const type = typeof productId;
  const value = JSON.stringify(productId);
  const length = String(productId).length;
  
  console.log(`${index + 1}. ${value} (type: ${type}, length: ${length})`);
  
  const key = `${type}-${length}`;
  bomFormats.set(key, (bomFormats.get(key) || 0) + 1);
});

console.log('\nBOM format summary:');
bomFormats.forEach((count, format) => {
  console.log(`• ${format}: ${count} items`);
});

// Analyze Products product_id formats
console.log('\n🔍 Products product_id formats:');
const productFormats = new Map();
products.slice(0, 10).forEach((product, index) => {
  const productId = product.product_id;
  const type = typeof productId;
  const value = JSON.stringify(productId);
  const length = String(productId || '').length;
  
  console.log(`${index + 1}. ${value} (type: ${type}, length: ${length})`);
  
  const key = `${type}-${length}`;
  productFormats.set(key, (productFormats.get(key) || 0) + 1);
});

console.log('\nProducts format summary:');
productFormats.forEach((count, format) => {
  console.log(`• ${format}: ${count} items`);
});

// Test string comparison issues
console.log('\n🧪 String Comparison Tests:');

// Get first matching pair
const firstBomId = bomItems[0].product_id;
const matchingProduct = products.find(p => p.product_id === firstBomId);

if (matchingProduct) {
  const bomId = firstBomId;
  const productId = matchingProduct.product_id;
  
  console.log('Testing with first matching pair:');
  console.log(`• BOM ID: ${JSON.stringify(bomId)} (${typeof bomId})`);
  console.log(`• Product ID: ${JSON.stringify(productId)} (${typeof productId})`);
  
  // Test different comparison methods
  console.log('\nComparison tests:');
  console.log(`• Strict equality (===): ${bomId === productId}`);
  console.log(`• Loose equality (==): ${bomId == productId}`);
  console.log(`• String comparison: ${String(bomId) === String(productId)}`);
  console.log(`• Lowercase comparison: ${String(bomId).toLowerCase() === String(productId).toLowerCase()}`);
  console.log(`• Trimmed comparison: ${String(bomId).trim() === String(productId).trim()}`);
  console.log(`• Trimmed + lowercase: ${String(bomId).trim().toLowerCase() === String(productId).trim().toLowerCase()}`);
  
  // Check for hidden characters
  const bomIdStr = String(bomId);
  const productIdStr = String(productId);
  
  console.log('\nHidden character analysis:');
  console.log(`• BOM ID bytes: [${Array.from(bomIdStr).map(c => c.charCodeAt(0)).join(', ')}]`);
  console.log(`• Product ID bytes: [${Array.from(productIdStr).map(c => c.charCodeAt(0)).join(', ')}]`);
  
  if (bomIdStr !== productIdStr) {
    console.log('⚠️ String mismatch detected!');
    console.log(`• BOM: "${bomIdStr}" (length: ${bomIdStr.length})`);
    console.log(`• Product: "${productIdStr}" (length: ${productIdStr.length})`);
  }
}

// Test React hasBOM logic with different formats
console.log('\n⚛️ React hasBOM Logic Test:');

// Simulate current React logic (from debug logs)
const bomProductIdsSet = new Set();
bomItems.forEach(b => {
  if (b) {
    const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
    if (bomProductId) {
      bomProductIdsSet.add(bomProductId);
    }
  }
});

const hasBOM = (product) => {
  const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
  if (!productId) return false;
  return bomProductIdsSet.has(productId);
};

// Test with first 5 products
console.log('Testing hasBOM with first 5 products:');
products.slice(0, 5).forEach((product, index) => {
  const productId = product.product_id || product.padCode || product.kode || '';
  const normalizedProductId = String(productId).trim().toLowerCase();
  const hasBom = hasBOM(product);
  const inSet = bomProductIdsSet.has(normalizedProductId);
  
  console.log(`${index + 1}. ${product.nama}`);
  console.log(`   Raw ID: ${JSON.stringify(productId)} (${typeof productId})`);
  console.log(`   Normalized: "${normalizedProductId}"`);
  console.log(`   In BOM Set: ${inSet}`);
  console.log(`   hasBOM Result: ${hasBom}`);
  console.log('');
});

// Check for potential issues
console.log('🔍 Potential Issues:');

// Check for null/undefined values
const bomNullIds = bomItems.filter(b => !b.product_id).length;
const productNullIds = products.filter(p => !p.product_id && !p.padCode && !p.kode).length;

console.log(`• BOM items with null/undefined product_id: ${bomNullIds}`);
console.log(`• Products with null/undefined IDs: ${productNullIds}`);

// Check for type mismatches
const bomTypes = new Set(bomItems.map(b => typeof b.product_id));
const productTypes = new Set(products.map(p => typeof p.product_id));

console.log(`• BOM product_id types: ${Array.from(bomTypes).join(', ')}`);
console.log(`• Product product_id types: ${Array.from(productTypes).join(', ')}`);

// Check for whitespace issues
const bomWithWhitespace = bomItems.filter(b => 
  b.product_id && String(b.product_id) !== String(b.product_id).trim()
).length;

const productsWithWhitespace = products.filter(p => 
  p.product_id && String(p.product_id) !== String(p.product_id).trim()
).length;

console.log(`• BOM IDs with whitespace: ${bomWithWhitespace}`);
console.log(`• Product IDs with whitespace: ${productsWithWhitespace}`);

// Generate fix suggestions
console.log('\n💡 Fix Suggestions:');

if (bomTypes.has('number') || productTypes.has('number')) {
  console.log('• Convert all IDs to strings before comparison');
}

if (bomWithWhitespace > 0 || productsWithWhitespace > 0) {
  console.log('• Trim whitespace from all IDs');
}

if (bomTypes.size > 1 || productTypes.size > 1) {
  console.log('• Normalize data types (all strings)');
}

console.log('• Use consistent toLowerCase() for case-insensitive comparison');
console.log('• Add null/undefined checks before comparison');

console.log('\n✅ Format analysis complete!');