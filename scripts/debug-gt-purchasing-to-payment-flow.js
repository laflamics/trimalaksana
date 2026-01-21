#!/usr/bin/env node

/**
 * Debug GT Purchasing to Payment Flow
 * 
 * Debug mengapa GRN baru tidak muncul di GT Payments
 */

const fs = require('fs');

console.log('🔍 Debug GT Purchasing → Payment Flow');
console.log('='.repeat(60));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) {
      console.log(`❌ File not found: ${path}`);
      return null;
    }
    const content = fs.readFileSync(path, 'utf8');
    const parsed = JSON.parse(content);
    console.log(`✅ Read ${path}: ${JSON.stringify(parsed).length} chars`);
    return parsed;
  } catch (e) {
    console.log(`❌ Error reading ${path}: ${e.message}`);
    return null;
  }
};

const extractStorageValue = (data) => {
  if (!data) return [];
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : (extracted ? [] : []);
  }
  return Array.isArray(data) ? data : [];
};

const filterActiveItems = (items) => {
  if (!Array.isArray(items)) {
    console.log(`   ⚠️  filterActiveItems received non-array: ${typeof items}`);
    return [];
  }
  return items.filter(item => !item.deleted);
};

console.log('📋 1. Checking Current GT Data...');
console.log('-'.repeat(50));

// Load all GT data files
const files = [
  'data/localStorage/general-trading/gt_purchaseOrders.json',
  'data/localStorage/general-trading/gt_grn.json', 
  'data/localStorage/general-trading/gt_financeNotifications.json',
  'data/localStorage/general-trading/gt_payments.json'
];

const data = {};
files.forEach(file => {
  const key = file.split('/').pop().replace('.json', '');
  data[key] = readJsonFile(file);
});

console.log('\n📊 Data Summary:');
Object.keys(data).forEach(key => {
  if (data[key]) {
    const extracted = extractStorageValue(data[key]);
    const active = filterActiveItems(extracted);
    console.log(`   ${key}: ${active.length} active items (${extracted.length} total)`);
    
    // Show latest items
    if (active.length > 0) {
      const latest = active[active.length - 1];
      const timestamp = latest.created || latest.timestamp || 'No timestamp';
      console.log(`      Latest: ${latest.id || latest.poNo || latest.grnNo || latest.paymentNo || 'No ID'} (${timestamp})`);
    }
  } else {
    console.log(`   ${key}: FILE NOT FOUND`);
  }
});

console.log('\n📋 2. Checking GRN → Finance Notification Flow...');
console.log('-'.repeat(50));

const grnRecords = filterActiveItems(extractStorageValue(data['gt_grn']));
const financeNotifications = filterActiveItems(extractStorageValue(data['gt_financeNotifications']));

console.log(`📊 Total GRN records: ${grnRecords.length}`);
console.log(`📊 Total finance notifications: ${financeNotifications.length}`);

if (grnRecords.length > 0) {
  console.log('\n📋 GRN Records:');
  grnRecords.forEach((grn, index) => {
    console.log(`   ${index + 1}. GRN: ${grn.grnNo}`);
    console.log(`      PO: ${grn.poNo}`);
    console.log(`      Supplier: ${grn.supplier}`);
    console.log(`      Product: ${grn.productItem}`);
    console.log(`      Qty: ${grn.qtyReceived}`);
    console.log(`      Created: ${grn.created}`);
    console.log(`      Status: ${grn.status}`);
    
    // Check if finance notification exists for this GRN
    const hasNotification = financeNotifications.find(n => 
      n.grnNo === grn.grnNo && n.poNo === grn.poNo
    );
    
    if (hasNotification) {
      console.log(`      ✅ Finance notification: EXISTS (${hasNotification.status})`);
    } else {
      console.log(`      ❌ Finance notification: MISSING`);
    }
    console.log('');
  });
}

if (financeNotifications.length > 0) {
  console.log('📋 Finance Notifications:');
  financeNotifications.forEach((notif, index) => {
    console.log(`   ${index + 1}. ID: ${notif.id}`);
    console.log(`      PO: ${notif.poNo}`);
    console.log(`      GRN: ${notif.grnNo}`);
    console.log(`      Supplier: ${notif.supplier}`);
    console.log(`      Total: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
    console.log(`      Status: ${notif.status}`);
    console.log(`      Created: ${notif.created}`);
    console.log('');
  });
}

console.log('📋 3. Checking GT Payments Module Data Loading...');
console.log('-'.repeat(50));

// Simulate GT Payments loadPurchaseOrders function
const pendingNotifications = financeNotifications.filter(notif =>
  notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
);

console.log(`⏳ Pending notifications for GT Payments: ${pendingNotifications.length}`);

if (pendingNotifications.length > 0) {
  console.log('\n📋 Notifications GT Payments Should Show:');
  pendingNotifications.forEach((notif, index) => {
    console.log(`   ${index + 1}. PO: ${notif.poNo}`);
    console.log(`      GRN: ${notif.grnNo}`);
    console.log(`      Supplier: ${notif.supplier}`);
    console.log(`      Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
    console.log(`      Status: ${notif.status}`);
    console.log('');
  });
} else {
  console.log('❌ No pending notifications found for GT Payments');
}

console.log('📋 4. Troubleshooting Steps...');
console.log('-'.repeat(50));

if (grnRecords.length === 0) {
  console.log('❌ No GRN records found');
  console.log('   → Create a GRN in GT Purchasing first');
} else if (financeNotifications.length === 0) {
  console.log('❌ No finance notifications found');
  console.log('   → GRN creation is not triggering finance notification');
  console.log('   → Check GT Purchasing GRN creation logic');
} else if (pendingNotifications.length === 0) {
  console.log('❌ No pending notifications');
  console.log('   → All notifications have been processed or closed');
} else {
  console.log('✅ Data looks correct');
  console.log('   → GT Payments should show notifications');
  console.log('   → Check GT Payments module loading');
}

console.log('\n🔧 Potential Issues:');
console.log('1. GT Purchasing GRN creation not calling finance notification creation');
console.log('2. Cross-device sync issue - data not syncing between devices');
console.log('3. GT Payments module not loading data correctly');
console.log('4. Browser cache issue - old data being shown');
console.log('5. Storage service not saving/loading correctly');

console.log('\n🎯 Next Steps:');
console.log('1. Create a new GRN in GT Purchasing');
console.log('2. Check if finance notification is created immediately');
console.log('3. Refresh GT Payments module');
console.log('4. Check browser console for errors');
console.log('5. Try force reload or clear cache');

// Check file timestamps
console.log('\n📅 File Timestamps:');
files.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`   ${file}: ${stats.mtime.toISOString()}`);
    }
  } catch (e) {
    console.log(`   ${file}: Error reading timestamp`);
  }
});

console.log('\n📊 Summary:');
console.log(`   GRN Records: ${grnRecords.length}`);
console.log(`   Finance Notifications: ${financeNotifications.length}`);
console.log(`   Pending for Payment: ${pendingNotifications.length}`);
console.log(`   Missing Notifications: ${grnRecords.length - financeNotifications.length}`);