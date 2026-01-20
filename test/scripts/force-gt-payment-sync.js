#!/usr/bin/env node

/**
 * Force GT Payment Sync
 * 
 * Memaksa sinkronisasi data GT Payment dan memastikan semua GRN memiliki finance notification
 */

const fs = require('fs');

console.log('🔄 Force GT Payment Sync');
console.log('='.repeat(50));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) {
      console.log(`❌ File not found: ${path}`);
      return null;
    }
    const content = fs.readFileSync(path, 'utf8');
    const data = JSON.parse(content);
    console.log(`✅ Read ${path}`);
    return data;
  } catch (e) {
    console.log(`❌ Error reading ${path}: ${e.message}`);
    return null;
  }
};

const writeJsonFile = (path, data) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`✅ Written ${path}`);
    return true;
  } catch (e) {
    console.log(`❌ Error writing ${path}: ${e.message}`);
    return false;
  }
};

const extractValue = (data) => {
  if (!data) return [];
  if (data.value) return Array.isArray(data.value) ? data.value : [];
  return Array.isArray(data) ? data : [];
};

// Load data
console.log('\n📋 Loading GT Data...');
const grnData = readJsonFile('data/localStorage/general-trading/gt_grn.json');
const poData = readJsonFile('data/localStorage/general-trading/gt_purchaseOrders.json');
const financeData = readJsonFile('data/localStorage/general-trading/gt_financeNotifications.json');

if (!grnData || !poData) {
  console.log('❌ Required files not found');
  process.exit(1);
}

const grnRecords = extractValue(grnData).filter(item => !item.deleted);
const poRecords = extractValue(poData).filter(item => !item.deleted);
const notifications = extractValue(financeData).filter(item => !item.deleted);

console.log(`📊 GRN Records: ${grnRecords.length}`);
console.log(`📊 PO Records: ${poRecords.length}`);
console.log(`📊 Finance Notifications: ${notifications.length}`);

// Show latest records
if (grnRecords.length > 0) {
  const latest = grnRecords[grnRecords.length - 1];
  console.log(`📋 Latest GRN: ${latest.grnNo} (${latest.created})`);
}

// Check missing notifications
console.log('\n📋 Checking Missing Notifications...');
const missing = [];

grnRecords.forEach(grn => {
  const po = poRecords.find(p => p.poNo === grn.poNo);
  const hasNotif = notifications.find(n => n.grnNo === grn.grnNo && n.poNo === grn.poNo);
  
  if (!hasNotif && po) {
    console.log(`❌ Missing notification for GRN ${grn.grnNo}`);
    
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
    
    missing.push(newNotification);
  } else if (hasNotif) {
    console.log(`✅ Notification exists for GRN ${grn.grnNo}`);
  }
});

// Create missing notifications
if (missing.length > 0) {
  console.log(`\n📋 Creating ${missing.length} Missing Notifications...`);
  
  const updatedNotifications = [...notifications, ...missing];
  const financeNotifStorageData = {
    value: updatedNotifications,
    timestamp: Date.now(),
    _timestamp: Date.now()
  };
  
  if (writeJsonFile('data/localStorage/general-trading/gt_financeNotifications.json', financeNotifStorageData)) {
    console.log(`✅ Created ${missing.length} finance notifications`);
  }
} else {
  console.log('\n✅ All GRNs have finance notifications');
}

// Verify final state
const finalData = readJsonFile('data/localStorage/general-trading/gt_financeNotifications.json');
const finalNotifications = extractValue(finalData).filter(item => !item.deleted);
const pending = finalNotifications.filter(n => n.status === 'PENDING' && n.type === 'SUPPLIER_PAYMENT');

console.log('\n📊 Final State:');
console.log(`   Total notifications: ${finalNotifications.length}`);
console.log(`   Pending notifications: ${pending.length}`);

if (pending.length > 0) {
  console.log('\n📋 Pending Notifications for GT Payments:');
  pending.forEach((n, i) => {
    console.log(`   ${i + 1}. PO: ${n.poNo}, GRN: ${n.grnNo}`);
    console.log(`      Supplier: ${n.supplier}`);
    console.log(`      Amount: Rp ${(n.total || 0).toLocaleString('id-ID')}`);
    console.log('');
  });
  
  console.log('🎉 SUCCESS: GT Payments should now show notifications!');
  console.log('\n🎯 Next Steps:');
  console.log('1. Go to GT Payments module');
  console.log('2. Look for notification bell (💰) in header');
  console.log('3. Should show red badge with notification count');
  console.log('4. Click bell to see notifications');
  console.log('5. Click notification to load payment form');
} else {
  console.log('\n⚠️ No pending notifications found');
  console.log('Create a new GRN in GT Purchasing to test');
}