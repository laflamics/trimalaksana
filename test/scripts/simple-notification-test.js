const fs = require('fs');

console.log('Testing GT Finance Notifications...');

const data = JSON.parse(fs.readFileSync('data/localStorage/general-trading/gt_financeNotifications.json', 'utf8'));
console.log('Finance notifications:', data.value.length);

if (data.value.length > 0) {
  const notif = data.value[0];
  console.log('First notification:');
  console.log('- PO:', notif.poNo);
  console.log('- Supplier:', notif.supplier);
  console.log('- Total:', notif.total);
  console.log('- Status:', notif.status);
}