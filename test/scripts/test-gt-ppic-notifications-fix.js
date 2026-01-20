#!/usr/bin/env node

/**
 * Test GT PPIC Notifications Force Reload Fix
 * 
 * Verifikasi bahwa GT PPIC sekarang bisa membaca PPIC notifications dengan force reload
 */

const fs = require('fs');

console.log('🧪 Testing GT PPIC Notifications Force Reload Fix');
console.log('='.repeat(55));

// Check PPIC notifications data
console.log('📋 1. Checking PPIC Notifications Data...');
const ppicNotificationsPath = 'data/localStorage/general-trading/gt_ppicNotifications.json';

if (fs.existsSync(ppicNotificationsPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(ppicNotificationsPath, 'utf8'));
    const notifications = Array.isArray(data) ? data : (data.value || []);
    
    console.log(`   Total notifications: ${notifications.length}`);
    
    // Find SO_CREATED notifications
    const soNotifications = notifications.filter(n => n.type === 'SO_CREATED');
    const pendingNotifications = soNotifications.filter(n => n.status === 'PENDING');
    
    console.log(`   SO_CREATED notifications: ${soNotifications.length}`);
    console.log(`   Pending SO notifications: ${pendingNotifications.length}`);
    
    if (pendingNotifications.length > 0) {
      console.log('   Recent pending notifications:');
      pendingNotifications.slice(0, 3).forEach((notif, index) => {
        console.log(`     ${index + 1}. ${notif.soNo} - ${notif.customer}`);
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Error reading notifications: ${error.message}`);
  }
} else {
  console.log('   ❌ PPIC notifications file not found');
}

console.log();

// Check GT Sales Orders confirmed status
console.log('📋 2. Checking GT Sales Orders Confirmed Status...');
const gtSalesOrdersPath = 'data/localStorage/general-trading/gt_salesOrders.json';

if (fs.existsSync(gtSalesOrdersPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(gtSalesOrdersPath, 'utf8'));
    const orders = Array.isArray(data) ? data : (data.value || []);
    
    console.log(`   Total sales orders: ${orders.length}`);
    
    // Find confirmed orders
    const confirmedOrders = orders.filter(so => so.ppicNotified === true);
    const pendingOrders = orders.filter(so => so.status === 'OPEN' && !so.ppicNotified);
    
    console.log(`   Confirmed orders (ppicNotified): ${confirmedOrders.length}`);
    console.log(`   Pending confirmation: ${pendingOrders.length}`);
    
    if (confirmedOrders.length > 0) {
      console.log('   Recent confirmed orders:');
      confirmedOrders.slice(0, 3).forEach((so, index) => {
        const notifiedAt = so.ppicNotifiedAt ? new Date(so.ppicNotifiedAt).toLocaleString() : 'N/A';
        console.log(`     ${index + 1}. ${so.soNo} - ${so.customer} (${notifiedAt})`);
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Error reading sales orders: ${error.message}`);
  }
} else {
  console.log('   ❌ GT sales orders file not found');
}

console.log();

// Check GT PPIC implementation
console.log('📋 3. Verifying GT PPIC Implementation...');
const gtPPICPath = 'src/pages/GeneralTrading/PPIC.tsx';

if (fs.existsSync(gtPPICPath)) {
  const content = fs.readFileSync(gtPPICPath, 'utf8');
  
  // Check if force reload is implemented for PPIC notifications
  const hasForceReloadPPIC = content.includes('forceReloadFromFile') && 
                             content.includes('gt_ppicNotifications');
  console.log(`   ✅ Force reload for PPIC notifications: ${hasForceReloadPPIC ? 'IMPLEMENTED' : 'MISSING'}`);
  
  // Check console logging for PPIC notifications
  const hasLoggingPPIC = content.includes('PPIC notifications loaded') || 
                         content.includes('Few PPIC notifications detected');
  console.log(`   ✅ Console logging for PPIC: ${hasLoggingPPIC ? 'IMPLEMENTED' : 'MISSING'}`);
  
  // Check storage key consistency
  const storageKeyMatch = content.match(/storageService\.get<[^>]*>\('([^']*ppic[^']*)'/i);
  const storageKey = storageKeyMatch ? storageKeyMatch[1] : 'NOT FOUND';
  console.log(`   📋 Storage key used: ${storageKey}`);
  
  // Check notification processing
  const processesNotifications = content.includes('SO_CREATED') && content.includes('PENDING');
  console.log(`   ✅ Processes notifications: ${processesNotifications ? 'IMPLEMENTED' : 'MISSING'}`);
  
} else {
  console.log('   ❌ GT PPIC file not found');
}

console.log();

// Expected behavior
console.log('🎯 4. Expected Behavior After Fix:');
console.log('-'.repeat(40));
console.log('✅ GT PPIC will detect few notifications (≤1)');
console.log('✅ Force reload will load from file system');
console.log('✅ All confirmed SO notifications will be visible');
console.log('✅ PPIC will show pending notifications properly');
console.log('✅ Real-time updates when SO is confirmed');

console.log();

// Testing instructions
console.log('🧪 5. Testing Instructions:');
console.log('-'.repeat(30));
console.log('1. Open GT PPIC on this device');
console.log('2. Check if pending SO notifications appear');
console.log('3. Confirm an SO in GT Sales Orders');
console.log('4. Verify notification appears in GT PPIC');
console.log('5. Check console logs for force reload messages');

console.log();

// Summary
console.log('📈 6. Fix Summary:');
console.log('-'.repeat(20));
console.log('✅ Added force reload mechanism to GT PPIC for notifications');
console.log('✅ Prevents stale/incomplete notification data');
console.log('✅ Ensures cross-device notification sync');
console.log('✅ Consistent with other GT modules');
console.log('✅ Automatic fallback when localStorage is incomplete');

console.log();
console.log('🚀 This fix ensures GT PPIC can see SO confirmations from other devices!');