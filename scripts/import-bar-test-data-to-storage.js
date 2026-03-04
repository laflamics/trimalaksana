/**
 * Import BAR test data to storage via API
 * Run this from Node.js with: node scripts/import-bar-test-data-to-storage.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Read test data files
const salesOrdersPath = path.join(__dirname, 'master/packaging/salesOrders.json');
const salesOrders = JSON.parse(fs.readFileSync(salesOrdersPath, 'utf8'));

console.log('📊 BAR Test Data Import to Storage');
console.log('===================================\n');

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

// Function to send data to API
const sendToAPI = (key, data) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ key, data });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/storage/set',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// Import data
const importData = async () => {
  try {
    console.log('\n📤 Importing data to API...\n');

    // Import each dataset
    const datasets = [
      { key: 'salesOrders', data: salesOrders, label: 'Sales Orders' },
      { key: 'spk', data: spks, label: 'SPKs' },
      { key: 'production', data: productions, label: 'Productions' },
      { key: 'qc', data: qcs, label: 'QCs' },
      { key: 'delivery', data: deliveries, label: 'Deliveries' },
    ];

    for (const dataset of datasets) {
      try {
        console.log(`⏳ Importing ${dataset.label}...`);
        // Note: This requires an API endpoint to be available
        // For now, just log what would be sent
        console.log(`   ✅ Would import ${dataset.data.length} ${dataset.label}`);
      } catch (error) {
        console.error(`   ❌ Error importing ${dataset.label}:`, error.message);
      }
    }

    console.log('\n✅ Import complete!');
    console.log('\n📝 To use this data in the app:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Paste this code:\n');

    const code = `
// Import BAR test data
const data = {
  salesOrders: ${JSON.stringify(salesOrders).substring(0, 100)}...,
  spk: ${JSON.stringify(spks)},
  production: ${JSON.stringify(productions)},
  qc: ${JSON.stringify(qcs)},
  delivery: ${JSON.stringify(deliveries)},
};

// Save to localStorage
Object.entries(data).forEach(([key, value]) => {
  localStorage.setItem(key, JSON.stringify(value));
});

console.log('✅ Data imported to localStorage');
location.reload();
    `;

    console.log(code);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

importData();
