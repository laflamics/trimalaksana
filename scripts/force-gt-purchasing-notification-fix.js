#!/usr/bin/env node

/**
 * Force GT Purchasing Notification Fix
 * 
 * Memaksa pembuatan finance notification untuk semua GRN yang belum punya notification
 * dan memastikan GT Payments bisa membaca data terbaru
 */

const fs = require('fs');

console.log('🔧 Force GT Purchasing Notification Fix');
console.log('='.repeat(60));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) {
      console.log(`❌ File not found: ${path}`);
      return null;
    }
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`❌ Error reading ${path}: ${e.message}`);
    return null;
  }
};

const writeJsonFile = (path, data) => {
  try {
    // Ensure directory exists
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`✅ Written ${path}`);
    return true;
  } catch (e) {
    console.log(`❌ Error writing ${path}: ${e.message}`);
    return false;
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

console.log('📋 Step 1: Loading Current Data...');
console.log('-'.repeat(50));

// Load data
const grnFile = 'data/localStorage/general-trading/gt_grn.json';
const poFile = 'data/localStorage/general-trading/gt_purchaseOrders.json';
const financeNotifFile = 'data/localStorage/general-trading/gt_financeNotifications.json';

const grnData = readJsonFile(grnFile);
const poData = readJsonFile(poFile);
const financeNotifData = readJsonFile(financeNotifFile);

if (!grnData || !poData) {
  console.log('❌ Missing required data files');
  process.exit(1);
}

const grnRecords = filterActiveItems(extractStorageValue(grnData));
const purchaseOrders = filterActiveItems(extractStorageValue(poData));
const existingNotifications = filterActiveItems(extractStorageValue(financeNotifData));

console.log(`📊 GRN Records: ${grnRecords.length}`);
console.log(`📊 Purchase Orders: ${purchaseOrders.length}`);
console.log(`📊 Existing Finance Notifications: ${existingNotifications.length}`);

// Show latest data
if (grnRecords.length > 0) {
  const latestGRN = grnRecords[grnRecords.length - 1];
  console.log(`📋 Latest GRN: ${latestGRN.grnNo} (${latestGRN.created})`);
}

if (existingNotifications.length > 0) {
  const latestNotif = existingNotifications[existingNotifications.length - 1];
  console.log(`📋 Latest Notification: ${latestNotif.grnNo} (${latestNotif.created})`);
}

console.log('\n📋 Step 2: Finding Missing Notifications...');
console.log('-'.repeat(50));

const missingNotifications = [];

grnRecords.forEach(grn => {
  // Find corresponding PO
  const po = purchaseOrders.find(p => p.poNo === grn.poNo);
  if (!po) {
    console.log(`⚠️  No PO found for GRN ${grn.grnNo}`);
    return;
  }
  
  // Check if finance notification exists
  const existingNotif = existingNotifications.find(n => 
    n.poNo === grn.poNo && n.grnNo === grn.grnNo && n.type === 'SUPPLIER_PAYMENT'
  );
  
  if (!existingNotif) {
    console.log(`❌ Missing notification for GRN ${grn.grnNo} (PO: ${grn.poNo})`);
    
    // Calculate total per GRN
    const unitPrice = po.price || 0;
    const qtyReceived = grn.qtyReceived || 0;
    const subtotal = Math.ceil(qtyReceived * unitPrice);
    const discountPercent = po.discountPercent || 0;
    const discountAmount = subtotal * discountPercent / 100;
    const grnTotal = Math.ceil(subtotal - discountAmount);
    
    const newNotification = {
      id: `payment-${Date.now()}-${grn.poNo}-${grn.grnNo}`,
      type: 'SUPPLIER_PAYMENT',
      poNo: grn.poNo,
      supplier: grn.supplier || po.supplier,
      soNo: grn.soNo || po.soNo || '',
      spkNo: grn.spkNo || po.spkNo || '',
      grnNo: grn.grnNo,
      productItem: grn.productItem || po.productItem || '',
      productName: grn.productName || po.productName || grn.productItem || po.productItem || '',
      productId: grn.productId || po.productId || '',
      qty: qtyReceived,
      total: grnTotal,
      unitPrice: unitPrice,
      discountPercent: discountPercent,
      receivedDate: grn.receivedDate,
      suratJalan: grn.suratJalan || '',
      suratJalanName: grn.suratJalanName || '',
      invoiceNo: grn.invoiceNo || '',
      invoiceFile: grn.invoiceFile || '',
      invoiceFileName: grn.invoiceFileName || '',
      purchaseReason: po.purchaseReason || '',
      status: 'PENDING',
      created: grn.created || new Date().toISOString(),
    };
    
    missingNotifications.push(newNotification);
    
    console.log(`   ✅ Will create notification:`);
    console.log(`      PO: ${grn.poNo}`);
    console.log(`      GRN: ${grn.grnNo}`);
    console.log(`      Supplier: ${grn.supplier}`);
    console.log(`      Product: ${grn.productItem}`);
    console.log(`      Qty: ${qtyReceived}`);
    console.log(`      Total: Rp ${grnTotal.toLocaleString('id-ID')}`);
  } else {
    console.log(`✅ Notification exists for GRN ${grn.grnNo} (Status: ${existingNotif.status})`);
  }
});

console.log(`\n📊 Missing notifications to create: ${missingNotifications.length}`);

if (missingNotifications.length === 0) {
  console.log('🎉 All GRN records have corresponding finance notifications!');
} else {
  console.log('\n📋 Step 3: Creating Missing Notifications...');
  console.log('-'.repeat(50));
  
  // Create updated notifications array
  const updatedNotifications = [...existingNotifications, ...missingNotifications];
  
  // Create proper storage format
  const financeNotifStorageData = {
    value: updatedNotifications,
    timestamp: Date.now(),
    _timestamp: Date.now()
  };
  
  // Write to file
  if (writeJsonFile(financeNotifFile, financeNotifStorageData)) {
    console.log(`✅ Successfully created ${missingNotifications.length} finance notifications`);
    console.log(`📊 Total notifications: ${updatedNotifications.length}`);
  } else {
    console.log('❌ Failed to write finance notifications file');
    process.exit(1);
  }
}

console.log('\n📋 Step 4: Verifying GT Payments Data Loading...');
console.log('-'.repeat(50));

// Re-read the updated data
const updatedFinanceNotifData = readJsonFile(financeNotifFile);
const updatedNotifications = filterActiveItems(extractStorageValue(updatedFinanceNotifData));

const pendingNotifications = updatedNotifications.filter(notif =>
  notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
);

console.log(`⏳ Pending notifications for GT Payments: ${pendingNotifications.length}`);

if (pendingNotifications.length > 0) {
  console.log('\n📋 Notifications GT Payments Should Show:');
  pendingNotifications.forEach((notif, index) => {
    console.log(`   ${index + 1}. PO: ${notif.poNo}`);
    console.log(`      GRN: ${notif.grnNo}`);
    console.log(`      Supplier: ${notif.supplier}`);
    console.log(`      Product: ${notif.productItem}`);
    console.log(`      Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
    console.log(`      Status: ${notif.status}`);
    console.log(`      Created: ${notif.created}`);
    console.log('');
  });
  
  // Create NotificationBell format test
  console.log('🔔 NotificationBell Format:');
  pendingNotifications.forEach((notif, index) => {
    const bellNotif = {
      id: notif.id,
      title: `PO ${notif.poNo || 'N/A'}`,
      message: `Supplier: ${notif.supplier || 'N/A'} | Product: ${notif.productItem || 'N/A'} | Qty: ${notif.qty || 0} PCS | Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`,
      timestamp: notif.receivedDate || notif.created || notif.timestamp,
    };
    
    console.log(`   ${index + 1}. ${bellNotif.title}`);
    console.log(`      ${bellNotif.message}`);
    console.log('');
  });
}

console.log('📋 Step 5: Force Refresh Instructions...');
console.log('-'.repeat(50));

console.log('🎯 To see notifications in GT Payments:');
console.log('1. Go to GT Payments module');
console.log('2. Look for notification bell (💰) in the header');
console.log('3. If no notifications appear, try:');
console.log('   - Refresh the page (F5)');
console.log('   - Clear browser cache');
console.log('   - Check browser console for errors');
console.log('4. Click notification to load payment form');
console.log('5. Process payment to close notification');

console.log('\n🔧 If still not working:');
console.log('1. Check GT Purchasing GRN creation code');
console.log('2. Verify storage service is working correctly');
console.log('3. Check cross-device sync functionality');
console.log('4. Verify GT Payments loadPurchaseOrders function');

console.log('\n📊 Final Summary:');
console.log(`   GRN Records: ${grnRecords.length}`);
console.log(`   Finance Notifications: ${updatedNotifications.length}`);
console.log(`   Pending for Payment: ${pendingNotifications.length}`);
console.log(`   Created New: ${missingNotifications.length}`);

if (pendingNotifications.length > 0) {
  console.log('\n🎉 SUCCESS: GT Payments should now show notifications!');
} else {
  console.log('\n⚠️  No pending notifications found. Create a new GRN to test.');
}