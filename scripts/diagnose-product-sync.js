#!/usr/bin/env node

/**
 * Diagnose product sync issues
 * Check:
 * 1. Products in localStorage (device)
 * 2. Products on server
 * 3. Sync configuration
 * 4. Business context
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 [PRODUCT SYNC DIAGNOSIS]\n');

// 1. Check localStorage products
console.log('1️⃣  CHECKING LOCAL STORAGE (Device)');
console.log('=' .repeat(60));

const localStoragePath = path.join(__dirname, '../data/localStorage');
const packagingPath = path.join(localStoragePath, 'Packaging');

let localProducts = null;
let localMaterials = null;

// Check root level
if (fs.existsSync(path.join(localStoragePath, 'products.json'))) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(localStoragePath, 'products.json'), 'utf8'));
    localProducts = data.value || data;
    console.log(`✓ Found products.json at root: ${Array.isArray(localProducts) ? localProducts.length : 'N/A'} items`);
  } catch (e) {
    console.log(`✗ Error reading products.json at root: ${e.message}`);
  }
}

// Check Packaging folder
if (fs.existsSync(path.join(packagingPath, 'products.json'))) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(packagingPath, 'products.json'), 'utf8'));
    localProducts = data.value || data;
    console.log(`✓ Found products.json in Packaging folder: ${Array.isArray(localProducts) ? localProducts.length : 'N/A'} items`);
  } catch (e) {
    console.log(`✗ Error reading Packaging/products.json: ${e.message}`);
  }
}

if (fs.existsSync(path.join(packagingPath, 'materials.json'))) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(packagingPath, 'materials.json'), 'utf8'));
    localMaterials = data.value || data;
    console.log(`✓ Found materials.json in Packaging folder: ${Array.isArray(localMaterials) ? localMaterials.length : 'N/A'} items`);
  } catch (e) {
    console.log(`✗ Error reading Packaging/materials.json: ${e.message}`);
  }
}

if (!localProducts) {
  console.log('✗ No products found in localStorage');
}

console.log('\n2️⃣  CHECKING SERVER DATA');
console.log('=' .repeat(60));

const serverPath = path.join(__dirname, '../docker/data/localStorage/Packaging');
let serverProducts = null;
let serverMaterials = null;

if (fs.existsSync(path.join(serverPath, 'products.json'))) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(serverPath, 'products.json'), 'utf8'));
    serverProducts = data.value || data;
    console.log(`✓ Found products.json on server: ${Array.isArray(serverProducts) ? serverProducts.length : 'N/A'} items`);
  } catch (e) {
    console.log(`✗ Error reading server products.json: ${e.message}`);
  }
}

if (fs.existsSync(path.join(serverPath, 'materials.json'))) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(serverPath, 'materials.json'), 'utf8'));
    serverMaterials = data.value || data;
    console.log(`✓ Found materials.json on server: ${Array.isArray(serverMaterials) ? serverMaterials.length : 'N/A'} items`);
  } catch (e) {
    console.log(`✗ Error reading server materials.json: ${e.message}`);
  }
}

if (!serverProducts) {
  console.log('✗ No products found on server');
}

console.log('\n3️⃣  COMPARING DATA');
console.log('=' .repeat(60));

if (localProducts && serverProducts) {
  const localCount = Array.isArray(localProducts) ? localProducts.length : 0;
  const serverCount = Array.isArray(serverProducts) ? serverProducts.length : 0;
  
  console.log(`Local products: ${localCount}`);
  console.log(`Server products: ${serverCount}`);
  
  if (localCount === serverCount) {
    console.log('✓ Product counts match');
  } else {
    console.log(`✗ Product count mismatch! Difference: ${Math.abs(localCount - serverCount)}`);
    
    if (localCount > serverCount) {
      console.log(`  → Device has ${localCount - serverCount} more products than server`);
    } else {
      console.log(`  → Server has ${serverCount - localCount} more products than device`);
    }
  }
  
  // Check for missing products
  if (Array.isArray(localProducts) && Array.isArray(serverProducts)) {
    const localIds = new Set(localProducts.map(p => p.id));
    const serverIds = new Set(serverProducts.map(p => p.id));
    
    const missingOnServer = Array.from(localIds).filter(id => !serverIds.has(id));
    const missingOnDevice = Array.from(serverIds).filter(id => !localIds.has(id));
    
    if (missingOnServer.length > 0) {
      console.log(`\n⚠️  Products on device but NOT on server: ${missingOnServer.length}`);
      console.log(`   IDs: ${missingOnServer.slice(0, 5).join(', ')}${missingOnServer.length > 5 ? '...' : ''}`);
    }
    
    if (missingOnDevice.length > 0) {
      console.log(`\n⚠️  Products on server but NOT on device: ${missingOnDevice.length}`);
      console.log(`   IDs: ${missingOnDevice.slice(0, 5).join(', ')}${missingOnDevice.length > 5 ? '...' : ''}`);
    }
  }
}

console.log('\n4️⃣  CHECKING SYNC CONFIGURATION');
console.log('=' .repeat(60));

const storageFile = path.join(__dirname, '../src/services/storage.ts');
if (fs.existsSync(storageFile)) {
  const content = fs.readFileSync(storageFile, 'utf8');
  
  // Check if 'products' is in syncToServer
  if (content.includes("'products'") && content.includes('syncToServer')) {
    console.log('✓ "products" key found in syncToServer configuration');
  } else {
    console.log('✗ "products" key NOT found in syncToServer configuration');
  }
  
  // Check if 'products' is in syncFromServer
  if (content.includes("'products'") && content.includes('syncFromServer')) {
    console.log('✓ "products" key found in syncFromServer configuration');
  } else {
    console.log('✗ "products" key NOT found in syncFromServer configuration');
  }
  
  // Check if 'materials' is in sync
  if (content.includes("'materials'")) {
    console.log('✓ "materials" key found in sync configuration');
  } else {
    console.log('✗ "materials" key NOT found in sync configuration');
  }
}

console.log('\n5️⃣  CHECKING PRODUCT STRUCTURE');
console.log('=' .repeat(60));

if (localProducts && Array.isArray(localProducts) && localProducts.length > 0) {
  const sample = localProducts[0];
  console.log('Sample product structure:');
  console.log(JSON.stringify(sample, null, 2).split('\n').slice(0, 15).join('\n'));
  
  // Check for required fields
  const requiredFields = ['id', 'kode', 'nama'];
  const missingFields = requiredFields.filter(f => !(f in sample));
  
  if (missingFields.length === 0) {
    console.log('\n✓ All required fields present');
  } else {
    console.log(`\n✗ Missing fields: ${missingFields.join(', ')}`);
  }
}

console.log('\n6️⃣  CHECKING TIMESTAMP CONSISTENCY');
console.log('=' .repeat(60));

if (localProducts && Array.isArray(localProducts)) {
  const withTimestamp = localProducts.filter(p => p.created || p.updated).length;
  const withoutTimestamp = localProducts.length - withTimestamp;
  
  console.log(`Products with timestamp: ${withTimestamp}/${localProducts.length}`);
  if (withoutTimestamp > 0) {
    console.log(`⚠️  Products without timestamp: ${withoutTimestamp}`);
  }
}

console.log('\n' + '=' .repeat(60));
console.log('✅ DIAGNOSIS COMPLETE\n');
