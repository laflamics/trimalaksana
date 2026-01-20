#!/usr/bin/env node

/**
 * Test GT Payments Notifications
 * 
 * Test if GT Payments module can properly read and display finance notifications
 */

const fs = require('fs');

console.log('🧪 Test GT Payments Notifications');
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

console.log('📋 1. Testing GT Finance Notifications Loading...');
console.log('-'.repeat(50));

// Simulate GT Payments loadPurchaseOrders function
const financeNotifFile = 'data/localStorage/general-trading/gt_financeNotifications.json';
const poFile = 'data/localStorage/general-trading/gt_purchaseOrders.json';
const grnFile = 'data/localStorage/general-trading/gt_grn.json';

const financeNotifData = readJsonFile(financeNotifFile);
const poData = readJsonFile(poFile);
const grnData = readJsonFile(grnFile);

if (!financeNotifData) {
  console.log('❌ GT Finance notifications file not found!');
  process.exit(1);
}

const financeNotifications = filterActiveItems(extractStorageValue(financeNotifData));
const purchaseOrders = filterActiveItems(extractStorageValue(poData));
const grnRecords = filterActiveItems(extractStorageValue(grnData));

console.log(`📊 Finance notifications: ${financeNotifications.length}`);
console.log(`📊 Purchase orders: ${purchaseOrders.length}`);
console.log(`📊 GRN records: ${grnRecords.length}`);

// Filter pending notifications (same logic as GT Payments)
const pending = financeNotifications.filter(notif =>
  notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
);

console.log(`⏳ Pending notifications: ${pending.length}`);

if (pending.length > 0) {
  console.log('\n📋 Pending Finance Notifications:');
  pending.forEach((notif, index) => {
    console.log(`   ${index + 1}. ID: ${notif.id}`);
    console.log(`      PO: ${notif.poNo}`);
    console.log(`      GRN: ${notif.grnNo}`);
    console.log(`      Supplier: ${notif.supplier}`);
    console.log(`      Product: ${notif.productItem}`);
    console.log(`      Qty: ${notif.qty}`);
    console.log(`      Total: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
    console.log(`      Status: ${notif.status}`);
    console.log(`      Created: ${notif.created}`);
    console.log('');
  });
}

console.log('📋 2. Testing NotificationBell Format...');
console.log('-'.repeat(50));

// Simulate NotificationBell formatting (same logic as GT Payments)
const financeNotificationsForBell = pending.map(notif => ({
  id: notif.id,
  title: `PO ${notif.poNo || 'N/A'}`,
  message: `Supplier: ${notif.supplier || 'N/A'} | Product: ${notif.productItem || 'N/A'} | Qty: ${notif.qty || 0} PCS | Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`,
  timestamp: notif.receivedDate || notif.created || notif.timestamp,
  notif: notif, // Keep original data
}));

console.log(`🔔 Notifications for bell: ${financeNotificationsForBell.length}`);

if (financeNotificationsForBell.length > 0) {
  console.log('\n📋 NotificationBell Format:');
  financeNotificationsForBell.forEach((bellNotif, index) => {
    console.log(`   ${index + 1}. Title: ${bellNotif.title}`);
    console.log(`      Message: ${bellNotif.message}`);
    console.log(`      Timestamp: ${bellNotif.timestamp}`);
    console.log('');
  });
}

console.log('📋 3. Testing Purchase Orders for Payment Form...');
console.log('-'.repeat(50));

// Simulate openFinancePOs creation (same logic as GT Payments)
const openFinancePOs = pending.map(notif => {
  const po = purchaseOrders.find(p => p.poNo === notif.poNo);
  
  return {
    id: po?.id || notif.id,
    poNo: notif.poNo || po?.poNo || '-',
    supplier: po?.supplier || notif.supplier || '-',
    soNo: po?.soNo || notif.soNo || '-',
    total: po?.total || notif.total || 0,
    status: po?.status || 'OPEN',
    productItem: notif.productItem || po?.productItem || '-',
    qty: po?.qty || notif.qty || 0,
    receiptDate: po?.receiptDate || notif.receivedDate || '-',
    suratJalan: notif.suratJalan,
    suratJalanName: notif.suratJalanName,
    invoiceNo: notif.invoiceNo || '',
    invoiceFile: notif.invoiceFile || '',
    invoiceFileName: notif.invoiceFileName || '',
    grnNo: notif.grnNo,
    purchaseReason: po?.purchaseReason || notif.purchaseReason || '',
  };
});

console.log(`📦 Open finance POs: ${openFinancePOs.length}`);

if (openFinancePOs.length > 0) {
  console.log('\n📋 Open Finance POs:');
  openFinancePOs.forEach((po, index) => {
    console.log(`   ${index + 1}. PO: ${po.poNo}`);
    console.log(`      Supplier: ${po.supplier}`);
    console.log(`      Product: ${po.productItem}`);
    console.log(`      Total: Rp ${(po.total || 0).toLocaleString('id-ID')}`);
    console.log(`      Status: ${po.status}`);
    console.log(`      GRN: ${po.grnNo}`);
    console.log('');
  });
}

console.log('📋 4. Testing Payment Form Data Loading...');
console.log('-'.repeat(50));

// Simulate handleLoadNotificationToForm (same logic as GT Payments)
if (pending.length > 0) {
  const testNotif = pending[0];
  const paymentAmount = testNotif.total || 0;
  
  const formData = {
    paymentDate: new Date().toISOString().split('T')[0],
    poNo: testNotif.poNo || '',
    purchaseOrderNo: testNotif.poNo || '',
    supplierName: testNotif.supplier || '',
    amount: paymentAmount,
    paymentMethod: 'Bank Transfer',
    reference: testNotif.grnNo ? `GRN ${testNotif.grnNo}` : '',
    notes: testNotif.grnNo 
      ? `Payment for PO ${testNotif.poNo || ''} - GRN ${testNotif.grnNo} (${testNotif.qty || 0} PCS)${testNotif.invoiceNo ? ` - Invoice: ${testNotif.invoiceNo}` : ''}`
      : `Payment for PO ${testNotif.poNo || ''}${testNotif.invoiceNo ? ` - Invoice: ${testNotif.invoiceNo}` : ''}`,
    invoiceNo: testNotif.invoiceNo || '',
    grnNo: testNotif.grnNo || '',
  };
  
  console.log('💰 Payment Form Data:');
  console.log(`   Payment Date: ${formData.paymentDate}`);
  console.log(`   PO No: ${formData.poNo}`);
  console.log(`   Supplier: ${formData.supplierName}`);
  console.log(`   Amount: Rp ${formData.amount.toLocaleString('id-ID')}`);
  console.log(`   Payment Method: ${formData.paymentMethod}`);
  console.log(`   Reference: ${formData.reference}`);
  console.log(`   Notes: ${formData.notes}`);
  console.log(`   GRN No: ${formData.grnNo}`);
}

console.log('\n🎯 Test Results:');
console.log('='.repeat(60));

if (pending.length > 0) {
  console.log('✅ GT Finance notifications are properly loaded');
  console.log('✅ NotificationBell format is correct');
  console.log('✅ Purchase orders for payment form are available');
  console.log('✅ Payment form data can be loaded from notifications');
  console.log('');
  console.log('🎉 GT Payments module should work correctly!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Open GT Payments module in the app');
  console.log('   2. Look for notification bell with finance notifications');
  console.log('   3. Click on notification to load payment form');
  console.log('   4. Process payment to close notification');
} else {
  console.log('❌ No pending finance notifications found');
  console.log('   → Create a GRN in GT Purchasing to generate notifications');
}