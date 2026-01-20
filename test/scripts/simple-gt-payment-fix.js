const fs = require('fs');

// Read current data
const grnData = JSON.parse(fs.readFileSync('data/localStorage/general-trading/gt_grn.json', 'utf8'));
const financeData = JSON.parse(fs.readFileSync('data/localStorage/general-trading/gt_financeNotifications.json', 'utf8'));

const grnRecords = grnData.value || [];
const notifications = financeData.value || [];

console.log('GRN Records:', grnRecords.length);
console.log('Finance Notifications:', notifications.length);

// Check if all GRNs have notifications
grnRecords.forEach(grn => {
  const hasNotif = notifications.find(n => n.grnNo === grn.grnNo);
  console.log(`GRN ${grn.grnNo}: ${hasNotif ? 'HAS NOTIFICATION' : 'MISSING NOTIFICATION'}`);
});

// Show pending notifications
const pending = notifications.filter(n => n.status === 'PENDING');
console.log('Pending notifications:', pending.length);

if (pending.length > 0) {
  console.log('GT Payments should show these notifications:');
  pending.forEach(n => {
    console.log(`- PO: ${n.poNo}, GRN: ${n.grnNo}, Amount: ${n.total}`);
  });
} else {
  console.log('No pending notifications found!');
}