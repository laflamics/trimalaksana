#!/usr/bin/env node

/**
 * Test Storage Service GT Finance
 * 
 * Test apakah storage service bisa membaca gt_financeNotifications dengan benar
 */

const fs = require('fs');

console.log('🧪 Test Storage Service GT Finance');
console.log('='.repeat(50));

// Test 1: Direct file read
console.log('\n📋 Test 1: Direct File Read');
console.log('-'.repeat(30));

const filePath = 'data/localStorage/general-trading/gt_financeNotifications.json';

try {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsedData = JSON.parse(fileContent);
    
    console.log('✅ File exists and readable');
    console.log('📊 File structure:', {
      hasValue: 'value' in parsedData,
      valueType: typeof parsedData.value,
      valueIsArray: Array.isArray(parsedData.value),
      valueLength: Array.isArray(parsedData.value) ? parsedData.value.length : 'N/A',
      hasTimestamp: 'timestamp' in parsedData,
      timestamp: parsedData.timestamp
    });
    
    if (Array.isArray(parsedData.value)) {
      console.log('📋 Notifications in file:');
      parsedData.value.forEach((notif, index) => {
        console.log(`   ${index + 1}. ID: ${notif.id}`);
        console.log(`      PO: ${notif.poNo}`);
        console.log(`      GRN: ${notif.grnNo}`);
        console.log(`      Status: ${notif.status}`);
        console.log(`      Type: ${notif.type}`);
      });
    } else {
      console.log('❌ Value is not an array:', parsedData.value);
    }
  } else {
    console.log('❌ File does not exist');
  }
} catch (error) {
  console.error('❌ Error reading file:', error.message);
}

// Test 2: Simulate storage service behavior
console.log('\n📋 Test 2: Simulate Storage Service');
console.log('-'.repeat(30));

const simulateStorageGet = (key) => {
  try {
    const filePath = `data/localStorage/general-trading/${key}.json`;
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Storage service should return the value directly, not the wrapper
    if (data && typeof data === 'object' && 'value' in data) {
      console.log(`✅ Storage service would return: ${Array.isArray(data.value) ? data.value.length : 'not array'} items`);
      return data.value;
    } else {
      console.log(`⚠️ Unexpected data format:`, typeof data);
      return data;
    }
  } catch (error) {
    console.error(`❌ Error in storage simulation:`, error.message);
    return null;
  }
};

const financeNotifResult = simulateStorageGet('gt_financeNotifications');
const poResult = simulateStorageGet('gt_purchaseOrders');
const grnResult = simulateStorageGet('gt_grn');

console.log('\n📊 Storage Service Results:');
console.log(`   gt_financeNotifications: ${financeNotifResult ? (Array.isArray(financeNotifResult) ? financeNotifResult.length : 'not array') : 'null'}`);
console.log(`   gt_purchaseOrders: ${poResult ? (Array.isArray(poResult) ? poResult.length : 'not array') : 'null'}`);
console.log(`   gt_grn: ${grnResult ? (Array.isArray(grnResult) ? grnResult.length : 'not array') : 'null'}`);

// Test 3: Check if notifications are pending
console.log('\n📋 Test 3: Check Pending Notifications');
console.log('-'.repeat(30));

if (financeNotifResult && Array.isArray(financeNotifResult)) {
  const pending = financeNotifResult.filter(notif => 
    notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
  );
  
  console.log(`⏳ Pending notifications: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('📋 Pending details:');
    pending.forEach((notif, index) => {
      console.log(`   ${index + 1}. PO: ${notif.poNo}, GRN: ${notif.grnNo}`);
      console.log(`      Supplier: ${notif.supplier}`);
      console.log(`      Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
      console.log(`      Status: ${notif.status}`);
    });
  }
} else {
  console.log('❌ No finance notifications found or not array');
}

// Test 4: Simulate GT Payments logic
console.log('\n📋 Test 4: Simulate GT Payments Logic');
console.log('-'.repeat(30));

const simulateGTPayments = () => {
  // Simulate the exact logic from GT Payments
  let financeNotifDataRaw = financeNotifResult;
  
  console.log('Step 1: Initial data load');
  console.log(`   financeNotifDataRaw: ${financeNotifDataRaw ? (Array.isArray(financeNotifDataRaw) ? financeNotifDataRaw.length : 'not array') : 'null/undefined'}`);
  
  // Force reload check
  if (!financeNotifDataRaw || !Array.isArray(financeNotifDataRaw) || financeNotifDataRaw.length <= 1) {
    console.log('Step 2: Force reload needed');
    // In real app, this would call forceReloadFromFile
    // For simulation, we already have the data
    if (financeNotifDataRaw && Array.isArray(financeNotifDataRaw)) {
      console.log('   Force reload would be triggered but data exists');
    } else {
      console.log('   Force reload would be triggered - data is null/undefined');
    }
  }
  
  // Filter active items
  const financeNotifData = (financeNotifDataRaw || []).filter(item => !item.deleted);
  console.log('Step 3: Filter active items');
  console.log(`   Active notifications: ${financeNotifData.length}`);
  
  // Filter pending
  const pending = financeNotifData.filter(notif =>
    notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
  );
  console.log('Step 4: Filter pending');
  console.log(`   Pending notifications: ${pending.length}`);
  
  return { financeNotifData, pending };
};

const simulation = simulateGTPayments();

console.log('\n🎯 Conclusion:');
console.log('='.repeat(50));

if (simulation.pending.length > 0) {
  console.log('✅ GT Payments SHOULD show notifications');
  console.log('   Problem might be in the UI or storage service implementation');
} else {
  console.log('❌ GT Payments correctly shows no notifications');
  console.log('   Either no notifications exist or all are closed');
}

console.log('\n🔧 Troubleshooting:');
console.log('1. Check if storage service is returning undefined');
console.log('2. Check if forceReloadFromFile is working');
console.log('3. Check browser console for storage errors');
console.log('4. Verify file permissions and paths');
console.log('5. Try clearing browser cache and localStorage');