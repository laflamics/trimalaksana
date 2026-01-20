#!/usr/bin/env node

/**
 * Test GT Invoice Direct Storage
 * 
 * Test pendekatan baru GT Invoice yang bypass helper dan langsung pakai storage service
 */

const fs = require('fs');

console.log('🧪 Test GT Invoice Direct Storage');
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

console.log('📋 Simulating New GT Invoice loadData (Direct Storage)...');
console.log('-'.repeat(50));

// Simulate new GT Invoice loadData logic
const loadInvoiceDataDirect = async () => {
  // Step 1: Load data directly (same as new GT Invoice)
  let invRaw = readJsonFile('data/localStorage/general-trading/gt_invoices.json');
  let expRaw = readJsonFile('data/localStorage/general-trading/gt_expenses.json');
  let notifsRaw = readJsonFile('data/localStorage/general-trading/gt_invoiceNotifications.json');
  
  console.log('📊 Raw file data loaded:');
  console.log(`   Invoices file: ${invRaw ? 'EXISTS' : 'NULL'}`);
  console.log(`   Expenses file: ${expRaw ? 'EXISTS' : 'NULL'}`);
  console.log(`   Invoice notifications file: ${notifsRaw ? 'EXISTS' : 'NULL'}`);
  
  // Step 2: Extract storage values (simulate storage service)
  let invoices = extractStorageValue(invRaw);
  let expenses = extractStorageValue(expRaw);
  let notifications = extractStorageValue(notifsRaw);
  
  console.log('\n📊 Extracted data (simulating storage service):');
  console.log(`   Invoice records: ${invoices.length}`);
  console.log(`   Expense records: ${expenses.length}`);
  console.log(`   Invoice notifications: ${notifications.length}`);
  
  // Step 3: Force reload logic (simulate forceReloadFromFile)
  if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
    console.log('\n🔄 Simulating force reload from file...');
    
    // Re-read file (simulate forceReloadFromFile)
    const fileData = readJsonFile('data/localStorage/general-trading/gt_invoiceNotifications.json');
    const reloadedData = extractStorageValue(fileData);
    
    if (reloadedData && Array.isArray(reloadedData) && reloadedData.length > 0) {
      console.log(`✅ Force reload successful: ${reloadedData.length} invoice notifications from file`);
      notifications = reloadedData;
    } else {
      console.log('❌ Force reload failed, no data in file');
      notifications = [];
    }
  } else {
    console.log('\n✅ Notifications loaded successfully on first try');
  }
  
  // Step 4: Filter active items
  const activeInvoices = filterActiveItems(invoices);
  const activeExpenses = filterActiveItems(expenses);
  const activeNotifications = filterActiveItems(notifications);
  
  console.log('\n📊 Filtered active data:');
  console.log(`   Active invoices: ${activeInvoices.length}`);
  console.log(`   Active expenses: ${activeExpenses.length}`);
  console.log(`   Active notifications: ${activeNotifications.length}`);
  
  if (activeNotifications.length > 0) {
    console.log('\n📋 Active Notifications Details:');
    activeNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ID: ${notif.id}`);
      console.log(`      SJ: ${notif.sjNo}`);
      console.log(`      SO: ${notif.soNo}`);
      console.log(`      Customer: ${notif.customer}`);
      console.log(`      Status: ${notif.status}`);
      console.log(`      Type: ${notif.type}`);
      console.log('');
    });
  }
  
  // Step 5: Cleanup logic (same as GT Invoice)
  const cleanedNotifs = activeNotifications.filter((n) => {
    // Hapus jika sudah ada invoice untuk SO/SJ ini
    const existingInvoice = activeInvoices.find((i) => i.soNo === n.soNo && i.sjNo === n.sjNo);
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
  console.log(`   Original notifications: ${activeNotifications.length}`);
  console.log(`   After cleanup: ${cleanedNotifs.length}`);
  console.log(`   Removed: ${activeNotifications.length - cleanedNotifs.length}`);
  
  // Step 6: Filter pending notifications
  const pending = cleanedNotifs.filter((n) => n.status === 'PENDING');
  
  console.log(`\n⏳ Pending notifications: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('\n📋 Pending Notifications Details:');
    pending.forEach((notif, index) => {
      console.log(`   ${index + 1}. SJ: ${notif.sjNo}`);
      console.log(`      SO: ${notif.soNo}`);
      console.log(`      Customer: ${notif.customer}`);
      console.log(`      Status: ${notif.status}`);
      console.log('');
    });
  }
  
  // Step 7: Create NotificationBell format
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
    invoices: activeInvoices,
    expenses: activeExpenses,
    notifications: activeNotifications,
    cleanedNotifs,
    pending,
    invoiceNotifBell
  };
};

// Run the test
loadInvoiceDataDirect().then(result => {
  console.log('🎯 Test Results (New Direct Storage Approach):');
  console.log('='.repeat(60));
  
  const { invoices, expenses, notifications, cleanedNotifs, pending, invoiceNotifBell } = result;
  
  console.log(`✅ Invoice records: ${invoices.length}`);
  console.log(`✅ Expense records: ${expenses.length}`);
  console.log(`✅ Total notifications: ${notifications.length}`);
  console.log(`✅ Cleaned notifications: ${cleanedNotifs.length}`);
  console.log(`✅ Pending notifications: ${pending.length}`);
  console.log(`✅ Bell notifications: ${invoiceNotifBell.length}`);
  
  if (pending.length > 0) {
    console.log('\n🎉 SUCCESS: New approach should work!');
    console.log('\n📋 Expected GT Invoice Console Logs:');
    console.log('- [GT Invoice] Loading invoice data and notifications...');
    console.log('- [GT Invoice] Raw data loaded: {invoices: 0, expenses: 0, invoiceNotifications: 1}');
    console.log('- [GT Invoice] Filtered data: {..., invoiceNotifications: 1, ...}');
    console.log('- [GT Invoice] Notification processing results: {..., pendingNotifications: 1}');
    console.log('- [GT Invoice] NotificationBell formatted notifications: 1');
    console.log('');
    console.log('📋 What user should see:');
    console.log('1. Notification bell with red badge (1)');
    console.log('2. Clicking bell shows: "Delivery SJ-260111-KPC77"');
    console.log('3. Message: "SO: test-01001 | Customer: tester"');
    console.log('4. Clicking notification loads invoice creation form');
  } else {
    console.log('\n❌ PROBLEM: Still no notifications found');
    console.log('\n🔧 Possible causes:');
    console.log('1. File data is empty or corrupted');
    console.log('2. All notifications have been processed');
    console.log('3. Cleanup logic is removing notifications incorrectly');
  }
  
  console.log('\n📊 Summary:');
  console.log(`   File data available: ${notifications.length > 0 ? 'YES' : 'NO'}`);
  console.log(`   Force reload needed: ${notifications.length === 0 ? 'YES' : 'NO'}`);
  console.log(`   Ready for UI: ${invoiceNotifBell.length > 0 ? 'YES' : 'NO'}`);
  
  if (invoiceNotifBell.length === 0) {
    console.log('\n🎯 Next Steps:');
    console.log('1. Verify file data exists and is correct');
    console.log('2. Check if storage service can read the file');
    console.log('3. Test forceReloadFromFile method');
    console.log('4. Check browser console for storage errors');
  }
}).catch(error => {
  console.error('❌ Error running test:', error);
});