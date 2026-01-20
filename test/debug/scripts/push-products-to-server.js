#!/usr/bin/env node

/**
 * Script to push converted products data to server
 * Uses the /api/storage/:key endpoint to update products
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PRODUCTS_FILE = path.join(__dirname, '../data/localStorage/products.json');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8888';

async function readProducts() {
    try {
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading products file:', error);
        throw error;
    }
}

async function pushToServer(data) {
    try {
        console.log(`📡 Pushing to server: ${SERVER_URL}`);
        console.log(`📦 Sending ${data.value.length} products...`);
        
        const startTime = Date.now();
        
        const response = await fetch(`${SERVER_URL}/api/storage/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Success! Server responded in ${duration}ms`);
            console.log(`📊 Response:`, JSON.stringify(result, null, 2));
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ Server error (${response.status}):`, errorText);
            return false;
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
        console.log('💡 Make sure your server is running on:', SERVER_URL);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting products data push to server...');
    
    try {
        // Read converted products
        console.log('📄 Reading converted products data...');
        const productsData = await readProducts();
        
        console.log(`📋 Found ${productsData.value.length} products to push`);
        
        // Show sample of the data structure
        console.log('\n🔍 Sample data structure:');
        console.log(JSON.stringify(productsData.value[0], null, 2));
        
        // Push to server
        console.log('\n📤 Pushing data to server...');
        const success = await pushToServer(productsData);
        
        if (success) {
            console.log('\n🎉 Data push completed successfully!');
            console.log(`📦 ${productsData.value.length} products uploaded`);
            console.log('🔄 All "kode" fields have been converted to "product_id" format');
        } else {
            console.log('\n⚠️  Data push failed');
            console.log('🔧 Troubleshooting tips:');
            console.log('   1. Check if server is running: npm run dev (in docker directory)');
            console.log('   2. Verify server URL: export SERVER_URL=http://your-server:port');
            console.log('   3. Check network connectivity');
        }
        
    } catch (error) {
        console.error('❌ Process failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    pushToServer,
    readProducts
};