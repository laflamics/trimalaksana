#!/usr/bin/env node

/**
 * Test GT Modules Force Reload Mechanism
 * 
 * This script tests all GT modules to ensure they can properly load data
 * using the force reload mechanism when localStorage has stale/incomplete data.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing GT Modules Force Reload Mechanism');
console.log('='.repeat(50));

// Test data paths
const testPaths = {
  'gt_salesOrders': 'data/localStorage/general-trading/gt_salesOrders.json',
  'gt_customers': 'data/localStorage/general-trading/gt_customers.json', 
  'gt_products': 'data/localStorage/general-trading/gt_products.json',
  'gt_suppliers': 'data/localStorage/general-trading/gt_suppliers.json',
  'gt_inventory': 'data/localStorage/general-trading/gt_inventory.json'
};

// GT modules that should have force reload mechanism
const gtModules = [
  {
    name: 'GT SalesOrders',
    path: 'src/pages/GeneralTrading/SalesOrders.tsx',
    loadFunctions: ['loadOrders', 'loadCustomers', 'loadProducts'],
    dataKeys: ['gt_salesOrders', 'gt_customers', 'gt_products']
  },
  {
    name: 'GT Products',
    path: 'src/pages/GeneralTrading/Master/Products.tsx', 
    loadFunctions: ['loadProducts', 'loadCustomers'],
    dataKeys: ['gt_products', 'gt_customers']
  },
  {
    name: 'GT Customers',
    path: 'src/pages/GeneralTrading/Master/Customers.tsx',
    loadFunctions: ['loadCustomers'],
    dataKeys: ['gt_customers']
  },
  {
    name: 'GT PPIC',
    path: 'src/pages/GeneralTrading/PPIC.tsx',
    loadFunctions: ['loadData'],
    dataKeys: ['gt_customers', 'gt_products', 'gt_salesOrders']
  },
  {
    name: 'GT Purchasing',
    path: 'src/pages/GeneralTrading/Purchasing.tsx',
    loadFunctions: ['loadproducts', 'loadOrders'],
    dataKeys: ['gt_products', 'gt_salesOrders']
  }
];

let allTestsPassed = true;

// Test 1: Check if data files exist
console.log('📁 Test 1: Checking GT data files...');
for (const [key, filePath] of Object.entries(testPaths)) {
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items = Array.isArray(data) ? data : (data.value || []);
      console.log(`✅ ${key}: ${items.length} items found`);
    } catch (error) {
      console.log(`❌ ${key}: File exists but invalid JSON - ${error.message}`);
      allTestsPassed = false;
    }
  } else {
    console.log(`⚠️  ${key}: File not found at ${filePath}`);
  }
}

console.log();

// Test 2: Check if GT modules have force reload mechanism
console.log('🔄 Test 2: Checking force reload implementation...');
for (const module of gtModules) {
  console.log(`\n📄 ${module.name} (${module.path})`);
  
  if (!fs.existsSync(module.path)) {
    console.log(`❌ Module file not found`);
    allTestsPassed = false;
    continue;
  }
  
  const content = fs.readFileSync(module.path, 'utf8');
  
  // Check for force reload patterns
  const hasForceReload = content.includes('forceReloadFromFile');
  const hasConsoleLogging = content.includes('Few') && content.includes('detected, trying force reload');
  const hasLengthCheck = content.includes('<= 1') || content.includes('length <= 1');
  
  console.log(`  🔄 Force reload mechanism: ${hasForceReload ? '✅' : '❌'}`);
  console.log(`  📝 Console logging: ${hasConsoleLogging ? '✅' : '❌'}`);
  console.log(`  🔢 Length check: ${hasLengthCheck ? '✅' : '❌'}`);
  
  if (!hasForceReload || !hasConsoleLogging || !hasLengthCheck) {
    allTestsPassed = false;
  }
  
  // Check specific load functions
  for (const loadFunc of module.loadFunctions) {
    const hasLoadFunction = content.includes(`const ${loadFunc}`) || content.includes(`${loadFunc} = async`);
    console.log(`  📋 ${loadFunc}: ${hasLoadFunction ? '✅' : '❌'}`);
    
    if (!hasLoadFunction) {
      allTestsPassed = false;
    }
  }
}

console.log();

// Test 3: Check for consistent patterns
console.log('🔍 Test 3: Checking consistency patterns...');

const requiredPatterns = [
  {
    name: 'Force reload condition',
    pattern: /if \(.*\.length <= 1\)/,
    description: 'Checks for few items before force reload'
  },
  {
    name: 'Force reload call',
    pattern: /storageService\.forceReloadFromFile/,
    description: 'Calls the force reload method'
  },
  {
    name: 'Console logging',
    pattern: /console\.log.*Force reload successful/,
    description: 'Logs successful force reload'
  },
  {
    name: 'Filter active items',
    pattern: /filterActiveItems/,
    description: 'Filters out deleted items'
  }
];

for (const module of gtModules) {
  if (!fs.existsSync(module.path)) continue;
  
  const content = fs.readFileSync(module.path, 'utf8');
  console.log(`\n📄 ${module.name}`);
  
  for (const pattern of requiredPatterns) {
    const hasPattern = pattern.pattern.test(content);
    console.log(`  ${pattern.name}: ${hasPattern ? '✅' : '❌'}`);
    
    if (!hasPattern) {
      allTestsPassed = false;
    }
  }
}

console.log();

// Test 4: Summary and recommendations
console.log('📊 Test Summary');
console.log('='.repeat(30));

if (allTestsPassed) {
  console.log('✅ All GT modules have proper force reload mechanism!');
  console.log('');
  console.log('🎯 Benefits:');
  console.log('  • Consistent data loading across all GT modules');
  console.log('  • Automatic fallback when localStorage is stale');
  console.log('  • Better sync reliability with file system');
  console.log('  • Prevents "only 1 item" issues like in SalesOrders');
} else {
  console.log('❌ Some GT modules need force reload mechanism updates');
  console.log('');
  console.log('🔧 Next steps:');
  console.log('  1. Review failed modules above');
  console.log('  2. Add force reload mechanism to load functions');
  console.log('  3. Test with actual data loading scenarios');
  console.log('  4. Verify console logging works properly');
}

console.log('');
console.log('🚀 Force reload mechanism ensures all GT modules can:');
console.log('  • Detect when localStorage has incomplete data');
console.log('  • Automatically reload from file system');
console.log('  • Maintain data consistency across modules');
console.log('  • Provide better user experience');

process.exit(allTestsPassed ? 0 : 1);