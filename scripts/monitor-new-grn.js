#!/usr/bin/env node

/**
 * Monitor New GRN
 * 
 * Monitor GRN baru dan pastikan finance notification dibuat
 */

const fs = require('fs');

console.log('🔍 Monitor New GRN - Real Time Check');
console.log('='.repeat(50));

const checkData = () => {
  try {
    // Read current data
    const grnData = JSON.parse(fs.readFileSync('data/localStorage/general-trading/gt_grn.json', 'utf8'));
    const financeData = JSON.parse(fs.readFileSync('data/localStorage/general-trading/gt_financeNotifications.json', 'utf8'));
    
    const grnRecords = (grnData.value || []).filter(item => !item.deleted);
    const notifications = (financeData.value || []).filter(item => !item.deleted);
    const pending = notifications.filter(n => n.status === 'PENDING' && n.type === 'SUPPLIER_PAYMENT');
    
    console.log(`\n[${new Date().toLocaleTimeString()}] Current Status:`);
    console.log(`   GRN Records: ${grnRecords.length}`);
    console.log(`   Finance Notifications: ${notifications.length}`);
    console.log(`   Pending Notifications: ${pending.length}`);
    
    if (grnRecords.length > 0) {
      const latest = grnRecords[grnRecords.length - 1];
      console.log(`   Latest GRN: ${latest.grnNo} (${latest.created})`);
      
      const hasNotif = notifications.find(n => n.grnNo === latest.grnNo);
      console.log(`   Has Notification: ${hasNotif ? 'YES' : 'NO'}`);
    }
    
    if (pending.length > 0) {
      console.log('\n   📋 GT Payments Should Show:');
      pending.forEach((n, i) => {
        console.log(`      ${i + 1}. PO ${n.poNo} - GRN ${n.grnNo}`);
        console.log(`         Supplier: ${n.supplier}`);
        console.log(`         Amount: Rp ${(n.total || 0).toLocaleString('id-ID')}`);
      });
      
      console.log('\n   🎯 Instructions for User:');
      console.log('      1. Go to GT Payments module');
      console.log('      2. Look for notification bell (💰) in header');
      console.log('      3. Should show red badge with number');
      console.log('      4. If not visible, try:');
      console.log('         - Refresh page (F5)');
      console.log('         - Clear browser cache (Ctrl+Shift+R)');
      console.log('         - Check browser console for errors');
    } else {
      console.log('\n   ❌ NO PENDING NOTIFICATIONS');
      console.log('      This is why GT Payments shows nothing!');
      console.log('      Create a new GRN in GT Purchasing to test.');
    }
    
    // Check for missing notifications
    const missingNotifs = grnRecords.filter(grn => 
      !notifications.find(n => n.grnNo === grn.grnNo && n.poNo === grn.poNo)
    );
    
    if (missingNotifs.length > 0) {
      console.log(`\n   ⚠️ MISSING NOTIFICATIONS: ${missingNotifs.length}`);
      missingNotifs.forEach(grn => {
        console.log(`      - GRN ${grn.grnNo} (PO: ${grn.poNo})`);
      });
      console.log('      → Run force-gt-payment-sync.js to fix');
    }
    
  } catch (error) {
    console.error('Error checking data:', error.message);
  }
};

// Initial check
checkData();

// Monitor for changes (check every 5 seconds)
console.log('\n🔄 Monitoring for changes... (Press Ctrl+C to stop)');
const interval = setInterval(checkData, 5000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitoring stopped');
  clearInterval(interval);
  process.exit(0);
});