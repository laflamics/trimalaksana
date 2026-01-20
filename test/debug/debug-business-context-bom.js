#!/usr/bin/env node

/**
 * Debug Business Context BOM Issue
 * 
 * Script untuk mengecek apakah business context prefix menghalangi BOM data
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debug Business Context BOM Issue...\n');

// Check available BOM files
const dataDir = path.join(__dirname, 'data/localStorage');
const bomFiles = [];

// Check for different BOM file patterns
const possibleBomFiles = [
  'bom.json',
  'packaging/bom.json', 
  'general-trading/bom.json',
  'trucking/bom.json'
];

possibleBomFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const items = data.value || data;
    bomFiles.push({
      file: file,
      path: filePath,
      items: Array.isArray(items) ? items.length : 0,
      structure: data.value ? 'wrapped' : 'direct'
    });
  }
});

console.log('📁 Available BOM files:');
if (bomFiles.length === 0) {
  console.log('❌ No BOM files found');
} else {
  bomFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.file} - ${file.items} items (${file.structure})`);
  });
}

// Check for business-specific directories
const businessDirs = ['packaging', 'general-trading', 'trucking'];
console.log('\n📂 Business-specific directories:');
businessDirs.forEach(dir => {
  const dirPath = path.join(dataDir, dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    console.log(`✅ ${dir}/ - ${files.length} files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
  } else {
    console.log(`❌ ${dir}/ - not found`);
  }
});

// Simulate getStorageKey function
const getStorageKey = (key, selectedBusiness) => {
  const business = selectedBusiness || 'packaging';
  if (business === 'packaging') {
    return key;
  }
  return `${business}/${key}`;
};

// Test different business contexts
console.log('\n🧪 Testing storage keys for different business contexts:');
const businesses = ['packaging', 'general-trading', 'trucking'];
businesses.forEach(business => {
  const storageKey = getStorageKey('bom', business);
  const filePath = path.join(dataDir, `${storageKey}.json`);
  const exists = fs.existsSync(filePath);
  
  console.log(`• ${business}: "${storageKey}" → ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  
  if (!exists && business !== 'packaging') {
    // Check if we need to copy from main bom.json
    const mainBomPath = path.join(dataDir, 'bom.json');
    if (fs.existsSync(mainBomPath)) {
      console.log(`  💡 Could copy from bom.json to ${storageKey}.json`);
    }
  }
});

// Generate browser test code
console.log('\n🧪 Browser Console Test Code:');
console.log('Copy and paste this in browser console:\n');

console.log(`// Check current business context
const selectedBusiness = localStorage.getItem('selectedBusiness');
console.log('Selected Business:', selectedBusiness || 'packaging (default)');

// Simulate getStorageKey function
const getStorageKey = (key) => {
  const business = selectedBusiness || 'packaging';
  if (business === 'packaging') {
    return key;
  }
  return business + '/' + key;
};

// Test BOM storage key
const bomStorageKey = getStorageKey('bom');
console.log('BOM Storage Key:', bomStorageKey);

// Check if BOM data exists in localStorage
const bomData = localStorage.getItem(bomStorageKey);
console.log('BOM Data in localStorage:', bomData ? 'Found' : 'Not found');

if (!bomData) {
  console.log('❌ BOM data not found with key:', bomStorageKey);
  
  // Try alternative keys
  const alternativeKeys = ['bom', 'packaging/bom', 'general-trading/bom', 'trucking/bom'];
  alternativeKeys.forEach(key => {
    const data = localStorage.getItem(key);
    console.log('Alternative key "' + key + '":', data ? 'Found' : 'Not found');
  });
} else {
  const parsed = JSON.parse(bomData);
  const items = parsed.value || parsed;
  console.log('✅ BOM items found:', Array.isArray(items) ? items.length : 'Invalid structure');
}`);

// Generate fix solutions
console.log('\n💡 POSSIBLE SOLUTIONS:');

if (bomFiles.length === 1 && bomFiles[0].file === 'bom.json') {
  console.log('1. 🔄 Copy bom.json to business-specific locations:');
  businesses.forEach(business => {
    if (business !== 'packaging') {
      const targetDir = path.join(dataDir, business);
      const targetFile = path.join(targetDir, 'bom.json');
      console.log(`   cp data/localStorage/bom.json data/localStorage/${business}/bom.json`);
    }
  });
  
  console.log('\n2. 🔧 Or modify storage service to always use "bom" key regardless of business context');
  
  console.log('\n3. 🎯 Or set selectedBusiness to "packaging" in localStorage');
}

console.log('\n🚀 RECOMMENDED FIX:');
console.log('Create business-specific BOM files by copying the main bom.json');

console.log('\n✅ Debug complete!');