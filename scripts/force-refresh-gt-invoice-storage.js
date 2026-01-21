#!/usr/bin/env node

/**
 * Force Refresh GT Invoice Storage
 * 
 * Memaksa refresh localStorage untuk gt_invoiceNotifications
 */

const fs = require('fs');

console.log('🔄 Force Refresh GT Invoice Storage');
console.log('='.repeat(50));

// Read the file data
const filePath = 'data/localStorage/general-trading/gt_invoiceNotifications.json';

if (!fs.existsSync(filePath)) {
  console.log('❌ Invoice notifications file not found');
  process.exit(1);
}

const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
console.log('✅ Read invoice notifications file');
console.log(`📊 File contains: ${Array.isArray(fileData.value) ? fileData.value.length : 'not array'} notifications`);

if (Array.isArray(fileData.value) && fileData.value.length > 0) {
  console.log('\n📋 Notifications in file:');
  fileData.value.forEach((notif, index) => {
    console.log(`   ${index + 1}. SJ: ${notif.sjNo}, SO: ${notif.soNo}`);
    console.log(`      Customer: ${notif.customer}`);
    console.log(`      Status: ${notif.status}, Type: ${notif.type}`);
    console.log(`      Items: ${notif.items ? notif.items.length : 0}`);
    console.log(`      Total Qty: ${notif.totalQty}`);
  });
}

// Force update timestamp to trigger refresh
const updatedData = {
  ...fileData,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  forceRefresh: true // Add flag to indicate forced refresh
};

// Write back to file
fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
console.log('\n✅ Updated file with new timestamp');
console.log(`📅 New timestamp: ${updatedData.timestamp}`);

// Also create a backup in case needed
const backupPath = filePath.replace('.json', '_backup.json');
fs.writeFileSync(backupPath, JSON.stringify(fileData, null, 2));
console.log(`✅ Created backup: ${backupPath}`);

console.log('\n🎯 Instructions for User:');
console.log('1. Go to GT Finance → Invoice module');
console.log('2. Refresh the page (F5)');
console.log('3. Clear browser cache (Ctrl+Shift+R)');
console.log('4. Check browser console for new logs');
console.log('5. Look for notification bell in GT Invoice header');
console.log('6. If still not working, try closing and reopening the app');

console.log('\n📊 Expected Result:');
console.log('GT Invoice should now show:');
console.log('- Notification bell with red badge (1)');
console.log('- Clicking bell shows: "Delivery SJ-260111-KPC77"');
console.log('- Message: "SO: test-01001 | Customer: tester"');
console.log('- Clicking notification should load invoice creation form');

console.log('\n🔧 If Still Not Working:');
console.log('The issue might be:');
console.log('1. GT Invoice module loadGTDataFromLocalStorage not working');
console.log('2. Storage service implementation bug');
console.log('3. Browser localStorage corruption');
console.log('4. Cross-device sync not working');
console.log('5. UI rendering issue');
console.log('6. File path or permission issue');

console.log('\n📋 Debug Steps:');
console.log('1. Check browser console for GT Invoice logs:');
console.log('   - [GT Invoice] Loading invoice data and notifications...');
console.log('   - [GT Invoice] Raw data loaded: {...}');
console.log('   - [GT Invoice] Filtered data: {...}');
console.log('   - [GT Invoice] Notification processing results: {...}');
console.log('   - [GT Invoice] NotificationBell formatted notifications: 1');
console.log('2. If logs show "invoiceNotifications: null/undefined", storage issue');
console.log('3. If logs show "pendingNotifications: 0", cleanup issue');
console.log('4. If logs show correct data but no UI, rendering issue');