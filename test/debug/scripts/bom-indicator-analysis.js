// Analyze why only one product shows BOM indicator despite 71 BOM items
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing BOM Indicator Display Issue...\n');

// Read local data files
const localBomPath = path.join(__dirname, '../data/localStorage/bom.json');
const localProductsPath = path.join(__dirname, '../data/localStorage/products.json');

try {
  // Read local data
  const localBomWrapper = JSON.parse(fs.readFileSync(localBomPath, 'utf8'));
  const localProductsWrapper = JSON.parse(fs.readFileSync(localProductsPath, 'utf8'));
  
  const localBomData = localBomWrapper.value || [];
  const localProductsData = localProductsWrapper.value || [];
  
  console.log(`📊 Local Data Status:`);
  console.log(`   BOM entries: ${localBomData.length}`);
  console.log(`   Products: ${localProductsData.length}`);
  
  // Find the product that shows BOM indicator (product ID "321")
  const testProduct = localProductsData.find(p => p.product_id === '321');
  console.log(`\n🔍 Test Product (ID: 321):`);
  console.log(`   Name: ${testProduct ? testProduct.nama : 'NOT FOUND'}`);
  
  // Check if this product has BOM in local data
  const hasLocalBOM = localBomData.some(bom => 
    bom && bom.product_id && 
    bom.product_id.toString().trim() === '321'
  );
  console.log(`   Has Local BOM: ${hasLocalBOM ? '✅ YES' : '❌ NO'}`);
  
  // Check what BOM entries exist for this product
  if (hasLocalBOM) {
    const matchingBOM = localBomData.filter(bom => 
      bom && bom.product_id && 
      bom.product_id.toString().trim() === '321'
    );
    console.log(`   Matching BOM entries: ${matchingBOM.length}`);
    matchingBOM.forEach(bom => {
      console.log(`     - Material: ${bom.material_id}, Ratio: ${bom.ratio}`);
    });
  }
  
  // Analyze the BOM data structure
  console.log(`\n🔍 BOM Data Analysis:`);
  
  // Count unique product IDs in BOM
  const bomProductIds = new Set();
  localBomData.forEach(bom => {
    if (bom && bom.product_id) {
      bomProductIds.add(bom.product_id.toString().trim().toLowerCase());
    }
  });
  
  console.log(`   Unique product IDs in BOM: ${bomProductIds.size}`);
  
  // Check if target products are in BOM
  const targetProducts = ['FG-CTM-00001', 'KRT04072', 'KRT04173', 'KRT00199'];
  
  console.log(`\n🔍 Target Products BOM Status:`);
  targetProducts.forEach(productId => {
    const hasBOM = localBomData.some(bom => 
      bom && bom.product_id && 
      bom.product_id.toString().trim().toLowerCase() === productId.toLowerCase()
    );
    
    // Also check in products data
    const productExists = localProductsData.some(p => 
      p.product_id && p.product_id.toString().trim() === productId
    );
    
    console.log(`Product ${productId}:`);
    console.log(`   Exists in products: ${productExists ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has BOM entry: ${hasBOM ? '✅ YES' : '❌ NO'}`);
  });
  
  // Check for data inconsistencies
  console.log(`\n🔍 Data Consistency Check:`);
  
  // Find BOM entries that don't correspond to any product
  const orphanedBOM = localBomData.filter(bom => {
    if (!bom || !bom.product_id) return false;
    const productId = bom.product_id.toString().trim();
    return !localProductsData.some(p => 
      p.product_id && p.product_id.toString().trim() === productId
    );
  });
  
  console.log(`   Orphaned BOM entries (no matching product): ${orphanedBOM.length}`);
  
  if (orphanedBOM.length > 0) {
    console.log('   Sample orphaned BOM product IDs:');
    orphanedBOM.slice(0, 5).forEach(bom => {
      console.log(`     - ${bom.product_id}`);
    });
  }
  
  // Check for duplicate BOM entries
  const bomIdCounts = {};
  localBomData.forEach(bom => {
    if (bom && bom.product_id) {
      const pid = bom.product_id.toString().trim();
      bomIdCounts[pid] = (bomIdCounts[pid] || 0) + 1;
    }
  });
  
  const duplicates = Object.entries(bomIdCounts).filter(([, count]) => count > 1);
  console.log(`   Product IDs with multiple BOM entries: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('   Top duplicates:');
    duplicates.slice(0, 3).forEach(([productId, count]) => {
      console.log(`     - ${productId}: ${count} entries`);
    });
  }
  
  console.log('\n💡 Root Cause Analysis:');
  console.log('The issue appears to be data inconsistency between:');
  console.log('1. Local BOM data (164 items) vs what we expect (71 items)');
  console.log('2. Possible duplicate or orphaned BOM entries');
  console.log('3. The React component might be using stale cached data');
  
  console.log('\n🔧 Recommended Solutions:');
  console.log('1. Clear browser cache and do hard refresh (Ctrl+Shift+R)');
  console.log('2. Check if there are duplicate BOM entries that need cleanup');
  console.log('3. Verify the BOM data synchronization between local and server');
  
} catch (error) {
  console.error('❌ Error during analysis:', error.message);
}