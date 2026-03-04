#!/usr/bin/env node

/**
 * Test product sync directly by checking:
 * 1. Server has products
 * 2. Device has products
 * 3. Check if sync is being triggered
 * 4. Check if there's a business context issue
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 [PRODUCT SYNC TEST - DIRECT]\n');

// 1. Check server products
console.log('1️⃣  SERVER PRODUCTS');
console.log('=' .repeat(60));

const serverProductsPath = path.join(__dirname, '../docker/data/localStorage/packaging/products.json');
let serverProducts = null;
let serverProductsCount = 0;

if (fs.existsSync(serverProductsPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(serverProductsPath, 'utf8'));
    serverProducts = data.value || data;
    serverProductsCount = Array.isArray(serverProducts) ? serverProducts.length : 0;
    console.log(`✓ Server products.json: ${serverProductsCount} items`);
    
    if (serverProductsCount > 0) {
      const sample = serverProducts[0];
      console.log(`  Sample ID: ${sample.id}`);
      console.log(`  Sample kode: ${sample.kode}`);
      console.log(`  Has timestamp: ${!!sample.created}`);
    }
  } catch (e) {
    console.log(`✗ Error reading server products: ${e.message}`);
  }
}

// 2. Check device products
console.log('\n2️⃣  DEVICE PRODUCTS');
console.log('=' .repeat(60));

const deviceProductsPath = path.join(__dirname, '../data/localStorage/Packaging/products.json');
let deviceProducts = null;
let deviceProductsCount = 0;

if (fs.existsSync(deviceProductsPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(deviceProductsPath, 'utf8'));
    deviceProducts = data.value || data;
    deviceProductsCount = Array.isArray(deviceProducts) ? deviceProducts.length : 0;
    console.log(`✓ Device products.json: ${deviceProductsCount} items`);
    
    if (deviceProductsCount > 0) {
      const sample = deviceProducts[0];
      console.log(`  Sample ID: ${sample.id}`);
      console.log(`  Sample kode: ${sample.kode}`);
      console.log(`  Has timestamp: ${!!sample.created}`);
    }
  } catch (e) {
    console.log(`✗ Error reading device products: ${e.message}`);
  }
}

// 3. Check if data is identical
console.log('\n3️⃣  DATA COMPARISON');
console.log('=' .repeat(60));

if (serverProducts && deviceProducts) {
  if (serverProductsCount === deviceProductsCount) {
    console.log(`✓ Product counts match: ${serverProductsCount}`);
    
    // Check if they're identical
    const serverJson = JSON.stringify(serverProducts);
    const deviceJson = JSON.stringify(deviceProducts);
    
    if (serverJson === deviceJson) {
      console.log('✓ Data is IDENTICAL - sync is working correctly');
    } else {
      console.log('⚠️  Data is DIFFERENT - sync may have issues');
      
      // Find differences
      const serverIds = new Set(serverProducts.map(p => p.id));
      const deviceIds = new Set(deviceProducts.map(p => p.id));
      
      const missingOnDevice = Array.from(serverIds).filter(id => !deviceIds.has(id));
      const extraOnDevice = Array.from(deviceIds).filter(id => !serverIds.has(id));
      
      if (missingOnDevice.length > 0) {
        console.log(`  Missing on device: ${missingOnDevice.length} items`);
      }
      if (extraOnDevice.length > 0) {
        console.log(`  Extra on device: ${extraOnDevice.length} items`);
      }
    }
  } else {
    console.log(`✗ Product count mismatch:`);
    console.log(`  Server: ${serverProductsCount}`);
    console.log(`  Device: ${deviceProductsCount}`);
    console.log(`  Difference: ${Math.abs(serverProductsCount - deviceProductsCount)}`);
  }
}

// 4. Check storage.ts configuration
console.log('\n4️⃣  SYNC CONFIGURATION CHECK');
console.log('=' .repeat(60));

const storageFile = path.join(__dirname, '../src/services/storage.ts');
const storageContent = fs.readFileSync(storageFile, 'utf8');

// Check if products is in syncToServer
const syncToServerMatch = storageContent.match(/async syncToServer\(\)[\s\S]*?dataKeys = \[([\s\S]*?)\];/);
if (syncToServerMatch) {
  const keysStr = syncToServerMatch[1];
  if (keysStr.includes("'products'")) {
    console.log('✓ "products" in syncToServer');
  } else {
    console.log('✗ "products" NOT in syncToServer');
  }
}

// Check if products is in syncFromServer
const syncFromServerMatch = storageContent.match(/async syncFromServer\(\)[\s\S]*?dataKeys = \[([\s\S]*?)\];/);
if (syncFromServerMatch) {
  const keysStr = syncFromServerMatch[1];
  if (keysStr.includes("'products'")) {
    console.log('✓ "products" in syncFromServer');
  } else {
    console.log('✗ "products" NOT in syncFromServer');
  }
}

// 5. Check websocket-client configuration
console.log('\n5️⃣  WEBSOCKET CLIENT CHECK');
console.log('=' .repeat(60));

const wsFile = path.join(__dirname, '../src/services/websocket-client.ts');
const wsContent = fs.readFileSync(wsFile, 'utf8');

if (wsContent.includes("'products'") && wsContent.includes('largeKeys')) {
  console.log('✓ "products" in websocket largeKeys (60s timeout)');
} else {
  console.log('⚠️  "products" may not be in websocket largeKeys');
}

// 6. Check if there's a business context issue
console.log('\n6️⃣  BUSINESS CONTEXT CHECK');
console.log('=' .repeat(60));

// Check if there's a selectedBusiness setting
const localStoragePath = path.join(__dirname, '../data/localStorage');
const files = fs.readdirSync(localStoragePath);

console.log('Files in data/localStorage:');
files.slice(0, 10).forEach(f => console.log(`  - ${f}`));

if (files.length > 10) {
  console.log(`  ... and ${files.length - 10} more files`);
}

console.log('\n' + '=' .repeat(60));
console.log('✅ TEST COMPLETE\n');
