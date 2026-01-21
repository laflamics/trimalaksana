// Simple GT Sync Check
console.log('GT Workflow Sync Check');
console.log('='.repeat(40));

const fs = require('fs');

// Check key data files
const files = [
  'data/localStorage/general-trading/gt_ppicNotifications.json',
  'data/localStorage/general-trading/gt_salesOrders.json'
];

files.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const count = data.value ? data.value.length : 0;
      console.log(`✅ ${file.split('/').pop()}: ${count} records`);
    } else {
      console.log(`❌ ${file.split('/').pop()}: Not found`);
    }
  } catch (e) {
    console.log(`❌ ${file.split('/').pop()}: Error - ${e.message}`);
  }
});

console.log('\nSync check complete!');