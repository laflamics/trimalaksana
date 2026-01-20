#!/usr/bin/env node

/**
 * Force BOM Cache Refresh
 * 
 * Script untuk memaksa refresh cache BOM dan memastikan UI dapat membaca data BOM
 */

const fs = require('fs');
const path = require('path');

// Paths
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
const bomRefreshLogPath = path.join(__dirname, 'data/localStorage/bom-refresh-log.json');

console.log('🔄 Force BOM Cache Refresh...\n');

// 1. Read current BOM data
if (!fs.existsSync(bomPath)) {
  console.log('❌ BOM file not found:', bomPath);
  process.exit(1);
}

const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
const bomItems = bomData.value || [];

console.log(`📊 Current BOM items: ${bomItems.length}`);

// 2. Add a small timestamp update to force cache invalidation
const updatedBomData = {
  ...bomData,
  lastCacheRefresh: new Date().toISOString(),
  cacheVersion: Date.now()
};

// 3. Write back to file
fs.writeFileSync(bomPath, JSON.stringify(updatedBomData, null, 2));
console.log('✅ BOM file updated with cache refresh timestamp');

// 4. Update refresh log
const refreshLog = {
  timestamp: new Date().toISOString(),
  bomItemCount: bomItems.length,
  status: 'Force cache refresh completed',
  cacheVersion: updatedBomData.cacheVersion,
  nextSteps: 'Hard refresh browser (Ctrl+F5) to see updated BOM indicators',
  troubleshooting: {
    clearBrowserCache: 'Press Ctrl+Shift+Delete and clear cache',
    hardRefresh: 'Press Ctrl+F5 or Ctrl+Shift+R',
    checkDevTools: 'Open F12 and check Console for errors',
    verifyStorage: 'Check Application > Local Storage in DevTools'
  }
};

fs.writeFileSync(bomRefreshLogPath, JSON.stringify(refreshLog, null, 2));
console.log('✅ Refresh log updated');

// 5. Show products with BOM for verification
console.log('\n📋 Products with BOM data (first 10):');
const bomProductIds = new Set(bomItems.map(item => item.product_id));
const productsPath = path.join(__dirname, 'data/localStorage/products.json');

if (fs.existsSync(productsPath)) {
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const products = productsData.value || [];
  
  const productsWithBom = products.filter(p => {
    const productId = p.product_id || p.padCode || p.kode;
    return bomProductIds.has(productId);
  });
  
  productsWithBom.slice(0, 10).forEach((product, index) => {
    const productId = product.product_id || product.padCode || product.kode;
    const bomCount = bomItems.filter(item => item.product_id === productId).length;
    console.log(`${index + 1}. ${product.nama} (${productId}) - ${bomCount} BOM items`);
  });
  
  console.log(`\n📊 Total products with BOM: ${productsWithBom.length}/${products.length}`);
}

console.log('\n🚀 INSTRUCTIONS TO FIX UI:');
console.log('1. 🌐 Open your browser');
console.log('2. 🔄 Hard refresh the page (Ctrl+F5 or Ctrl+Shift+R)');
console.log('3. 🧹 If still not working, clear browser cache:');
console.log('   - Press Ctrl+Shift+Delete');
console.log('   - Select "Cached images and files"');
console.log('   - Click "Clear data"');
console.log('4. 🔍 Check browser console (F12) for any errors');
console.log('5. ✅ BOM indicators should now appear as green/orange dots');

console.log('\n💡 EXPECTED RESULT:');
console.log('• Green dot (●) = Product has BOM');
console.log('• Orange dot (●) = Product has no BOM');
console.log(`• ${bomProductIds.size} products should show green dots`);

console.log('\n✅ Cache refresh complete!');