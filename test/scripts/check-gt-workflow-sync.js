#!/usr/bin/env node

/**
 * GT Workflow Sync Checker
 * 
 * Mengecek semua path notification dan sync di GT workflow
 * untuk memastikan tidak ada yang ngaco seperti SO → PPIC yang sudah difix
 */

const fs = require('fs');

console.log('🔍 GT Workflow Sync Path Checker');
console.log('='.repeat(60));

// Helper function to check if file exists
const fileExists = (path) => {
  try {
    return fs.existsSync(path);
  } catch (e) {
    return false;
  }
};

// Helper function to read and parse JSON file
const readJsonFile = (path) => {
  try {
    if (!fileExists(path)) return null;
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`   ❌ Error reading ${path}: ${e.message}`);
    return null;
  }
};

// Helper function to search for patterns in code files
const searchInFile = (filePath, pattern) => {
  try {
    if (!fileExists(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(pattern, 'gi');
    const matches = content.match(regex) || [];
    return matches;
  } catch (e) {
    return [];
  }
};

console.log('📋 1. Checking Data Files...');
console.log('-'.repeat(40));

// Check all GT data files
const gtDataFiles = [
  'data/localStorage/general-trading/gt_salesOrders.json',
  'data/localStorage/general-trading/gt_spk.json',
  'data/localStorage/general-trading/gt_purchaseRequests.json',
  'data/localStorage/general-trading/gt_purchaseOrders.json',
  'data/localStorage/general-trading/gt_grn.json',
  'data/localStorage/general-trading/gt_schedule.json',
  'data/localStorage/general-trading/gt_delivery.json',
  'data/localStorage/general-trading/gt_invoices.json',
  'data/localStorage/general-trading/gt_payments.json',
  'data/localStorage/general-trading/gt_accountsReceivable.json',
  'data/localStorage/general-trading/gt_ppicNotifications.json',
  'data/localStorage/general-trading/gt_purchasingNotifications.json',
  'data/localStorage/general-trading/gt_deliveryNotifications.json',
  'data/localStorage/general-trading/gt_financeNotifications.json',
  'data/localStorage/general-trading/gt_invoiceNotifications.json',
  'data/localStorage/general-trading/gt_customers.json',
  'data/localStorage/general-trading/gt_products.json',
  'data/localStorage/general-trading/gt_inventory.json'
];

let existingFiles = 0;
let totalRecords = 0;

gtDataFiles.forEach(file => {
  const data = readJsonFile(file);
  if (data) {
    existingFiles++;
    const records = data.value ? (Array.isArray(data.value) ? data.value.length : 0) : 0;
    totalRecords += records;
    console.log(`   ✅ ${file.split('/').pop()}: ${records} records`);
  } else {
    console.log(`   ❌ ${file.split('/').pop()}: Not found or invalid`);
  }
});

console.log(`\n   📊 Summary: ${existingFiles}/${gtDataFiles.length} files exist, ${totalRecords} total records`);

console.log('\n📋 2. Checking Notification Creation Patterns...');
console.log('-'.repeat(40));

// Check notification creation patterns in GT modules
const gtModules = [
  'src/pages/GeneralTrading/SalesOrders.tsx',
  'src/pages/GeneralTrading/PPIC.tsx',
  'src/pages/GeneralTrading/Purchasing.tsx',
  'src/pages/GeneralTrading/DeliveryNote.tsx',
  'src/pages/GeneralTrading/Finance/Payments.tsx'
];

const notificationPatterns = [
  { name: 'PPIC Notifications', pattern: 'gt_ppicNotifications.*type.*SO_CREATED' },
  { name: 'Purchasing Notifications', pattern: 'gt_purchasingNotifications.*type.*PR_CREATED' },
  { name: 'Delivery Notifications', pattern: 'gt_deliveryNotifications.*type.*(READY_TO_SHIP|READY_TO_DELIVER)' },
  { name: 'Finance Notifications', pattern: 'gt_financeNotifications.*type.*SUPPLIER_PAYMENT' },
  { name: 'Invoice Notifications', pattern: 'gt_invoiceNotifications.*type.*CUSTOMER_INVOICE' }
];

gtModules.forEach(module => {
  if (fileExists(module)) {
    console.log(`\n   📄 ${module.split('/').pop()}:`);
    
    notificationPatterns.forEach(pattern => {
      const matches = searchInFile(module, pattern.pattern);
      if (matches.length > 0) {
        console.log(`      ✅ ${pattern.name}: ${matches.length} creation points`);
      } else {
        console.log(`      ⚪ ${pattern.name}: No creation found`);
      }
    });
  } else {
    console.log(`   ❌ ${module}: File not found`);
  }
});

console.log('\n📋 3. Checking Critical Sync Points...');
console.log('-'.repeat(40));

// Check critical sync points
const syncPoints = [
  {
    name: 'SO → PPIC Notification',
    file: 'src/pages/GeneralTrading/SalesOrders.tsx',
    pattern: 'gt_ppicNotifications.*SO_CREATED',
    status: 'FIXED'
  },
  {
    name: 'PPIC → SPK Creation',
    file: 'src/pages/GeneralTrading/PPIC.tsx',
    pattern: 'handleCreateSPKFromSO',
    status: 'CHECK'
  },
  {
    name: 'PPIC → PR Creation',
    file: 'src/pages/GeneralTrading/PPIC.tsx',
    pattern: 'gt_purchasingNotifications.*PR_CREATED',
    status: 'CHECK'
  },
  {
    name: 'GRN → Finance Notification',
    file: 'src/pages/GeneralTrading/Purchasing.tsx',
    pattern: 'gt_financeNotifications.*SUPPLIER_PAYMENT',
    status: 'CHECK'
  },
  {
    name: 'GRN → PPIC Stock Notification',
    file: 'src/pages/GeneralTrading/Purchasing.tsx',
    pattern: 'gt_ppicNotifications.*STOCK_READY',
    status: 'CHECK'
  },
  {
    name: 'PPIC Schedule → Delivery Notification',
    file: 'src/pages/GeneralTrading/PPIC.tsx',
    pattern: 'gt_deliveryNotifications.*READY_TO_DELIVER',
    status: 'CHECK'
  },
  {
    name: 'Delivery → Invoice Notification',
    file: 'src/pages/GeneralTrading/DeliveryNote.tsx',
    pattern: 'gt_invoiceNotifications.*CUSTOMER_INVOICE',
    status: 'CHECK'
  }
];

syncPoints.forEach(point => {
  if (fileExists(point.file)) {
    const matches = searchInFile(point.file, point.pattern);
    const status = matches.length > 0 ? '✅ FOUND' : '❌ NOT FOUND';
    const statusIcon = point.status === 'FIXED' ? '🔧' : '🔍';
    
    console.log(`   ${statusIcon} ${point.name}: ${status} (${matches.length} matches)`);
  } else {
    console.log(`   ❌ ${point.name}: File not found`);
  }
});

console.log('\n📋 4. Checking extractStorageValue Usage...');
console.log('-'.repeat(40));

// Check if all storage calls use extractStorageValue (to prevent iteration errors)
gtModules.forEach(module => {
  if (fileExists(module)) {
    const storageGets = searchInFile(module, 'storageService\\.get');
    const extractUsage = searchInFile(module, 'extractStorageValue');
    
    if (storageGets.length > 0) {
      const ratio = extractUsage.length / storageGets.length;
      const status = ratio >= 0.8 ? '✅' : ratio >= 0.5 ? '⚠️' : '❌';
      console.log(`   ${status} ${module.split('/').pop()}: ${extractUsage.length}/${storageGets.length} storage calls use extractStorageValue`);
    }
  }
});

console.log('\n📋 5. Checking Array Validation Patterns...');
console.log('-'.repeat(40));

// Check for array validation before iteration (to prevent "nt is not iterable" errors)
gtModules.forEach(module => {
  if (fileExists(module)) {
    const forOfLoops = searchInFile(module, 'for.*of.*\\w+');
    const arrayChecks = searchInFile(module, 'Array\\.isArray');
    
    if (forOfLoops.length > 0) {
      const ratio = arrayChecks.length / forOfLoops.length;
      const status = ratio >= 0.5 ? '✅' : ratio >= 0.2 ? '⚠️' : '❌';
      console.log(`   ${status} ${module.split('/').pop()}: ${arrayChecks.length} array checks for ${forOfLoops.length} iterations`);
    }
  }
});

console.log('\n📋 6. Sample Data Analysis...');
console.log('-'.repeat(40));

// Analyze sample data from key files
const keyFiles = [
  'data/localStorage/general-trading/gt_ppicNotifications.json',
  'data/localStorage/general-trading/gt_salesOrders.json',
  'data/localStorage/general-trading/gt_spk.json'
];

keyFiles.forEach(file => {
  const data = readJsonFile(file);
  if (data && data.value && Array.isArray(data.value) && data.value.length > 0) {
    const sample = data.value[0];
    console.log(`\n   📄 ${file.split('/').pop()} sample:`);
    
    if (sample.type) console.log(`      type: ${sample.type}`);
    if (sample.status) console.log(`      status: ${sample.status}`);
    if (sample.soNo) console.log(`      soNo: ${sample.soNo}`);
    if (sample.spkNo) console.log(`      spkNo: ${sample.spkNo}`);
    if (sample.created) console.log(`      created: ${sample.created}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('🎯 CRITICAL ISSUES TO CHECK:');
console.log('-'.repeat(30));
console.log('1. ✅ SO → PPIC sync (FIXED - iteration error resolved)');
console.log('2. 🔍 PPIC → Purchasing sync (verify PR creation)');
console.log('3. 🔍 GRN → Finance sync (verify payment notifications)');
console.log('4. 🔍 GRN → PPIC sync (verify stock ready notifications)');
console.log('5. 🔍 Schedule → Delivery sync (verify sjGroupId handling)');
console.log('6. 🔍 Delivery → Invoice sync (verify invoice notifications)');
console.log('');
console.log('🛠️ RECOMMENDATIONS:');
console.log('- Test each sync point manually');
console.log('- Verify cross-device notification sync');
console.log('- Check array validation in all modules');
console.log('- Ensure extractStorageValue usage everywhere');
console.log('- Monitor for iteration errors in production');