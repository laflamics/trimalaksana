#!/usr/bin/env node

/**
 * Script to convert products.json format:
 * - Replace "kode" field with "product_id" field
 * - Keep the same value
 * - Push updated data to server
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PRODUCTS_FILE = path.join(__dirname, '../data/localStorage/products.json');
const SERVER_URL = 'http://localhost:3001'; // Adjust as needed

async function readProducts() {
    try {
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading products file:', error);
        throw error;
    }
}

function transformProducts(data) {
    if (!data.value || !Array.isArray(data.value)) {
        throw new Error('Invalid products data structure');
    }

    console.log(`Processing ${data.value.length} products...`);

    const transformed = data.value.map((product, index) => {
        // Create new product object with transformed structure
        const newProduct = {
            ...product
        };

        // Replace "kode" with "product_id" if kode exists
        if (product.kode !== undefined) {
            newProduct.product_id = product.kode;
            delete newProduct.kode;
        }

        // Log transformation for verification
        if (index < 5 || index === data.value.length - 1) {
            console.log(`Transformed product ${index + 1}: ${product.nama || 'Unnamed'}`);
            console.log(`  Old: kode = ${product.kode}`);
            console.log(`  New: product_id = ${newProduct.product_id}`);
        }

        return newProduct;
    });

    return {
        ...data,
        value: transformed
    };
}

async function saveProducts(data) {
    try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2));
        console.log('Products file updated successfully');
        return true;
    } catch (error) {
        console.error('Error saving products file:', error);
        return false;
    }
}

async function pushToServer(data) {
    try {
        console.log('Pushing to server...');
        
        const response = await fetch(`${SERVER_URL}/api/storage/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('✅ Data pushed to server successfully');
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ Server error (${response.status}):`, errorText);
            return false;
        }
    } catch (error) {
        console.error('❌ Error pushing to server:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting products format conversion...');
    
    try {
        // Read current products
        console.log('Reading products data...');
        const originalData = await readProducts();
        
        // Transform data
        console.log('Transforming data structure...');
        const transformedData = transformProducts(originalData);
        
        // Save locally
        console.log('Saving transformed data...');
        const saveSuccess = await saveProducts(transformedData);
        
        if (!saveSuccess) {
            console.error('Failed to save transformed data locally');
            process.exit(1);
        }
        
        // Push to server
        console.log('Attempting to push to server...');
        const pushSuccess = await pushToServer(transformedData);
        
        if (pushSuccess) {
            console.log('✅ Conversion completed successfully!');
            console.log(`📦 Processed ${transformedData.value.length} products`);
            console.log('🔄 All "kode" fields converted to "product_id"');
        } else {
            console.log('⚠️  Local conversion successful, but server push failed');
            console.log('🔧 You may need to manually sync with the server');
        }
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    transformProducts,
    readProducts,
    saveProducts,
    pushToServer
};