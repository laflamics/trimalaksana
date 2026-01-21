#!/usr/bin/env node

/**
 * Debug GT SO Confirm PPIC Notification Issue
 * 
 * Masalah: SO GT sudah di-confirm tapi notifikasi tidak muncul di PPIC GT
 * Kemungkinan penyebab:
 * 1. Storage path salah untuk PPIC notifications
 * 2. SO confirm tidak membuat notification
 * 3. PPIC tidak membaca dari path yang benar
 * 4. Force reload mechanism belum diterapkan
 */

const fs = require('fs');

console.log('🔍 Debugging GT SO Confirm PPIC Notification Issue');
console.log('='.repeat(60));

// Check GT Sales Orders data
console.log('📋 1. Checking GT Sales Orders Data...');
const gtSalesOrdersPaths = [
  'data/localStorage/general-trading/gt_salesOrders.json',
  'data/localStorage/gt_salesOrders.json',
  'data/gt_salesOrders.json'
];

let confirmedSOs = [];
for (const path of gtSalesOrdersPaths) {
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      const orders = Array.isArray(data) ? data : (data.value || []);
      
      // Find confirmed SOs (ppicNotified = true)
      const confirmed = orders.filter(so => so.ppicNotified === true);
      const pending = orders.filter(so => so.status === 'OPEN' && !so.ppicNotified);
      
      console.log(`   ${path}:`);
      console.log(`     Total SOs: ${orders.length}`);
      console.log(`     Confirmed (ppicNotified): ${confirmed.length}`);
      console.log(`     Pending notification: ${pending.length}`);
      
      if (confirmed.length > 0) {
        console.log(`     Latest confirmed: ${confirmed[0].soNo} at ${confirmed[0].ppicNotifiedAt || 'N/A'}`);
        confirmedSOs.push(...confirmed);
      }
      
    } catch (error) {
      console.log(`   ❌ ${path}: Error reading - ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  ${path}: File not found`);
  }
}

console.log();

// Check PPIC Notifications data
console.log('📋 2. Checking PPIC Notifications Data...');
const ppicNotificationsPaths = [
  'data/localStorage/general-trading/gt_ppicNotifications.json',
  'data/localStorage/gt_ppicNotifications.json',
  'data/ppicNotifications.json',
  'data/gt_ppicNotifications.json'
];

let ppicNotifications = [];
for (const path of ppicNotificationsPaths) {
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      const notifications = Array.isArray(data) ? data : (data.value || []);
      
      // Find SO_CREATED notifications
      const soNotifications = notifications.filter(n => n.type === 'SO_CREATED');
      const pendingNotifications = soNotifications.filter(n => n.status === 'PENDING');
      
      console.log(`   ${path}:`);
      console.log(`     Total notifications: ${notifications.length}`);
      console.log(`     SO_CREATED notifications: ${soNotifications.length}`);
      console.log(`     Pending SO notifications: ${pendingNotifications.length}`);
      
      if (soNotifications.length > 0) {
        console.log(`     Latest SO notification: ${soNotifications[0].soNo} (${soNotifications[0].status})`);
        ppicNotifications.push(...soNotifications);
      }
      
    } catch (error) {
      console.log(`   ❌ ${path}: Error reading - ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  ${path}: File not found`);
  }
}

console.log();

// Check GT SalesOrders implementation
console.log('📋 3. Checking GT SalesOrders Confirm Implementation...');
const gtSalesOrdersPath = 'src/pages/GeneralTrading/SalesOrders.tsx';

if (fs.existsSync(gtSalesOrdersPath)) {
  const content = fs.readFileSync(gtSalesOrdersPath, 'utf8');
  
  // Check if confirm function exists
  const hasConfirmFunction = content.includes('handleConfirm') || content.includes('confirmSO');
  console.log(`   ✅ Confirm function: ${hasConfirmFunction ? 'FOUND' : 'MISSING'}`);
  
  // Check if creates PPIC notification
  const createsPPICNotification = content.includes('ppicNotifications') || content.includes('SO_CREATED');
  console.log(`   ✅ Creates PPIC notification: ${createsPPICNotification ? 'FOUND' : 'MISSING'}`);
  
  // Check storage key for notifications
  const notificationStorageMatch = content.match(/storageService\.set\('([^']*ppic[^']*)/i);
  const notificationStorageKey = notificationStorageMatch ? notificationStorageMatch[1] : 'NOT FOUND';
  console.log(`   📋 Notification storage key: ${notificationStorageKey}`);
  
  // Check ppicNotified flag update
  const updatesPpicNotified = content.includes('ppicNotified') && content.includes('true');
  console.log(`   ✅ Updates ppicNotified flag: ${updatesPpicNotified ? 'FOUND' : 'MISSING'}`);
  
} else {
  console.log('   ❌ GT SalesOrders file not found');
}

console.log();

// Check GT PPIC implementation
console.log('📋 4. Checking GT PPIC Notification Reading...');
const gtPPICPath = 'src/pages/GeneralTrading/PPIC.tsx';

if (fs.existsSync(gtPPICPath)) {
  const content = fs.readFileSync(gtPPICPath, 'utf8');
  
  // Check storage key for reading notifications
  const readsNotificationsMatch = content.match(/storageService\.get[^(]*\('([^']*ppic[^']*)/i);
  const readsNotificationsKey = readsNotificationsMatch ? readsNotificationsMatch[1] : 'NOT FOUND';
  console.log(`   📋 Reads notifications from: ${readsNotificationsKey}`);
  
  // Check if has force reload for notifications
  const hasForceReloadNotifications = content.includes('forceReloadFromFile') && 
                                      content.includes('ppic');
  console.log(`   🔄 Force reload for notifications: ${hasForceReloadNotifications ? 'IMPLEMENTED' : 'MISSING'}`);
  
  // Check notification processing
  const processesNotifications = content.includes('SO_CREATED') || content.includes('PENDING');
  console.log(`   ✅ Processes notifications: ${processesNotifications ? 'FOUND' : 'MISSING'}`);
  
  // Check notification display
  const displaysNotifications = content.includes('NotificationBell') || content.includes('pendingSONotifications');
  console.log(`   🔔 Displays notifications: ${displaysNotifications ? 'FOUND' : 'MISSING'}`);
  
} else {
  console.log('   ❌ GT PPIC file not found');
}

console.log();

// Cross-reference confirmed SOs with notifications
console.log('📊 5. Cross-Reference Analysis...');
console.log('-'.repeat(40));

if (confirmedSOs.length > 0 && ppicNotifications.length > 0) {
  console.log('✅ Both confirmed SOs and PPIC notifications exist');
  
  // Check if confirmed SOs have corresponding notifications
  for (const so of confirmedSOs.slice(0, 3)) {
    const hasNotification = ppicNotifications.some(n => n.soNo === so.soNo);
    console.log(`   SO ${so.soNo}: ${hasNotification ? '✅ Has notification' : '❌ Missing notification'}`);
  }
  
} else if (confirmedSOs.length > 0) {
  console.log('❌ Confirmed SOs exist but NO PPIC notifications found');
  console.log('   This suggests notification creation is not working');
  
} else if (ppicNotifications.length > 0) {
  console.log('❌ PPIC notifications exist but NO confirmed SOs found');
  console.log('   This suggests SO confirmation is not working');
  
} else {
  console.log('❌ Neither confirmed SOs nor PPIC notifications found');
  console.log('   This suggests both systems are not working');
}

console.log();

// Check storage key consistency
console.log('📋 6. Storage Key Consistency Check...');
console.log('-'.repeat(40));

// Expected storage keys for GT
const expectedKeys = {
  salesOrders: 'general-trading/gt_salesOrders',
  ppicNotifications: 'general-trading/gt_ppicNotifications'
};

console.log('Expected storage keys for GT:');
console.log(`   Sales Orders: ${expectedKeys.salesOrders}`);
console.log(`   PPIC Notifications: ${expectedKeys.ppicNotifications}`);

// Check if files exist with expected keys
const expectedSOPath = `data/localStorage/${expectedKeys.salesOrders.replace('/', '/')}.json`;
const expectedNotifPath = `data/localStorage/${expectedKeys.ppicNotifications.replace('/', '/')}.json`;

console.log();
console.log('File existence check:');
console.log(`   ${expectedSOPath}: ${fs.existsSync(expectedSOPath) ? '✅' : '❌'}`);
console.log(`   ${expectedNotifPath}: ${fs.existsSync(expectedNotifPath) ? '✅' : '❌'}`);

console.log();

// Recommendations
console.log('💡 Troubleshooting Steps:');
console.log('-'.repeat(30));
console.log('1. 🔍 Check if SO confirm creates PPIC notification');
console.log('2. 🔍 Verify storage keys match between create and read');
console.log('3. 🔄 Add force reload mechanism to PPIC notifications');
console.log('4. 🧪 Test SO confirm → PPIC notification flow');
console.log('5. 📋 Check console logs during SO confirmation');

console.log();
console.log('🚀 Likely Issues:');
console.log('-'.repeat(20));
console.log('❌ Storage key mismatch between SO confirm and PPIC read');
console.log('❌ PPIC not using force reload for notifications');
console.log('❌ Notification creation not working in SO confirm');
console.log('❌ Business context prefix causing path issues');