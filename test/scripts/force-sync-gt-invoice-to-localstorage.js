#!/usr/bin/env node

/**
 * Force Sync GT Invoice to localStorage
 * 
 * Memaksa sinkronisasi gt_invoiceNotifications dari file ke localStorage format
 */

const fs = require('fs');

console.log('🔄 Force Sync GT Invoice to localStorage');
console.log('='.repeat(60));

// Read the file data
const filePath = 'data/localStorage/general-trading/gt_invoiceNotifications.json';

if (!fs.existsSync(filePath)) {
  console.log('❌ Invoice notifications file not found');
  process.exit(1);
}

const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
console.log('✅ Read invoice notifications file');

const notifications = Array.isArray(fileData.value) ? fileData.value : [];
console.log(`📊 File contains: ${notifications.length} notifications`);

if (notifications.length > 0) {
  console.log('\n📋 Notifications in file:');
  notifications.forEach((notif, index) => {
    console.log(`   ${index + 1}. SJ: ${notif.sjNo}, SO: ${notif.soNo}`);
    console.log(`      Customer: ${notif.customer}`);
    console.log(`      Status: ${notif.status}, Type: ${notif.type}`);
  });
}

// Create localStorage format data
const localStorageData = {
  value: notifications,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  loadedFromFile: true,
  fileLoadedAt: new Date().toISOString(),
  forceSync: true
};

// Write to multiple localStorage key formats that GT Invoice might check
const localStorageKeys = [
  'general-trading/gt_invoiceNotifications',
  'gt_invoiceNotifications'
];

console.log('\n📋 Creating localStorage simulation files...');

localStorageKeys.forEach(key => {
  const localStorageFilePath = `localStorage-simulation-${key.replace('/', '_')}.json`;
  fs.writeFileSync(localStorageFilePath, JSON.stringify(localStorageData, null, 2));
  console.log(`✅ Created: ${localStorageFilePath}`);
});

// Also update the original file with force sync flag
const updatedFileData = {
  ...fileData,
  timestamp: Date.now(),
  _timestamp: Date.now(),
  forceSync: true,
  lastSyncAttempt: new Date().toISOString()
};

fs.writeFileSync(filePath, JSON.stringify(updatedFileData, null, 2));
console.log('✅ Updated original file with sync flags');

console.log('\n🎯 Manual localStorage Injection Instructions:');
console.log('Since we cannot directly modify browser localStorage from Node.js,');
console.log('you need to manually inject the data in browser console:');
console.log('');
console.log('1. Open GT Invoice module in browser');
console.log('2. Open browser console (F12)');
console.log('3. Run this command:');
console.log('');
console.log('```javascript');
console.log('// Inject invoice notifications to localStorage');
console.log('const invoiceNotifications = ' + JSON.stringify(localStorageData, null, 2) + ';');
console.log('');
console.log('// Set both possible keys');
console.log('localStorage.setItem("general-trading/gt_invoiceNotifications", JSON.stringify(invoiceNotifications));');
console.log('localStorage.setItem("gt_invoiceNotifications", JSON.stringify(invoiceNotifications));');
console.log('');
console.log('console.log("✅ Invoice notifications injected to localStorage");');
console.log('console.log("📊 Notifications:", invoiceNotifications.value.length);');
console.log('');
console.log('// Refresh the page');
console.log('window.location.reload();');
console.log('```');

console.log('\n🔄 Alternative: Force Reload Method');
console.log('If manual injection doesn\'t work, try this in browser console:');
console.log('');
console.log('```javascript');
console.log('// Force reload invoice notifications');
console.log('import { storageService } from "./src/services/storage";');
console.log('');
console.log('storageService.forceReloadFromFile("gt_invoiceNotifications")');
console.log('  .then(data => {');
console.log('    console.log("✅ Force reload result:", data);');
console.log('    console.log("📊 Notifications loaded:", data ? data.length : 0);');
console.log('    window.location.reload();');
console.log('  })');
console.log('  .catch(err => console.error("❌ Force reload failed:", err));');
console.log('```');

console.log('\n📊 Expected Result After Injection:');
console.log('GT Invoice console should show:');
console.log('- [GT Storage] Loaded gt_invoiceNotifications from localStorage key: general-trading/gt_invoiceNotifications (1 items)');
console.log('- [GT Invoice] Raw data loaded: {invoices: 0, expenses: 0, invoiceNotifications: 1}');
console.log('- [GT Invoice] Filtered data: {..., invoiceNotifications: 1, ...}');
console.log('- [GT Invoice] Notification processing results: {..., pendingNotifications: 1}');
console.log('- [GT Invoice] NotificationBell formatted notifications: 1');

console.log('\n🎯 What User Should See:');
console.log('- Notification bell with red badge (1)');
console.log('- Clicking bell shows: "Delivery SJ-260111-KPC77"');
console.log('- Message: "SO: test-01001 | Customer: tester"');

console.log('\n📋 Data to Inject:');
console.log('Key: general-trading/gt_invoiceNotifications');
console.log('Value:', JSON.stringify(localStorageData, null, 2));