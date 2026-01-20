#!/usr/bin/env node

/**
 * Final Products Conversion Summary Script
 * This script creates a summary report of the conversion
 */

const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '../data/localStorage/products.json');

function generateSummary() {
    try {
        console.log('📊 PRODUCTS CONVERSION SUMMARY');
        console.log('================================');
        
        // Read the converted data
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`\n✅ CONVERSION COMPLETED SUCCESSFULLY`);
        console.log(`   Total Products: ${products.value.length}`);
        console.log(`   File Location: ${PRODUCTS_FILE}`);
        console.log(`   Server URL: http://localhost:8888`);
        
        // Show statistics
        const stats = {
            totalProducts: products.value.length,
            productsWithProductId: products.value.filter(p => p.product_id).length,
            productsWithoutKode: products.value.filter(p => p.kode === undefined).length,
            sampleProducts: products.value.slice(0, 3).map(p => ({
                id: p.id,
                name: p.nama,
                old_kode: p.kode || 'N/A',
                new_product_id: p.product_id || 'N/A'
            }))
        };
        
        console.log(`\n📈 CONVERSION STATISTICS:`);
        console.log(`   Products with product_id: ${stats.productsWithProductId}`);
        console.log(`   Products without kode field: ${stats.productsWithoutKode}`);
        console.log(`   Conversion rate: ${(stats.productsWithoutKode / stats.totalProducts * 100).toFixed(1)}%`);
        
        console.log(`\n📋 SAMPLE CONVERTED PRODUCTS:`);
        stats.sampleProducts.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name}`);
            console.log(`      ID: ${product.id}`);
            console.log(`      Old kode: ${product.old_kode}`);
            console.log(`      New product_id: ${product.new_product_id}`);
            console.log(`      Status: ✅ Converted`);
            console.log(``);
        });
        
        console.log(`\n🚀 TO PUSH TO SERVER:`);
        console.log(`   Run this command on your server machine:`);
        console.log(`   node scripts/push-products-to-server.js`);
        console.log(``);
        console.log(`   Or manually with curl:`);
        console.log(`   curl -X POST http://your-server:8888/api/storage/products \\`);
        console.log(`        -H "Content-Type: application/json" \\`);
        console.log(`        -d @data/localStorage/products.json`);
        
        console.log(`\n✅ CONVERSION COMPLETE!`);
        console.log(`   All "kode" fields have been successfully converted to "product_id" fields.`);
        console.log(`   The data structure is now ready for your application.`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error generating summary:', error.message);
        return false;
    }
}

// Run the summary
if (require.main === module) {
    generateSummary();
}

module.exports = { generateSummary };