#!/usr/bin/env node

/**
 * Debug BOM UI Issue
 * 
 * Masalah: BOM tidak terbaca di UI meskipun ada data di bom.json
 * 
 * Analisis:
 * 1. Data BOM tersimpan di data/localStorage/bom.json (struktur relasional)
 * 2. UI membaca bomData dari storage service
 * 3. Indikator BOM menggunakan bomProductIdsSet yang dibuat dari bomData
 * 4. Kemungkinan ada masalah cache atau data loading
 */

const fs = require('fs');
const path = require('path');

// Paths
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
const productsPath = path.join(__dirname, 'data/localStorage/products.json');
const bomRefreshLogPath = path.join(__dirname, 'data/localStorage/bom-refresh-log.json');

console.log('🔍 Debugging BOM UI Issue...\n');

// 1. Check if BOM file exists and has data
console.log('1. Checking BOM file...');
if (!fs.existsSync(bomPath)) {
  console.log('❌ BOM file not found:', bomPath);
  process.exit(1);
}

const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
const bomItems = bomData.value || [];
console.log(`✅ BOM file found with ${bomItems.length} items`);

// 2. Analyze BOM data structure
console.log('\n2. Analyzing BOM data structure...');
if (bomItems.length > 0) {
  const sampleBom = bomItems[0];
  console.log('Sample BOM item:', JSON.stringify(sampleBom, null, 2));
  
  // Check for required fields
  const hasProductId = bomItems.every(item => item.product_id);
  const hasMaterialId = bomItems.every(item => item.material_id);
  const hasRatio = bomItems.every(item => typeof item.ratio === 'number');
  
  console.log(`✅ All items have product_id: ${hasProductId}`);
  console.log(`✅ All items have material_id: ${hasMaterialId}`);
  console.log(`✅ All items have ratio: ${hasRatio}`);
} else {
  console.log('⚠️ No BOM items found');
}

// 3. Check products file
console.log('\n3. Checking products file...');
if (!fs.existsSync(productsPath)) {
  console.log('❌ Products file not found:', productsPath);
  process.exit(1);
}

const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const products = productsData.value || [];
console.log(`✅ Products file found with ${products.length} products`);

// 4. Analyze product BOM arrays
console.log('\n4. Analyzing product BOM arrays...');
const productsWithBom = products.filter(p => p.bom && p.bom.length > 0);
const productsWithEmptyBom = products.filter(p => !p.bom || p.bom.length === 0);

console.log(`📊 Products with BOM array: ${productsWithBom.length}`);
console.log(`📊 Products with empty BOM array: ${productsWithEmptyBom.length}`);

if (productsWithBom.length > 0) {
  console.log('Sample product with BOM:', JSON.stringify(productsWithBom[0].bom, null, 2));
}

// 5. Cross-reference BOM data with products
console.log('\n5. Cross-referencing BOM data with products...');
const bomProductIds = new Set(bomItems.map(item => item.product_id));
const productIds = new Set(products.map(p => p.product_id || p.padCode || p.kode));

console.log(`📊 Unique product IDs in BOM: ${bomProductIds.size}`);
console.log(`📊 Unique product IDs in products: ${productIds.size}`);

// Find products that have BOM data
const productsWithBomData = products.filter(p => {
  const productId = p.product_id || p.padCode || p.kode;
  return bomProductIds.has(productId);
});

console.log(`📊 Products that should show BOM indicator: ${productsWithBomData.length}`);

// 6. Show sample products with BOM
console.log('\n6. Sample products with BOM data:');
productsWithBomData.slice(0, 5).forEach((product, index) => {
  const productId = product.product_id || product.padCode || product.kode;
  const bomCount = bomItems.filter(item => item.product_id === productId).length;
  console.log(`${index + 1}. ${product.nama} (${productId}) - ${bomCount} BOM items`);
});

// 7. Check BOM refresh log
console.log('\n7. Checking BOM refresh log...');
if (fs.existsSync(bomRefreshLogPath)) {
  const refreshLog = JSON.parse(fs.readFileSync(bomRefreshLogPath, 'utf8'));
  console.log('Last BOM refresh:', refreshLog);
} else {
  console.log('⚠️ No BOM refresh log found');
}

// 8. Generate summary and recommendations
console.log('\n📋 SUMMARY:');
console.log(`• Total BOM items: ${bomItems.length}`);
console.log(`• Total products: ${products.length}`);
console.log(`• Products with BOM data: ${productsWithBomData.length}`);
console.log(`• Products with empty BOM arrays: ${productsWithEmptyBom.length}`);

console.log('\n💡 DIAGNOSIS:');
if (bomItems.length > 0 && productsWithBomData.length > 0) {
  console.log('✅ BOM data exists and is properly structured');
  console.log('✅ Products are correctly linked to BOM data');
  
  if (productsWithEmptyBom.length === products.length) {
    console.log('⚠️ All products have empty BOM arrays - this is expected');
    console.log('   UI should read from separate bom.json file');
  }
  
  console.log('\n🔧 POSSIBLE SOLUTIONS:');
  console.log('1. Clear browser cache and refresh');
  console.log('2. Check if storage service is loading BOM data correctly');
  console.log('3. Verify bomProductIdsSet is being created properly');
  console.log('4. Check for JavaScript errors in browser console');
  
} else if (bomItems.length === 0) {
  console.log('❌ No BOM data found - BOM indicators will not show');
  console.log('   Add BOM data using the BOM dialog in the UI');
  
} else {
  console.log('❌ BOM data exists but products are not linked properly');
  console.log('   Check product_id matching between bom.json and products.json');
}

console.log('\n🚀 NEXT STEPS:');
console.log('1. Open browser developer tools');
console.log('2. Go to Products page');
console.log('3. Check console for errors');
console.log('4. Verify bomData is loaded in React DevTools');
console.log('5. Check if bomProductIdsSet contains expected product IDs');

console.log('\n✅ Debug complete!');