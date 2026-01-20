#!/usr/bin/env node

/**
 * Force BOM Reload Fix
 * 
 * Script untuk memaksa reload BOM data dengan cara yang sama seperti saat edit manual
 * Masalah: Initial load tidak membaca BOM, tapi edit manual langsung kebaca
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Force BOM Reload Fix...\n');

// Paths
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
const productsPath = path.join(__dirname, 'data/localStorage/products.json');

if (!fs.existsSync(bomPath) || !fs.existsSync(productsPath)) {
  console.log('❌ Required files not found');
  process.exit(1);
}

// 1. Read current data
const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const bomItems = bomData.value || [];
const products = productsData.value || [];

console.log('📊 Current Data:');
console.log(`• BOM items: ${bomItems.length}`);
console.log(`• Products: ${products.length}`);

// 2. Force timestamp update on BOM data (simulate manual save)
const updatedBomData = {
  ...bomData,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  lastUpdate: new Date().toISOString(),
  forceReload: true,
  reloadReason: 'Fix BOM indicator loading issue'
};

// 3. Update each BOM item with new timestamp (simulate edit)
if (bomItems.length > 0) {
  updatedBomData.value = bomItems.map(item => ({
    ...item,
    lastUpdated: new Date().toISOString(),
    forceReload: true
  }));
}

// 4. Write back to file
fs.writeFileSync(bomPath, JSON.stringify(updatedBomData, null, 2));
console.log('✅ BOM data updated with force reload timestamps');

// 5. Also update products data to trigger reload
const updatedProductsData = {
  ...productsData,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  lastUpdate: new Date().toISOString(),
  bomReloadTrigger: true
};

fs.writeFileSync(productsPath, JSON.stringify(updatedProductsData, null, 2));
console.log('✅ Products data updated to trigger reload');

// 6. Create a trigger file for storage service
const triggerData = {
  timestamp: new Date().toISOString(),
  action: 'force-bom-reload',
  bomItemCount: bomItems.length,
  reason: 'Fix BOM indicator loading issue - simulate manual edit behavior',
  instructions: [
    'Clear browser cache (Ctrl+Shift+Delete)',
    'Hard refresh (Ctrl+F5)',
    'Check console for [Products] logs',
    'Verify BOM indicators appear'
  ]
};

const triggerPath = path.join(__dirname, 'data/localStorage/bom-reload-trigger.json');
fs.writeFileSync(triggerPath, JSON.stringify(triggerData, null, 2));
console.log('✅ Reload trigger file created');

// 7. Show products that should have BOM indicators
const bomProductIds = new Set(bomItems.map(item => item.product_id));
const productsWithBom = products.filter(p => {
  const productId = p.product_id || p.padCode || p.kode;
  return bomProductIds.has(productId);
});

console.log('\n📋 Products that should show GREEN BOM indicators:');
productsWithBom.slice(0, 10).forEach((product, index) => {
  const productId = product.product_id || product.padCode || product.kode;
  const bomCount = bomItems.filter(item => item.product_id === productId).length;
  console.log(`${index + 1}. ${product.nama} (${productId}) - ${bomCount} BOM items`);
});

console.log(`\n📊 Total: ${productsWithBom.length} products should show green dots`);

console.log('\n🚀 NEXT STEPS:');
console.log('1. 🌐 Open browser');
console.log('2. 🧹 Clear cache: Ctrl+Shift+Delete → Clear cached images and files');
console.log('3. 🔄 Hard refresh: Ctrl+F5 or Ctrl+Shift+R');
console.log('4. 📱 Navigate to Master > Products');
console.log('5. 👀 Check BOM column for green/orange dots');
console.log('6. 🔍 Open DevTools (F12) and check console for [Products] logs');

console.log('\n💡 EXPECTED RESULT:');
console.log('• Console should show: [Products] 📊 Loaded data: {bomItems: 62}');
console.log('• Console should show: [Products] ✅ bomProductIdsSet created: {size: 53}');
console.log('• BOM column should show green dots for products with BOM');
console.log('• First 10 products should mostly show green dots');

console.log('\n🔧 IF STILL NOT WORKING:');
console.log('• Check browser console for errors');
console.log('• Verify localStorage contains BOM data');
console.log('• Test manual BOM edit (should work immediately)');
console.log('• Check if extractStorageValue function works correctly');

console.log('\n✅ Force reload fix applied!');