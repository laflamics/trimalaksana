#!/usr/bin/env node

/**
 * Fix Missing GT Finance Notification
 * 
 * Create missing finance notification for existing GRN
 */

const fs = require('fs');

console.log('🔧 Fix Missing GT Finance Notification');
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

const writeJsonFile = (path, data) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.log(`   ❌ Error writing ${path}: ${e.message}`);
    return false;
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

console.log('📋 1. Loading GT Data...');
console.log('-'.repeat(50));

// Load GT data
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
const poRecords = filterActiveItems(extractStorageValue(poData));
const existingNotifications = filterActiveItems(extractStorageValue(financeNotifData));

console.log(`📊 Found ${grnRecords.length} GRN records`);
console.log(`📊 Found ${poRecords.length} PO records`);
console.log(`📊 Found ${existingNotifications.length} existing finance notifications`);

console.log('\n📋 2. Checking Missing Notifications...');
console.log('-'.repeat(50));

const missingNotifications = [];

grnRecords.forEach(grn => {
  // Find corresponding PO
  const po = poRecords.find(p => p.poNo === grn.poNo);
  if (!po) {
    console.log(`⚠️  No PO found for GRN ${grn.grnNo}`);
    return;
  }
  
  // Check if finance notification exists
  const existingNotif = existingNotifications.find(n => 
    n.poNo === grn.poNo && n.grnNo === grn.grnNo && n.type === 'SUPPLIER_PAYMENT'
  );
  
  if (!existingNotif) {
    console.log(`❌ Missing finance notification for GRN ${grn.grnNo} (PO: ${grn.poNo})`);
    
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
    
    console.log(`   ✅ Created notification for GRN ${grn.grnNo}`);
    console.log(`      PO: ${grn.poNo}`);
    console.log(`      Supplier: ${grn.supplier}`);
    console.log(`      Product: ${grn.productItem}`);
    console.log(`      Qty: ${qtyReceived}`);
    console.log(`      Total: Rp ${grnTotal.toLocaleString('id-ID')}`);
  } else {
    console.log(`✅ Finance notification exists for GRN ${grn.grnNo}`);
  }
});

if (missingNotifications.length === 0) {
  console.log('\n🎉 All GRN records have corresponding finance notifications!');
  process.exit(0);
}

console.log(`\n📋 3. Creating ${missingNotifications.length} Missing Notifications...`);
console.log('-'.repeat(50));

// Prepare updated finance notifications
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
  
  console.log('\n📋 Created Notifications:');
  missingNotifications.forEach((notif, index) => {
    console.log(`   ${index + 1}. GRN: ${notif.grnNo}`);
    console.log(`      PO: ${notif.poNo}`);
    console.log(`      Supplier: ${notif.supplier}`);
    console.log(`      Total: Rp ${notif.total.toLocaleString('id-ID')}`);
    console.log(`      Status: ${notif.status}`);
    console.log('');
  });
  
  console.log('🎯 Next Steps:');
  console.log('   1. Go to GT Payments module');
  console.log('   2. Check notification bell for new notifications');
  console.log('   3. Process payments to close notifications');
  
} else {
  console.log('❌ Failed to write finance notifications file');
  process.exit(1);
}