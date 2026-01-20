const fs = require('fs');

// Check for latest GRN
const grnData = JSON.parse(fs.readFileSync('data/localStorage/general-trading/gt_grn.json', 'utf8'));
const financeData = JSON.parse(fs.readFileSync('data/localStorage/general-trading/gt_financeNotifications.json', 'utf8'));

const grnRecords = grnData.value || [];
const notifications = financeData.value || [];

console.log('=== LATEST GRN CHECK ===');
console.log('Total GRN records:', grnRecords.length);
console.log('Total notifications:', notifications.length);

if (grnRecords.length > 0) {
  // Sort by created date
  const sortedGRN = grnRecords.sort((a, b) => new Date(b.created) - new Date(a.created));
  const latestGRN = sortedGRN[0];
  
  console.log('\nLatest GRN:');
  console.log('- GRN No:', latestGRN.grnNo);
  console.log('- PO No:', latestGRN.poNo);
  console.log('- Supplier:', latestGRN.supplier);
  console.log('- Product:', latestGRN.productItem);
  console.log('- Qty:', latestGRN.qtyReceived);
  console.log('- Created:', latestGRN.created);
  
  // Check if notification exists
  const hasNotification = notifications.find(n => n.grnNo === latestGRN.grnNo);
  console.log('- Has Notification:', hasNotification ? 'YES' : 'NO');
  
  if (hasNotification) {
    console.log('- Notification Status:', hasNotification.status);
    console.log('- Notification Total:', hasNotification.total);
  }
}

// Check pending notifications
const pending = notifications.filter(n => n.status === 'PENDING');
console.log('\nPending notifications:', pending.length);

if (pending.length > 0) {
  console.log('\nGT Payments should show:');
  pending.forEach((n, i) => {
    console.log(`${i + 1}. PO ${n.poNo} - ${n.supplier} - Rp ${n.total?.toLocaleString('id-ID')}`);
  });
} else {
  console.log('\nNO PENDING NOTIFICATIONS - This is why GT Payments shows nothing!');
}

// Write result for verification
fs.writeFileSync('latest-grn-check.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  grnCount: grnRecords.length,
  notificationCount: notifications.length,
  pendingCount: pending.length,
  latestGRN: grnRecords.length > 0 ? grnRecords[grnRecords.length - 1] : null,
  pendingNotifications: pending
}, null, 2));