#!/usr/bin/env node

/**
 * Force Refresh GT Finance Storage
 * 
 * Memaksa refresh localStorage untuk gt_financeNotifications
 */

const fs = require('fs');

console.log('🔄 Force Refresh GT Finance Storage');
console.log('='.repeat(50));

// Read the file data
const filePath = 'data/localStorage/general-trading/gt_financeNotifications.json';

if (!fs.existsSync(filePath)) {
  console.log('❌ Finance notifications file not found');
  process.exit(1);
}

const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
console.log('✅ Read finance notifications file');
console.log(`📊 File contains: ${Array.isArray(fileData.value) ? fileData.value.length : 'not array'} notifications`);

if (Array.isArray(fileData.value) && fileData.value.length > 0) {
  console.log('\n📋 Notifications in file:');
  fileData.value.forEach((notif, index) => {
    console.log(`   ${index + 1}. PO: ${notif.poNo}, GRN: ${notif.grnNo}`);
    console.log(`      Status: ${notif.status}, Type: ${notif.type}`);
    console.log(`      Amount: Rp ${(notif.total || 0).toLocaleString('id-ID')}`);
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
console.log('1. Refresh the GT Payments page (F5)');
console.log('2. Clear browser cache (Ctrl+Shift+R)');
console.log('3. Check browser console for new logs');
console.log('4. Look for notification bell (💰) in GT Payments header');
console.log('5. If still not working, try closing and reopening the app');

console.log('\n📊 Expected Result:');
console.log('GT Payments should now show:');
console.log('- Notification bell with red badge (1)');
console.log('- Clicking bell shows: "PO PO-260111-VDEAN"');
console.log('- Message: "Supplier: AGEN BERAS & TELOR RAFFI | Product: TEST1 | Qty: 111 PCS | Amount: Rp 2.775.000"');

console.log('\n🔧 If Still Not Working:');
console.log('The issue might be:');
console.log('1. Storage service implementation bug');
console.log('2. Browser localStorage corruption');
console.log('3. Cross-device sync not working');
console.log('4. UI rendering issue');
console.log('5. File path or permission issue');