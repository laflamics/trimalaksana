#!/usr/bin/env node

/**
 * Debug script to check BOM matching
 */

const fs = require('fs');
const path = require('path');

async function debugBOMMatching() {
    try {
        console.log('🔍 DEBUGGING BOM MATCHING');
        console.log('========================');
        
        // Read products and BOM data
        const productsPath = path.join(__dirname, '../data/localStorage/products.json');
        const bomPath = path.join(__dirname, '../data/localStorage/bom.json');
        
        const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
        
        const products = productsData.value || [];
        const bomItems = bomData.value || [];
        
        console.log(`📊 Loaded ${products.length} products`);
        console.log(`📊 Loaded ${bomItems.length} BOM items`);
        
        // Find the specific product with product_id "321"
        const targetProduct = products.find(p => p.product_id === "321");
        console.log(`\n🎯 Target Product:`);
        console.log(`   ID: ${targetProduct?.id}`);
        console.log(`   Name: ${targetProduct?.nama}`);
        console.log(`   Product ID: ${targetProduct?.product_id}`);
        console.log(`   Kode: ${targetProduct?.kode || 'N/A'}`);
        
        // Find matching BOM items
        const matchingBOM = bomItems.filter(b => {
            const bomProductId = String(b.product_id || b.kode || '').trim();
            const targetProductId = String(targetProduct?.product_id || '').trim();
            return bomProductId === targetProductId;
        });
        
        console.log(`\n🔗 Matching BOM Items:`);
        console.log(`   Found ${matchingBOM.length} BOM items for product_id "321"`);
        
        matchingBOM.forEach((bom, index) => {
            console.log(`   ${index + 1}. BOM ID: ${bom.id}`);
            console.log(`      Product ID: ${bom.product_id}`);
            console.log(`      Material ID: ${bom.material_id}`);
            console.log(`      Ratio: ${bom.ratio}`);
        });
        
        // Test the hasBOM logic from the app
        console.log(`\n🧪 Testing hasBOM Logic:`);
        
        const productId = (targetProduct?.product_id || targetProduct?.kode || '').toString().trim().toLowerCase();
        console.log(`   Normalized product ID: "${productId}"`);
        
        const bomProductIdsSet = new Set();
        bomItems.forEach(b => {
            if (b) {
                const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
                if (bomProductId) {
                    bomProductIdsSet.add(bomProductId);
                }
            }
        });
        
        console.log(`   BOM Product IDs in Set:`, Array.from(bomProductIdsSet).slice(0, 10)); // Show first 10
        console.log(`   Has BOM: ${bomProductIdsSet.has(productId)}`);
        
        // Check if there are any issues with the data format
        console.log(`\n📋 Data Format Check:`);
        
        const bomWithIssues = bomItems.filter(b => {
            const productIdField = b.product_id;
            const materialIdField = b.material_id;
            return !productIdField || !materialIdField || b.ratio <= 0;
        });
        
        if (bomWithIssues.length > 0) {
            console.log(`   ⚠️  Found ${bomWithIssues.length} BOM items with potential issues:`);
            bomWithIssues.slice(0, 3).forEach((b, i) => {
                console.log(`     ${i + 1}. ID: ${b.id}, Product: ${b.product_id}, Material: ${b.material_id}, Ratio: ${b.ratio}`);
            });
        } else {
            console.log(`   ✅ All BOM items appear to have valid data`);
        }
        
        console.log(`\n✅ DEBUG COMPLETE`);
        console.log(`If hasBOM returns false in the app, the issue might be:`);
        console.log(`1. BOM cache not refreshed after data conversion`);
        console.log(`2. Case sensitivity issues in matching`);
        console.log(`3. Component not re-rendering after BOM data update`);
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

// Run the debug
if (require.main === module) {
    debugBOMMatching();
}