#!/usr/bin/env node

/**
 * Test GT Invoice Notifications
 * 
 * Test apakah GT Invoice module bisa membaca invoice notifications dengan benar
 */

const fs = require('fs');

console.log('🧪 Test GT Invoice Notifications');
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

console.log('📋 Simulating GT Invoice loadData Function...');
console.log('-'.repeat(50));

// Simulate exact GT Invoice loadData logic
const loadInvoiceData = async () => {
  // Step 1: Load data (same as GT Invoice)
  let invoicesRaw = readJsonFile('data/localStorage/general-trading/gt_invoices.json');
  let expensesRaw = readJsonFile('data/localStorage/general-trading/gt_expenses.json');
  let invoiceNotifRaw = readJsonFile('data/localStorage/general-trading/gt_invoiceNotifications.json');
  
  console.log('📊 Raw data loaded:');
  console.log(`   Invoices: ${invoicesRaw ? 'EXISTS' : 'NULL'}`);
  console.log(`   Expenses: ${expensesRaw ? 'EXISTS' : 'NULL'}`);
  console.log(`   Invoice notifications: ${invoiceNotifRaw ? 'EXISTS' : 'NULL'}`);
  
  // Step 2: Extract storage values
  const invoices = filterActiveItems(extractStorageValue(invoicesRaw));
  const expenses = filterActiveItems(extractStorageValue(expensesRaw));
  const notifications = filterActiveItems(extractStorageValue(invoiceNotifRaw));
  
  console.log('\n📊 Extracted data:');
  console.log(`   Invoice records: ${invoices.length}`);
  console.log(`   Expense records: ${expenses.length}`);
  console.log(`   Invoice notifications: ${notifications.length}`);
  
  if (notifications.length > 0) {
    console.log('\n📋 Invoice Notifications Details:');
    notifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ID: ${notif.id}`);
      console.log(`      SJ: ${notif.sjNo}`);
      console.log(`      SO: ${notif.soNo}`);
      console.log(`      Customer: ${notif.customer}`);
      console.log(`      Items: ${notif.items ? notif.items.length : 0}`);
      console.log(`      Total Qty: ${notif.totalQty}`);
      console.log(`      Status: ${notif.status}`);
      console.log(`      Created: ${notif.created}`);
      console.log('');
    });
  }
  
  // Step 3: Auto-cleanup logic (same as GT Invoice)
  const cleanedNotifs = notifications.filter((n) => {
    // Hapus jika sudah ada invoice untuk SO/SJ ini
    const existingInvoice = invoices.find((i) => i.soNo === n.soNo && i.sjNo === n.sjNo);
    if (existingInvoice) {
      return false;
    }
    
    // Hapus jika status sudah PROCESSED
    if (n.status === 'PROCESSED') {
      return false;
    }
    
    return true;
  });
  
  console.log('🧹 Cleanup results:');
  console.log(`   Original notifications: ${notifications.length}`);
  console.log(`   After cleanup: ${cleanedNotifs.length}`);
  console.log(`   Removed: ${notifications.length - cleanedNotifs.length}`);
  
  // Step 4: Filter pending notifications (same as GT Invoice)
  const pending = cleanedNotifs.filter((n) => n.status === 'PENDING');
  
  console.log(`\n⏳ Pending notifications: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('\n📋 Pending Notifications Details:');
    pending.forEach((notif, index) => {
      console.log(`   ${index + 1}. SJ: ${notif.sjNo}`);
      console.log(`      SO: ${notif.soNo}`);
      console.log(`      Customer: ${notif.customer}`);
      console.log(`      Items: ${notif.items ? notif.items.length : 0}`);
      console.log(`      Status: ${notif.status}`);
      console.log('');
    });
  }
  
  // Step 5: Create NotificationBell format (same as GT Invoice)
  const invoiceNotifBell = pending.map(notif => ({
    id: notif.id,
    title: `Delivery ${notif.sjNo || 'N/A'}`,
    message: `SO: ${notif.soNo || 'N/A'} | Customer: ${notif.customer || 'N/A'}`,
    timestamp: notif.created || notif.timestamp,
    notif: notif,
  }));
  
  console.log('🔔 NotificationBell Format:');
  console.log(`   Bell notifications: ${invoiceNotifBell.length}`);
  
  if (invoiceNotifBell.length > 0) {
    console.log('\n📋 NotificationBell Preview:');
    invoiceNotifBell.forEach((bell, index) => {
      console.log(`   ${index + 1}. Title: ${bell.title}`);
      console.log(`      Message: ${bell.message}`);
      console.log(`      Timestamp: ${bell.timestamp}`);
      console.log('');
    });
  }
  
  return {
    invoices,
    expenses,
    notifications,
    cleanedNotifs,
    pending,
    invoiceNotifBell
  };
};

// Run the test
loadInvoiceData().then(result => {
  console.log('🎯 Test Results:');
  console.log('='.repeat(60));
  
  const { invoices, expenses, notifications, cleanedNotifs, pending, invoiceNotifBell } = result;
  
  console.log(`✅ Invoice records: ${invoices.length}`);
  console.log(`✅ Expense records: ${expenses.length}`);
  console.log(`✅ Total notifications: ${notifications.length}`);
  console.log(`✅ Cleaned notifications: ${cleanedNotifs.length}`);
  console.log(`✅ Pending notifications: ${pending.length}`);
  console.log(`✅ Bell notifications: ${invoiceNotifBell.length}`);
  
  if (pending.length > 0) {
    console.log('\n🎉 SUCCESS: GT Invoice should show notifications!');
    console.log('\n📋 What user should see:');
    console.log('1. Notification bell with red badge showing notification count');
    console.log('2. Clicking bell shows dropdown with notifications');
    console.log('3. Notifications for creating customer invoices from delivery notes');
    console.log('4. Clicking notification should load invoice creation form');
  } else {
    console.log('\n❌ PROBLEM: No notifications found for GT Invoice');
    console.log('\n🔧 Possible causes:');
    console.log('1. No delivery notes with signed documents exist');
    console.log('2. All delivery notes already have invoices created');
    console.log('3. All notifications have been processed (status = PROCESSED)');
    console.log('4. Data sync issue between devices');
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total notifications: ${notifications.length}`);
  console.log(`   Bell format ready: ${invoiceNotifBell.length}`);
  console.log(`   Ready for invoice creation: ${pending.length}`);
  
  if (pending.length === 0) {
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to GT Delivery Note');
    console.log('2. Upload signed document to a delivery note');
    console.log('3. Verify invoice notification is created');
    console.log('4. Check GT Invoice for the notification');
  }
}).catch(error => {
  console.error('❌ Error running test:', error);
});