/**
 * Debug Production Cost Report Data
 * 
 * This script checks what data is available on the server for the Production Cost Report
 * Run this in the browser console to see:
 * 1. How many SPK records exist
 * 2. How many BOM records exist
 * 3. How many Materials records exist
 * 4. Whether BOM items are linked to products
 * 5. Whether materials have prices set
 */

async function debugProductionCostReport() {
  console.log('🔍 Debugging Production Cost Report Data...\n');
  
  // Get storage config
  const config = JSON.parse(localStorage.getItem('storage_config') || '{}');
  console.log('📋 Storage Config:', config);
  
  if (config.type !== 'server' || !config.serverUrl) {
    console.error('❌ ERROR: Not in server mode! Please configure server URL in Settings → Server Data');
    return;
  }
  
  const serverUrl = config.serverUrl;
  console.log(`🌐 Server URL: ${serverUrl}\n`);
  
  // Helper function to fetch data from server
  async function fetchFromServer(key) {
    try {
      const response = await fetch(`${serverUrl}/api/storage/${encodeURIComponent(key)}`);
      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch ${key}: ${response.statusText}`);
        return null;
      }
      const data = await response.json();
      const value = data.value !== undefined ? data.value : data;
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error(`❌ Error fetching ${key}:`, error);
      return null;
    }
  }
  
  // Fetch all required data
  console.log('📥 Fetching data from server...\n');
  
  const spkData = await fetchFromServer('spk');
  const bomData = await fetchFromServer('bom');
  const materialsData = await fetchFromServer('materials');
  const productsData = await fetchFromServer('products');
  
  console.log('📊 Data Summary:');
  console.log(`  SPK Records: ${spkData?.length || 0}`);
  console.log(`  BOM Records: ${bomData?.length || 0}`);
  console.log(`  Materials Records: ${materialsData?.length || 0}`);
  console.log(`  Products Records: ${productsData?.length || 0}\n`);
  
  // Check if data exists
  if (!spkData || spkData.length === 0) {
    console.error('❌ CRITICAL: No SPK data found on server!');
    return;
  }
  
  if (!bomData || bomData.length === 0) {
    console.error('❌ CRITICAL: No BOM data found on server!');
    console.log('   → You need to populate BOM data in the system');
    return;
  }
  
  if (!materialsData || materialsData.length === 0) {
    console.error('❌ CRITICAL: No Materials data found on server!');
    console.log('   → You need to import materials master data');
    return;
  }
  
  // Analyze BOM data
  console.log('\n📋 BOM Analysis:');
  const productBomMap = new Map();
  bomData.forEach((bomItem) => {
    const productId = (bomItem.product_id || bomItem.kode || '').toString().trim().toLowerCase();
    if (!productId) return;
    if (!productBomMap.has(productId)) {
      productBomMap.set(productId, []);
    }
    productBomMap.get(productId).push(bomItem);
  });
  
  console.log(`  Unique Products with BOM: ${productBomMap.size}`);
  console.log('  Sample BOM Products:');
  let count = 0;
  productBomMap.forEach((items, productId) => {
    if (count < 3) {
      console.log(`    - ${productId}: ${items.length} materials`);
      items.slice(0, 2).forEach((item) => {
        console.log(`      • ${item.material_id || item.kode} (ratio: ${item.ratio || item.qty})`);
      });
      count++;
    }
  });
  
  // Analyze Materials data
  console.log('\n💰 Materials Analysis:');
  const materialMap = new Map();
  let materialsWithPrice = 0;
  let materialsWithoutPrice = 0;
  
  materialsData.forEach((mat) => {
    const materialId = (mat.material_id || mat.kode || '').toString().trim();
    const price = parseFloat(mat.harga || mat.price || '0') || 0;
    materialMap.set(materialId.toLowerCase(), { name: mat.nama || mat.name, price });
    
    if (price > 0) {
      materialsWithPrice++;
    } else {
      materialsWithoutPrice++;
    }
  });
  
  console.log(`  Total Materials: ${materialsData.length}`);
  console.log(`  Materials with Price: ${materialsWithPrice}`);
  console.log(`  Materials without Price: ${materialsWithoutPrice}`);
  console.log('  Sample Material Prices:');
  let count2 = 0;
  materialsData.forEach((mat) => {
    if (count2 < 5) {
      const materialId = (mat.material_id || mat.kode || '').toString().trim();
      const price = parseFloat(mat.harga || mat.price || '0') || 0;
      console.log(`    - ${materialId}: Rp ${price.toLocaleString('id-ID')}`);
      count2++;
    }
  });
  
  // Check SPK to BOM matching
  console.log('\n🔗 SPK to BOM Matching:');
  let matchedSpks = 0;
  let unmatchedSpks = 0;
  
  spkData.slice(0, 5).forEach((spk) => {
    const productKode = (spk.kode || spk.product_id || spk.productId || '').toString().trim().toLowerCase();
    const hasBom = productBomMap.has(productKode);
    
    if (hasBom) {
      matchedSpks++;
      console.log(`  ✅ SPK ${spk.spkNo}: Product ${productKode} has BOM`);
    } else {
      unmatchedSpks++;
      console.log(`  ❌ SPK ${spk.spkNo}: Product ${productKode} NOT found in BOM`);
      console.log(`     Available products: ${Array.from(productBomMap.keys()).slice(0, 3).join(', ')}`);
    }
  });
  
  console.log(`\n  Summary: ${matchedSpks} matched, ${unmatchedSpks} unmatched (out of first 5 SPKs)`);
  
  // Final diagnosis
  console.log('\n🔍 Diagnosis:');
  if (materialsWithoutPrice > 0) {
    console.warn(`⚠️ WARNING: ${materialsWithoutPrice} materials have no price set!`);
    console.log('   → Set prices for all materials in Master Data → Materials');
  }
  
  if (unmatchedSpks > 0) {
    console.error(`❌ ERROR: SPK products don't match BOM products!`);
    console.log('   → Check that product codes in SPK match product codes in BOM');
    console.log('   → Product codes must be identical (case-insensitive)');
  }
  
  if (matchedSpks > 0 && materialsWithPrice > 0) {
    console.log('✅ Data looks good! The report should calculate material costs correctly.');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. If BOM is missing: Create BOM entries in Master Data → Products');
  console.log('2. If Materials are missing: Import materials in Master Data → Materials');
  console.log('3. If prices are missing: Set prices for all materials');
  console.log('4. If product codes don\'t match: Ensure SPK and BOM use same product codes');
  console.log('5. Run the Production Cost Report again');
}

// Run the debug function
debugProductionCostReport().catch(console.error);
