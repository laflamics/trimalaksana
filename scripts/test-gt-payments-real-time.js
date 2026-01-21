#!/usr/bin/env node

/**
 * Test GT Payments Real Time
 * 
 * Test apakah GT Payments module bisa membaca finance notifications dengan benar
 */

const fs = require('fs');

console.log('🧪 Test GT Payments Real Time');
console.log('='.repeat(60));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) return null;
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (e) {
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

console.log('📋 Simulating GT Payments loadPurchaseOrders Function...');
console.log('-'.repeat(50));

// Simulate exact GT Payments loadPurchaseOrders logic
const loadPurchaseOrders = async () => {
  // Step 1: Load data (same as GT Payments)
  let poDataRaw = readJsonFile('data/localStorage/general-trading/gt_purchaseOrders.json');
  let financeNotifDataRaw = readJsonFile('data/localStorage/general-trading/gt_financeNotifications.json');
  let grnDataRaw = readJsonFile('data/localStorage/general-trading/gt_grn.json');
  
  console.log('📊 Raw data loaded:');
  console.log(`   PO data: ${poDataRaw ? 'EXISTS' : 'NULL'}`);
  console.log(`   Finance notif data: ${financeNotifDataRaw ? 'EXISTS' : 'NULL'}`);
  console.log(`   GRN data: ${grnDataRaw ? 'EXISTS' : 'NULL'}`);
  
  // Step 2: Extract storage values
  const poData = filterActiveItems(extractStorageValue(poDataRaw));
  const financeNotifData = filterActiveItems(extractStorageValue(financeNotifDataRaw));
  const grnData = filterActiveItems(extractStorageValue(grnDataRaw));
  
  console.log('\n📊 Extracted data:');
  console.log(`   PO records: ${poData.length}`);
  console.log(`   Finance notifications: ${financeNotifData.length}`);
  console.log(`   GRN records: ${grnData.length}`);
  
  // Step 3: Filter pending notifications (same logic as GT Payments)
  const pending = financeNotifData.filter(notif =>
    notif.type === 'SUPPLIER_PAYMENT' && (notif.status || 'PENDING').toUpperCase() !== 'CLOSE'
  );
  
  console.log(`\n⏳ Pending notifications: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('\n📋 Pending Notifications Details:');
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
  
  // Step 4: Create NotificationBell format (same as GT Payments)
  const financeNotifications = pending.map(notif => ({
    id: notif.id,
    title: `PO ${notif.poNo || 'N/A'}`,
    message: `Supplier: ${notif.supplier || 'N/A'} | Product: ${notif.productItem || 'N/A'} | Qty: ${notif.qty || 0} PCS | Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`,
    timestamp: notif.receivedDate || notif.created || notif.timestamp,
    notif: notif,
  }));
  
  console.log('🔔 NotificationBell Format:');
  console.log(`   Bell notifications: ${financeNotifications.length}`);
  
  if (financeNotifications.length > 0) {
    console.log('\n📋 NotificationBell Preview:');
    financeNotifications.forEach((bell, index) => {
      console.log(`   ${index + 1}. Title: ${bell.title}`);
      console.log(`      Message: ${bell.message}`);
      console.log(`      Timestamp: ${bell.timestamp}`);
      console.log('');
    });
  }
  
  // Step 5: Create openFinancePOs (same as GT Payments)
  const openFinancePOs = pending.map(notif => {
    const po = poData.find(p => p.poNo === notif.poNo);
    
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
  
  console.log('📦 Open Finance POs:');
  console.log(`   Finance POs: ${openFinancePOs.length}`);
  
  if (openFinancePOs.length > 0) {
    console.log('\n📋 Finance POs Details:');
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
  
  return {
    pendingNotifications: pending,
    financeNotifications,
    openFinancePOs
  };
};

// Run the test
loadPurchaseOrders().then(result => {
  console.log('🎯 Test Results:');
  console.log('='.repeat(60));
  
  const { pendingNotifications, financeNotifications, openFinancePOs } = result;
  
  console.log(`✅ Pending notifications: ${pendingNotifications.length}`);
  console.log(`✅ Bell notifications: ${financeNotifications.length}`);
  console.log(`✅ Finance POs: ${openFinancePOs.length}`);
  
  if (pendingNotifications.length > 0) {
    console.log('\n🎉 SUCCESS: GT Payments should show notifications!');
    console.log('\n📋 What user should see:');
    console.log('1. Notification bell (💰) with red badge showing notification count');
    console.log('2. Clicking bell shows dropdown with notifications');
    console.log('3. Clicking notification loads payment form');
    console.log('4. Payment form pre-filled with notification data');
  } else {
    console.log('\n❌ PROBLEM: No notifications found for GT Payments');
    console.log('\n🔧 Possible causes:');
    console.log('1. No GRN records exist');
    console.log('2. GRN creation did not trigger finance notification');
    console.log('3. All notifications have been processed (status = CLOSE)');
    console.log('4. Data sync issue between devices');
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total notifications: ${pendingNotifications.length}`);
  console.log(`   Bell format ready: ${financeNotifications.length}`);
  console.log(`   Payment form ready: ${openFinancePOs.length}`);
  
  if (pendingNotifications.length === 0) {
    console.log('\n🎯 Next Steps:');
    console.log('1. Create a new GRN in GT Purchasing');
    console.log('2. Verify finance notification is created');
    console.log('3. Check GT Payments notification bell');
    console.log('4. If still not working, check browser console for errors');
  }
}).catch(error => {
  console.error('❌ Error running test:', error);
});