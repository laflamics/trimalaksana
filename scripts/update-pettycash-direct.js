#!/usr/bin/env node
/**
 * Direct update Petty Cash JSON file
 * This script updates the file directly without needing browser
 */

const fs = require('fs');
const path = require('path');

const csvData = `NO,DO NO,Amount,status action 1,status action 2
1,DO-20260107-3404,770000,Approve,Distribusi
2,DO-20260107-2326,2900000,Approve,Distribusi
3,DO-20260107-7969,500000,Approve,Distribusi
8,DO-20260107-3194,1900000,Approve,Distribusi
9,DO-20260107-7344,1100000,Approve,Distribusi
10,DO-20260107-2107,6000000,Approve,Distribusi
11,DO-20260107-9278,570000,Approve,Distribusi
12,DO-20260107-2569,1100000,Approve,Distribusi
13,DO-20260107-6903,1200000,Approve,Distribusi
14,DO-20260107-1504,5800000,Approve,Distribusi
26,DO-20260107-7257,450000,Approve,Distribusi
27,DO-20260107-2714,570000,Approve,Distribusi
36,DO-20260107-0051,1700000,Approve,Distribusi
37,DO-20260107-8242,1700000,Approve,Distribusi
38,DO-20260108-4640,670000,Approve,Distribusi
39,DO-20260108-8335,500000,Approve,Distribusi
40,DO-20260108-8990,1650000,Approve,Distribusi
47,DO-20260113-8976,1700000,Approve,Distribusi
49,DO-20260113-8382,1350000,Approve,Distribusi
50,DO-20260113-4726,300000,Approve,Distribusi
58,DO-20260113-5111,1100000,Approve,Distribusi
59,DO-20260113-0906,1950000,Approve,Distribusi
60,DO-20260113-9186,250000,Approve,Distribusi
61,DO-20260113-4553,1800000,Approve,Distribusi
63,DO-20260113-9516,150000,Approve,Distribusi
68,DO-20260113-9011,1325000,Approve,Distribusi
69,DO-20260113-1825,1700000,Approve,Distribusi
77,DO-20260113-2773,450000,Approve,Distribusi
78,DO-20260113-2853,1600000,Approve,Distribusi
79,DO-20260113-0989,600000,Approve,Distribusi
84,DO-20260113-9785,350000,Approve,Distribusi
86,DO-20260113-4475,1100000,Approve,Distribusi
90,DO-20260113-9992,450000,Approve,Distribusi
91,DO-20260114-7916,5800000,Approve,Distribusi
93,DO-20260115-4605,1325000,Approve,Distribusi
94,DO-20260115-3239,1900000,Approve,Distribusi
100,DO-20260115-6700,1000000,Approve,Distribusi
101,DO-20260115-9948,2900000,Approve,Distribusi
103-1,DO-20260123-6540,570000,Approve,Distribusi
120,DO-20260123-3270,1700000,Approve,Distribusi
124,DO-20260123-0313,2550000,Approve,Distribusi
125,DO-20260123-3270,1200000,Approve,Distribusi
126,DO-20260123-7509 ,1000000,Approve,Distribusi
127,DO-20260123-2915,2900000,Approve,Distribusi
128,DO-20260123-8979,600000,Approve,Distribusi
129,DO-20260123-2461,800000,Approve,Distribusi
133,DO-20260123-8127,1000000,Approve,Distribusi
134,DO-20260123-0055,1400000,Approve,Distribusi
138,DO-20260123-5179,2450000,Approve,Distribusi
143,DO-20260123-7661,1200000,Approve,Distribusi
147,DO-20260123-7699,400000,Approve,Distribusi
152,DO-20260123-6707,1200000,Approve,Distribusi
153,DO-20260123-0583,1200000,Approve,Distribusi
154,DO-20260123-1535,1900000,Approve,Distribusi
156,DO-20260123-3486,2300000,Approve,Distribusi
163,DO-20260123-7324,1000000,Approve,Distribusi
164,DO-20260123-1118,1200000,Approve,Distribusi`;

const BASE_DIR = path.join(__dirname, '../data/localStorage/trucking');
const PC_FILE = path.join(BASE_DIR, 'trucking_pettycash_requests.json');
const DO_FILE = path.join(BASE_DIR, 'trucking_delivery_orders.json');
const DN_FILE = path.join(BASE_DIR, 'trucking_delivery_notes.json');
const DRIVERS_FILE = path.join(BASE_DIR, 'trucking_drivers.json');
const VEHICLES_FILE = path.join(BASE_DIR, 'trucking_vehicles.json');
const ROUTES_FILE = path.join(BASE_DIR, 'trucking_routes.json');

console.log('🚀 Starting Petty Cash update from CSV...\n');

// Parse CSV
const lines = csvData.trim().split('\n');
const data = lines.slice(1).map(line => {
  const values = line.split(',');
  return {
    no: values[0],
    doNo: values[1]?.trim(),
    amount: parseInt(values[2]) || 0,
    statusAction1: values[3]?.trim(),
    statusAction2: values[4]?.trim(),
  };
});

console.log(`📊 Parsed ${data.length} rows from CSV\n`);

// Load JSON files
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return { value: [] };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return parsed;
  } catch (e) {
    console.error(`❌ Error loading ${filePath}:`, e.message);
    return { value: [] };
  }
};

const pettyCashData = loadJSON(PC_FILE);
const doData = loadJSON(DO_FILE);
const driversData = loadJSON(DRIVERS_FILE);
const vehiclesData = loadJSON(VEHICLES_FILE);
const routesData = loadJSON(ROUTES_FILE);
const dnData = loadJSON(DN_FILE);

const pettyCash = pettyCashData.value || [];
const deliveryOrders = doData.value || [];
const drivers = driversData.value || [];
const vehicles = vehiclesData.value || [];
const routes = routesData.value || [];
const deliveryNotes = dnData.value || [];

console.log(`📦 Loaded files:`);
console.log(`   Petty Cash: ${pettyCash.length}`);
console.log(`   Delivery Orders: ${deliveryOrders.length}`);
console.log(`   Drivers: ${drivers.length}`);
console.log(`   Vehicles: ${vehicles.length}`);
console.log(`   Routes: ${routes.length}`);
console.log(`   Delivery Notes: ${deliveryNotes.length}\n`);

if (pettyCash.length === 0) {
  console.error('❌ No Petty Cash data found!');
  process.exit(1);
}

let updated = 0, approved = 0, distributed = 0, suratJalanCreated = 0, skipped = 0;

for (const row of data) {
  if (!row.doNo || row.amount === 0) {
    skipped++;
    continue;
  }

  const pcIndex = pettyCash.findIndex(pc => pc.doNo === row.doNo && !pc.deleted);
  if (pcIndex === -1) {
    console.log(`⚠️  Petty Cash not found for DO ${row.doNo}`);
    skipped++;
    continue;
  }

  const pc = pettyCash[pcIndex];
  
  // Only update amount, don't change status
  if (pc.amount !== row.amount) {
    pc.amount = String(row.amount); // Keep as string
    pc.lastUpdate = new Date().toISOString();
    updated++;
    console.log(`✅ ${pc.requestNo}: Rp ${row.amount.toLocaleString('id-ID')} (DO: ${row.doNo})`);
  }
}

// Save files
console.log('\n💾 Saving files...');

try {
  fs.writeFileSync(PC_FILE, JSON.stringify({ value: pettyCash }, null, 2));
  console.log('   ✓ Saved Petty Cash');
  
} catch (error) {
  console.error('❌ Error saving files:', error.message);
  process.exit(1);
}

console.log('\n📊 SUMMARY:');
console.log(`   ✅ Updated amounts: ${updated}`);
console.log(`   ⚠️  Skipped: ${skipped}`);
console.log('\n✅ DONE! Amount updated. You can now approve & distribute manually in the app.');
