/**
 * Import test data for BAR (Business Activity Report)
 * This script imports sample packaging data to test the BAR functionality
 */

const fs = require('fs');
const path = require('path');

// Read test data files
const salesOrdersPath = path.join(__dirname, 'master/packaging/salesOrders.json');
const salesOrders = JSON.parse(fs.readFileSync(salesOrdersPath, 'utf8'));

console.log('📊 BAR Test Data Import');
console.log('========================\n');

// Create mock SPK data from sales orders
const spks = salesOrders.slice(0, 5).map((so, idx) => ({
  id: `spk-${idx}`,
  spkNo: `SPK-${String(idx + 1).padStart(5, '0')}`,
  soNo: so.soNo,
  product: so.items[0]?.productName || 'Product',
  qty: so.items[0]?.qty || 100,
  unit: so.items[0]?.unit || 'PC',
  status: ['OPEN', 'CLOSE'][Math.floor(Math.random() * 2)],
  created: so.created,
  createdAt: so.created,
}));

// Create mock production data
const productions = spks.slice(0, 3).map((spk, idx) => ({
  id: `prod-${idx}`,
  productionNo: `PROD-${String(idx + 1).padStart(5, '0')}`,
  spkNo: spk.spkNo,
  soNo: spk.soNo,
  status: ['OPEN', 'CLOSE'][Math.floor(Math.random() * 2)],
  producedQty: spk.qty,
  created: new Date(new Date(spk.created).getTime() + 86400000).toISOString(),
}));

// Create mock QC data
const qcs = productions.slice(0, 2).map((prod, idx) => ({
  id: `qc-${idx}`,
  qcNo: `QC-${String(idx + 1).padStart(5, '0')}`,
  spkNo: prod.spkNo,
  status: ['PASS', 'FAIL'][Math.floor(Math.random() * 2)],
  qcResult: ['PASS', 'FAIL'][Math.floor(Math.random() * 2)],
  created: new Date(new Date(prod.created).getTime() + 86400000).toISOString(),
}));

// Create mock delivery data
const deliveries = qcs.slice(0, 1).map((qc, idx) => ({
  id: `delivery-${idx}`,
  sjNo: `SJ-${String(idx + 1).padStart(5, '0')}`,
  spkNo: qc.spkNo,
  status: 'DELIVERED',
  deliveryDate: new Date(new Date(qc.created).getTime() + 86400000).toISOString(),
  items: [{ spkNo: qc.spkNo }],
}));

console.log('✅ Generated test data:');
console.log(`   - Sales Orders: ${salesOrders.length}`);
console.log(`   - SPKs: ${spks.length}`);
console.log(`   - Productions: ${productions.length}`);
console.log(`   - QCs: ${qcs.length}`);
console.log(`   - Deliveries: ${deliveries.length}`);

console.log('\n📝 Sample SPK:');
console.log(JSON.stringify(spks[0], null, 2));

console.log('\n💾 To import this data:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Application > Local Storage');
console.log('3. Add these keys:');
console.log(`   - salesOrders: ${JSON.stringify(salesOrders).substring(0, 50)}...`);
console.log(`   - spk: ${JSON.stringify(spks).substring(0, 50)}...`);
console.log(`   - production: ${JSON.stringify(productions).substring(0, 50)}...`);
console.log(`   - qc: ${JSON.stringify(qcs).substring(0, 50)}...`);
console.log(`   - delivery: ${JSON.stringify(deliveries).substring(0, 50)}...`);

// Export for use in other scripts
module.exports = {
  salesOrders,
  spks,
  productions,
  qcs,
  deliveries,
};
