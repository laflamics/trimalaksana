#!/usr/bin/env node

/**
 * Debug GT Payment Notifications
 * 
 * Debug mengapa notifikasi tidak sampai ke GT Payment module
 */

const fs = require('fs');

console.log('🔍 GT Payment Notifications Debug');
console.log('='.repeat(60));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) return null;
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`   ❌ Error reading ${path}: ${e.message}`);
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

console.log('📋 1. Checking GT Finance Notifications...');
console.log('-'.repeat(50));

const financeNotifFile = 'data/localStorage/general-trading/gt_financeNotifications.json';
const financeNotifData = readJsonFile(financeNotifFile);

if (!financeNotifData) {
  console.log('❌ GT Finance notifications file not found!');
  console.log('   This means no GRN has been created yet in GT Purchasing.');
} else {
  const extracted = extractStorageValue(financeNotifData);
  const active = filterActiveItems(extracted);
  const supplierPayments = active.filter(n => n.type === 'SUPPLIER_PAYMENT');
  const pending = supplierPayments.filter(n => 
    (n.status === 'PENDING' || n.status === 'OPEN') && n.type === 'SUPPLIER_PAYMENT'
  );
  
  console.log(`📊 Total notifications: ${extracted.length}`);
  console.log(`💰 Supplier payment notifications: ${supplierPayments.length}`);
  console.log(`⏳ Pending notifications: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('\n📋 Pending Notifications:');
    pending.forEach((notif, index) => {
      console.log(`   ${index + 1}. PO: ${notif.poNo || 'N/A'}`);
      console.log(`      Supplier: ${notif.supplier || 'N/A'}`);
      console.log(`      GRN: ${notif.grnNo || 'N/A'}`);
      console.log(`      Total: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
      console.log(`      Status: ${notif.status || 'PENDING'}`);
      console.log(`      Created: ${notif.created || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No pending notifications found.');
  }
}

console.log('📋 2. Checking GT Purchase Orders...');
console.log('-'.repeat(50));

const poFile = 'data/localStorage/general-trading/gt_purchaseOrders.json';
const poData = readJsonFile(poFile);

if (!poData) {
  console.log('❌ GT Purchase orders file not found!');
} else {
  const extracted = extractStorageValue(poData);
  const active = filterActiveItems(extracted);
  const open = active.filter(po => po.status === 'OPEN');
  const close = active.filter(po => po.status === 'CLOSE');
  
  console.log(`📊 Total POs: ${extracted.length}`);
  console.log(`✅ Active POs: ${active.length}`);
  console.log(`🔓 Open POs: ${open.length}`);
  console.log(`🔒 Closed POs: ${close.length}`);
  
  if (open.length > 0) {
    console.log('\n📋 Open POs:');
    open.forEach((po, index) => {
      console.log(`   ${index + 1}. PO: ${po.poNo || 'N/A'}`);
      console.log(`      Supplier: ${po.supplier || 'N/A'}`);
      console.log(`      Product: ${po.productItem || po.materialItem || 'N/A'}`);
      console.log(`      Total: Rp ${(po.total || 0).toLocaleString('id-ID')}`);
      console.log(`      Status: ${po.status || 'OPEN'}`);
      console.log('');
    });
  }
}

console.log('📋 3. Checking GT GRN Records...');
console.log('-'.repeat(50));

const grnFile = 'data/localStorage/general-trading/gt_grn.json';
const grnData = readJsonFile(grnFile);

if (!grnData) {
  console.log('❌ GT GRN file not found!');
  console.log('   This means no GRN has been created yet.');
} else {
  const extracted = extractStorageValue(grnData);
  const active = filterActiveItems(extracted);
  
  console.log(`📊 Total GRNs: ${extracted.length}`);
  console.log(`✅ Active GRNs: ${active.length}`);
  
  if (active.length > 0) {
    console.log('\n📋 GRN Records:');
    active.forEach((grn, index) => {
      console.log(`   ${index + 1}. GRN: ${grn.grnNo || 'N/A'}`);
      console.log(`      PO: ${grn.poNo || 'N/A'}`);
      console.log(`      Product: ${grn.productItem || grn.materialItem || 'N/A'}`);
      console.log(`      Qty Received: ${grn.qtyReceived || 0}`);
      console.log(`      Received Date: ${grn.receivedDate || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No GRN records found.');
  }
}

console.log('📋 4. Checking GT Payments...');
console.log('-'.repeat(50));

const paymentsFile = 'data/localStorage/general-trading/gt_payments.json';
const paymentsData = readJsonFile(paymentsFile);

if (!paymentsData) {
  console.log('❌ GT Payments file not found!');
} else {
  const extracted = extractStorageValue(paymentsData);
  const active = filterActiveItems(extracted);
  
  console.log(`📊 Total payments: ${extracted.length}`);
  console.log(`✅ Active payments: ${active.length}`);
  
  if (active.length > 0) {
    console.log('\n📋 Payment Records:');
    active.forEach((payment, index) => {
      console.log(`   ${index + 1}. Payment: ${payment.paymentNo || 'N/A'}`);
      console.log(`      PO: ${payment.poNo || payment.purchaseOrderNo || 'N/A'}`);
      console.log(`      Supplier: ${payment.supplierName || payment.supplier || 'N/A'}`);
      console.log(`      Amount: Rp ${(payment.amount || 0).toLocaleString('id-ID')}`);
      console.log(`      Date: ${payment.paymentDate || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No payment records found.');
  }
}

console.log('📋 5. Workflow Analysis...');
console.log('-'.repeat(50));

console.log('🔄 GT Payment Workflow:');
console.log('   1. GT Purchasing: Create PO');
console.log('   2. GT Purchasing: Create GRN (Good Receipt Note)');
console.log('   3. GT Purchasing: Auto-create finance notification to gt_financeNotifications');
console.log('   4. GT Payments: Load notifications from gt_financeNotifications');
console.log('   5. GT Payments: Process payment and close notification');

console.log('\n🔍 Troubleshooting Steps:');

if (!financeNotifData) {
  console.log('❌ Step 1: No finance notifications found');
  console.log('   → Create a GRN in GT Purchasing first');
  console.log('   → Check if GRN creation triggers finance notification');
} else {
  const extracted = extractStorageValue(financeNotifData);
  const pending = extracted.filter(n => 
    (n.status === 'PENDING' || n.status === 'OPEN') && n.type === 'SUPPLIER_PAYMENT'
  );
  
  if (pending.length === 0) {
    console.log('⚠️  Step 2: No pending notifications');
    console.log('   → All notifications have been processed');
    console.log('   → Create a new GRN to generate new notifications');
  } else {
    console.log('✅ Step 3: Notifications are available');
    console.log('   → GT Payments should show these notifications');
    console.log('   → Check GT Payments module for notification bell');
  }
}

if (!grnData) {
  console.log('❌ Step 4: No GRN records found');
  console.log('   → Create GRN in GT Purchasing module');
  console.log('   → GRN creation should trigger finance notification');
} else {
  const extracted = extractStorageValue(grnData);
  if (extracted.length === 0) {
    console.log('❌ Step 5: No GRN records');
    console.log('   → Create GRN in GT Purchasing module');
  } else {
    console.log('✅ Step 6: GRN records exist');
    console.log('   → Check if each GRN has corresponding finance notification');
  }
}

console.log('\n🎯 Next Steps:');
console.log('   1. Go to GT Purchasing module');
console.log('   2. Create a GRN for an existing PO');
console.log('   3. Check if finance notification is created');
console.log('   4. Go to GT Payments module');
console.log('   5. Check if notification appears in notification bell');
console.log('   6. Process the payment to close the notification');

console.log('\n📊 Summary:');
const hasNotifications = financeNotifData && extractStorageValue(financeNotifData).length > 0;
const hasGRN = grnData && extractStorageValue(grnData).length > 0;
const hasPO = poData && extractStorageValue(poData).length > 0;

if (hasNotifications && hasGRN && hasPO) {
  console.log('🎉 All data exists! GT Payments should work correctly.');
} else {
  console.log('⚠️  Missing data detected:');
  if (!hasPO) console.log('   - No Purchase Orders found');
  if (!hasGRN) console.log('   - No GRN records found');
  if (!hasNotifications) console.log('   - No finance notifications found');
  console.log('   → Create missing data in GT Purchasing module');
}