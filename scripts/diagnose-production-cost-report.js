/**
 * Diagnostic Script - Production Cost Report Data Check
 * 
 * This script checks what data is available on the server for the Production Cost Report
 * Run this to identify why material costs are showing as zeros
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_URL = 'http://server-tljp.tail75a421.ts.net:9999';
const STORAGE_KEYS = {
  SPK: 'spk',
  PRODUCTS: 'products',
  MATERIALS: 'materials',
  BOM: 'bom',
  SALES_ORDERS: 'salesOrders',
};

async function fetchFromServer(key) {
  try {
    const response = await fetch(`${SERVER_URL}/api/storage/${encodeURIComponent(key)}`);
    if (!response.ok) {
      console.error(`❌ Failed to fetch ${key}: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    const value = data.value !== undefined ? data.value : data;
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`❌ Error fetching ${key}:`, error.message);
    return null;
  }
}

async function diagnose() {
  console.log('🔍 Production Cost Report - Data Diagnostic');
  console.log('==========================================\n');
  console.log(`Server URL: ${SERVER_URL}\n`);

  // Fetch all required data
  console.log('📥 Fetching data from server...\n');
  
  const spkData = await fetchFromServer(STORAGE_KEYS.SPK);
  const productsData = await fetchFromServer(STORAGE_KEYS.PRODUCTS);
  const materialsData = await fetchFromServer(STORAGE_KEYS.MATERIALS);
  const bomData = await fetchFromServer(STORAGE_KEYS.BOM);
  const soData = await fetchFromServer(STORAGE_KEYS.SALES_ORDERS);

  // Report findings
  console.log('📊 Data Summary:');
  console.log(`  SPK records: ${spkData?.length || 0}`);
  console.log(`  Products: ${productsData?.length || 0}`);
  console.log(`  Materials: ${materialsData?.length || 0}`);
  console.log(`  BOM items: ${bomData?.length || 0}`);
  console.log(`  Sales Orders: ${soData?.length || 0}\n`);

  // Check for issues
  console.log('🔎 Diagnostic Checks:\n');

  // Check 1: SPK data
  if (!spkData || spkData.length === 0) {
    console.log('❌ ISSUE 1: No SPK data found on server');
    console.log('   → Need to import SPK data to PostgreSQL\n');
  } else {
    console.log(`✅ SPK data exists (${spkData.length} records)`);
    console.log(`   Sample SPK: ${spkData[0].spkNo || spkData[0].id}`);
    console.log(`   Product code: ${spkData[0].kode || spkData[0].product_id}\n`);
  }

  // Check 2: BOM data
  if (!bomData || bomData.length === 0) {
    console.log('❌ ISSUE 2: No BOM data found on server');
    console.log('   → BOM data is REQUIRED for material cost calculation');
    console.log('   → Need to import BOM data to PostgreSQL\n');
  } else {
    console.log(`✅ BOM data exists (${bomData.length} items)`);
    
    // Check if BOM items have product links
    const bomByProduct = {};
    bomData.forEach(bom => {
      const productId = (bom.product_id || bom.kode || '').toString().trim().toLowerCase();
      if (!bomByProduct[productId]) {
        bomByProduct[productId] = [];
      }
      bomByProduct[productId].push(bom);
    });
    
    console.log(`   Linked to ${Object.keys(bomByProduct).length} products`);
    console.log(`   Sample BOM item:`, {
      product_id: bomData[0].product_id || bomData[0].kode,
      material_id: bomData[0].material_id || bomData[0].materialId,
      ratio: bomData[0].ratio || bomData[0].qty,
    });
    console.log('');
  }

  // Check 3: Materials data
  if (!materialsData || materialsData.length === 0) {
    console.log('❌ ISSUE 3: No materials master data found on server');
    console.log('   → Materials master is REQUIRED for material prices');
    console.log('   → Need to import materials to PostgreSQL\n');
  } else {
    console.log(`✅ Materials master exists (${materialsData.length} items)`);
    
    // Check if materials have prices
    const materialsWithPrice = materialsData.filter(m => {
      const price = parseFloat(m.harga || m.price || '0');
      return price > 0;
    });
    
    console.log(`   Materials with prices: ${materialsWithPrice.length}/${materialsData.length}`);
    if (materialsWithPrice.length === 0) {
      console.log('   ⚠️  WARNING: No materials have prices set!');
    }
    console.log(`   Sample material:`, {
      material_id: materialsData[0].material_id || materialsData[0].kode,
      nama: materialsData[0].nama || materialsData[0].name,
      harga: materialsData[0].harga || materialsData[0].price,
    });
    console.log('');
  }

  // Check 4: Product-BOM linkage
  if (spkData && spkData.length > 0 && bomData && bomData.length > 0) {
    console.log('🔗 Product-BOM Linkage Check:\n');
    
    const bomByProduct = {};
    bomData.forEach(bom => {
      const productId = (bom.product_id || bom.kode || '').toString().trim().toLowerCase();
      if (!bomByProduct[productId]) {
        bomByProduct[productId] = [];
      }
      bomByProduct[productId].push(bom);
    });

    let linkedCount = 0;
    let unlinkedCount = 0;
    
    spkData.slice(0, 5).forEach(spk => {
      const productKode = (spk.kode || spk.product_id || '').toString().trim().toLowerCase();
      const hasBOM = bomByProduct[productKode] && bomByProduct[productKode].length > 0;
      
      if (hasBOM) {
        linkedCount++;
        console.log(`   ✅ SPK ${spk.spkNo}: Product ${productKode} has ${bomByProduct[productKode].length} BOM items`);
      } else {
        unlinkedCount++;
        console.log(`   ❌ SPK ${spk.spkNo}: Product ${productKode} has NO BOM items`);
      }
    });
    
    console.log(`\n   Summary: ${linkedCount} linked, ${unlinkedCount} unlinked (from first 5 SPK)\n`);
  }

  // Check 5: Material-Price linkage
  if (bomData && bomData.length > 0 && materialsData && materialsData.length > 0) {
    console.log('💰 Material-Price Linkage Check:\n');
    
    const materialMap = {};
    materialsData.forEach(mat => {
      const materialId = (mat.material_id || mat.kode || '').toString().trim().toLowerCase();
      materialMap[materialId] = {
        name: mat.nama || mat.name,
        price: parseFloat(mat.harga || mat.price || '0'),
      };
    });

    let linkedCount = 0;
    let unlinkedCount = 0;
    let zeroPriceCount = 0;
    
    bomData.slice(0, 5).forEach(bom => {
      const materialId = (bom.material_id || bom.materialId || bom.kode || '').toString().trim().toLowerCase();
      const material = materialMap[materialId];
      
      if (material) {
        linkedCount++;
        if (material.price > 0) {
          console.log(`   ✅ BOM material ${materialId}: Found with price ${material.price}`);
        } else {
          zeroPriceCount++;
          console.log(`   ⚠️  BOM material ${materialId}: Found but price is 0`);
        }
      } else {
        unlinkedCount++;
        console.log(`   ❌ BOM material ${materialId}: NOT found in materials master`);
      }
    });
    
    console.log(`\n   Summary: ${linkedCount} linked, ${unlinkedCount} unlinked, ${zeroPriceCount} zero-price (from first 5 BOM items)\n`);
  }

  // Final recommendation
  console.log('📋 Recommendations:\n');
  
  const issues = [];
  if (!spkData || spkData.length === 0) issues.push('Import SPK data');
  if (!bomData || bomData.length === 0) issues.push('Import BOM data');
  if (!materialsData || materialsData.length === 0) issues.push('Import materials master');
  if (materialsData && materialsData.length > 0) {
    const withPrice = materialsData.filter(m => parseFloat(m.harga || m.price || '0') > 0);
    if (withPrice.length === 0) issues.push('Set material prices');
  }

  if (issues.length === 0) {
    console.log('✅ All data appears to be in place!');
    console.log('   If report still shows zeros, check browser console for detailed logs');
  } else {
    console.log('Required actions:');
    issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`);
    });
  }

  console.log('\n==========================================');
  console.log('Diagnostic complete. Check browser console for detailed report logs.');
}

// Run diagnostic
diagnose().catch(error => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});
