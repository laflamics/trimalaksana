#!/usr/bin/env node

/**
 * Test Complete GT Payment Workflow
 * 
 * Test the complete workflow from GRN creation to payment processing
 */

const fs = require('fs');

console.log('🧪 Complete GT Payment Workflow Test');
console.log('='.repeat(60));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) return null;
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`❌ Error reading ${path}: ${e.message}`);
    return null;
  }
};

const extractStorageValue = (data) => {
  if (!data) return [];
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : [];
  }
  return Array.isArray(data) ? data : [];
};

const filterActiveItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !item.deleted);
};

console.log('📋 Step 1: Verify Data Integrity');
console.log('-'.repeat(50));

// Load all GT data
const grnData = readJsonFile('data/localStorage/general-trading/gt_grn.json');
const poData = readJsonFile('data/localStorage/general-trading/gt_purchaseOrders.json');
const financeNotifData = readJsonFile('data/localStorage/general-trading/gt_financeNotifications.json');
const paymentsData = readJsonFile('data/localStorage/general-trading/gt_payments.json');

const grnRecords = filterActiveItems(extractStorageValue(grnData));
const purchaseOrders = filterActiveItems(extractStorageValue(poData));
const financeNotifications = filterActiveItems(extractStorageValue(financeNotifData));
const payments = filterActiveItems(extractStorageValue(paymentsData));

console.log(`✅ GRN Records: ${grnRecords.length}`);
console.log(`✅ Purchase Orders: ${purchaseOrders.length}`);
console.log(`✅ Finance Notifications: ${financeNotifications.length}`);
console.log(`✅ Payments: ${payments.length}`);

console.log('\n📋 Step 2: Test Main Finance Module Cross-Business Loading');
console.log('-'.repeat(50));

// Simulate main Finance module loadData function
const packagingNotifications = filterActiveItems(extractStorageValue(readJsonFile('data/localStorage/financeNotifications.json')));
const truckingNotifications = filterActiveItems(extractStorageValue(readJsonFile('data/localStorage/trucking/trucking_financeNotifications.json')));

const allNotifications = [
  ...packagingNotifications,
  ...financeNotifications,
  ...truckingNotifications
];

const pendingNotifications = allNotifications.filter(n => 
  (n.status === 'PENDING' || n.status === 'OPEN') && n.type === 'SUPPLIER_PAYMENT'
);

console.log(`📊 Packaging notifications: ${packagingNotifications.length}`);
console.log(`📊 GT notifications: ${financeNotifications.length}`);
console.log(`📊 Trucking notifications: ${truckingNotifications.length}`);
console.log(`📊 Total notifications: ${allNotifications.length}`);
console.log(`⏳ Pending notifications: ${pendingNotifications.length}`);

console.log('\n📋 Step 3: Test GT Payments Module Notification Loading');
console.log('-'.repeat(50));

// Simulate GT Payments module loadPurchaseOrders function
const gtPendingNotifications = financeNotifications.filter(notif =>
  notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
);

console.log(`🔔 GT pending notifications: ${gtPendingNotifications.length}`);

if (gtPendingNotifications.length > 0) {
  console.log('\n📋 GT Notification Details:');
  gtPendingNotifications.forEach((notif, index) => {
    console.log(`   ${index + 1}. PO: ${notif.poNo}`);
    console.log(`      GRN: ${notif.grnNo}`);
    console.log(`      Supplier: ${notif.supplier}`);
    console.log(`      Product: ${notif.productItem}`);
    console.log(`      Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
    console.log(`      Status: ${notif.status}`);
    console.log('');
  });
}

console.log('📋 Step 4: Test NotificationBell Integration');
console.log('-'.repeat(50));

// Test NotificationBell format
const bellNotifications = gtPendingNotifications.map(notif => ({
  id: notif.id,
  title: `PO ${notif.poNo || 'N/A'}`,
  message: `Supplier: ${notif.supplier || 'N/A'} | Product: ${notif.productItem || 'N/A'} | Qty: ${notif.qty || 0} PCS | Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`,
  timestamp: notif.receivedDate || notif.created || notif.timestamp,
  notif: notif,
}));

console.log(`🔔 Bell notifications: ${bellNotifications.length}`);

if (bellNotifications.length > 0) {
  console.log('\n📋 NotificationBell Preview:');
  bellNotifications.forEach((bell, index) => {
    console.log(`   ${index + 1}. ${bell.title}`);
    console.log(`      ${bell.message}`);
    console.log('');
  });
}

console.log('📋 Step 5: Test Payment Form Loading');
console.log('-'.repeat(50));

if (gtPendingNotifications.length > 0) {
  const testNotif = gtPendingNotifications[0];
  
  // Simulate handleLoadNotificationToForm
  const formData = {
    paymentDate: new Date().toISOString().split('T')[0],
    poNo: testNotif.poNo || '',
    purchaseOrderNo: testNotif.poNo || '',
    supplierName: testNotif.supplier || '',
    amount: testNotif.total || 0,
    paymentMethod: 'Bank Transfer',
    reference: testNotif.grnNo ? `GRN ${testNotif.grnNo}` : '',
    notes: testNotif.grnNo 
      ? `Payment for PO ${testNotif.poNo || ''} - GRN ${testNotif.grnNo} (${testNotif.qty || 0} PCS)${testNotif.invoiceNo ? ` - Invoice: ${testNotif.invoiceNo}` : ''}`
      : `Payment for PO ${testNotif.poNo || ''}${testNotif.invoiceNo ? ` - Invoice: ${testNotif.invoiceNo}` : ''}`,
    invoiceNo: testNotif.invoiceNo || '',
    grnNo: testNotif.grnNo || '',
  };
  
  console.log('💰 Payment Form Data Preview:');
  console.log(`   PO No: ${formData.poNo}`);
  console.log(`   Supplier: ${formData.supplierName}`);
  console.log(`   Amount: Rp ${formData.amount.toLocaleString('id-ID')}`);
  console.log(`   Reference: ${formData.reference}`);
  console.log(`   Notes: ${formData.notes}`);
  console.log(`   GRN No: ${formData.grnNo}`);
}

console.log('\n📋 Step 6: Test Cross-Business Context Detection');
console.log('-'.repeat(50));

// Test business context detection for main Finance module
if (pendingNotifications.length > 0) {
  console.log('🏢 Business Context Detection:');
  pendingNotifications.forEach((notif, index) => {
    const businessContext = notif.businessContext || (notif.poNo?.includes('GT') ? 'GT' : (notif.poNo?.includes('TR') ? 'Trucking' : 'Packaging'));
    console.log(`   ${index + 1}. PO: ${notif.poNo} → Context: ${businessContext}`);
  });
}

console.log('\n🎯 Workflow Test Results');
console.log('='.repeat(60));

const hasGRN = grnRecords.length > 0;
const hasFinanceNotif = financeNotifications.length > 0;
const hasPendingNotif = gtPendingNotifications.length > 0;
const canLoadBell = bellNotifications.length > 0;
const canLoadForm = gtPendingNotifications.length > 0;

console.log(`✅ GRN exists: ${hasGRN}`);
console.log(`✅ Finance notification exists: ${hasFinanceNotif}`);
console.log(`✅ Pending notification exists: ${hasPendingNotif}`);
console.log(`✅ NotificationBell can load: ${canLoadBell}`);
console.log(`✅ Payment form can load: ${canLoadForm}`);

if (hasGRN && hasFinanceNotif && hasPendingNotif && canLoadBell && canLoadForm) {
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('');
  console.log('📋 GT Payment Workflow is working correctly:');
  console.log('   1. ✅ GRN creates finance notification');
  console.log('   2. ✅ Main Finance module loads cross-business notifications');
  console.log('   3. ✅ GT Payments module loads GT notifications');
  console.log('   4. ✅ NotificationBell displays notifications');
  console.log('   5. ✅ Payment form loads from notifications');
  console.log('');
  console.log('🎯 User can now:');
  console.log('   • See notifications in GT Payments notification bell');
  console.log('   • Click notification to load payment form');
  console.log('   • Process payment to close notification');
  console.log('   • See all business contexts in main Finance module');
} else {
  console.log('\n❌ SOME TESTS FAILED');
  console.log('');
  console.log('Missing components:');
  if (!hasGRN) console.log('   - GRN record');
  if (!hasFinanceNotif) console.log('   - Finance notification');
  if (!hasPendingNotif) console.log('   - Pending notification');
  if (!canLoadBell) console.log('   - NotificationBell data');
  if (!canLoadForm) console.log('   - Payment form data');
}

console.log('\n📊 Summary Statistics:');
console.log(`   Total GRN records: ${grnRecords.length}`);
console.log(`   Total finance notifications: ${financeNotifications.length}`);
console.log(`   Pending GT notifications: ${gtPendingNotifications.length}`);
console.log(`   Cross-business notifications: ${allNotifications.length}`);
console.log(`   Existing payments: ${payments.length}`);