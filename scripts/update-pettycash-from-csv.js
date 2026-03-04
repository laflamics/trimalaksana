/**
 * Update Petty Cash from CSV data
 * This script will:
 * 1. Read CSV data
 * 2. Update Petty Cash amounts
 * 3. Auto-approve Petty Cash
 * 4. Auto-distribute Petty Cash (which creates Surat Jalan)
 */

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

async function updatePettyCashFromCSV() {
  console.log('🚀 Starting Petty Cash update from CSV...\n');

  try {
    // Parse CSV
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
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

    // Get current Petty Cash data
    const pettyCashRaw = localStorage.getItem('trucking_pettycash_requests');
    if (!pettyCashRaw) {
      console.error('❌ No Petty Cash data found in localStorage');
      return;
    }

    const pettyCashData = JSON.parse(pettyCashRaw);
    const pettyCash = Array.isArray(pettyCashData) ? pettyCashData : (pettyCashData.value || []);
    
    console.log(`📦 Found ${pettyCash.length} Petty Cash requests in localStorage\n`);

    // Get Delivery Orders data
    const doRaw = localStorage.getItem('trucking_delivery_orders');
    const doData = JSON.parse(doRaw);
    const deliveryOrders = Array.isArray(doData) ? doData : (doData.value || []);
    
    console.log(`📦 Found ${deliveryOrders.length} Delivery Orders\n`);

    // Get Drivers data
    const driversRaw = localStorage.getItem('trucking_drivers');
    const driversData = JSON.parse(driversRaw);
    const drivers = Array.isArray(driversData) ? driversData : (driversData.value || []);
    
    console.log(`📦 Found ${drivers.length} Drivers\n`);

    // Get Vehicles data
    const vehiclesRaw = localStorage.getItem('trucking_vehicles');
    const vehiclesData = JSON.parse(vehiclesRaw);
    const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData.value || []);
    
    console.log(`📦 Found ${vehicles.length} Vehicles\n`);

    // Get Routes data
    const routesRaw = localStorage.getItem('trucking_routes');
    const routesData = JSON.parse(routesRaw);
    const routes = Array.isArray(routesData) ? routesData : (routesData.value || []);
    
    console.log(`📦 Found ${routes.length} Routes\n`);

    // Get existing Delivery Notes
    const dnRaw = localStorage.getItem('trucking_delivery_notes');
    const dnData = dnRaw ? JSON.parse(dnRaw) : { value: [] };
    const deliveryNotes = Array.isArray(dnData) ? dnData : (dnData.value || []);
    
    console.log(`📦 Found ${deliveryNotes.length} existing Delivery Notes\n`);

    let updated = 0;
    let approved = 0;
    let distributed = 0;
    let suratJalanCreated = 0;
    let skipped = 0;

    // Process each CSV row
    for (const row of data) {
      if (!row.doNo || row.amount === 0) {
        skipped++;
        continue;
      }

      // Find matching Petty Cash by DO No
      const pcIndex = pettyCash.findIndex(pc => 
        pc.doNo === row.doNo && !pc.deleted
      );

      if (pcIndex === -1) {
        console.log(`⚠️  Petty Cash not found for DO ${row.doNo}`);
        skipped++;
        continue;
      }

      const pc = pettyCash[pcIndex];
      
      // Update amount
      if (pc.amount !== row.amount) {
        pc.amount = row.amount;
        pc.lastUpdate = new Date().toISOString();
        updated++;
        console.log(`✅ Updated ${pc.requestNo}: Amount = Rp ${row.amount.toLocaleString('id-ID')}`);
      }

      // Approve if needed
      if (row.statusAction1 === 'Approve' && pc.status === 'Open') {
        pc.status = 'Approved';
        pc.approvedBy = 'System Auto-Approve';
        pc.approvedAt = new Date().toISOString();
        pc.lastUpdate = new Date().toISOString();
        approved++;
        console.log(`   ✓ Approved ${pc.requestNo}`);
      }

      // Distribute if needed (creates Surat Jalan)
      if (row.statusAction2 === 'Distribusi' && pc.status === 'Approved') {
        // Check if Surat Jalan already exists
        const existingDN = deliveryNotes.find(dn => 
          dn.doNo === row.doNo && !dn.deleted
        );

        if (!existingDN) {
          // Find DO data
          const doItem = deliveryOrders.find(d => d.doNo === row.doNo);
          if (!doItem) {
            console.log(`   ⚠️  DO not found: ${row.doNo}`);
            continue;
          }

          // Find driver, vehicle, route
          const driver = drivers.find(d => d.id === doItem.driverId);
          const vehicle = vehicles.find(v => v.id === doItem.vehicleId);
          const route = routes.find(r => r.id === doItem.routeId);

          // Generate DN No
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
          const dnNo = `DN-${year}${month}${day}-${random}`;

          // Create Surat Jalan
          const newDN = {
            id: Date.now().toString() + Math.random(),
            no: deliveryNotes.length + suratJalanCreated + 1,
            dnNo: dnNo,
            doNo: doItem.doNo,
            pettyCashNo: pc.requestNo,
            customerCode: doItem.customerCode,
            customerName: doItem.customerName,
            customerAddress: doItem.customerAddress,
            deliveryDate: doItem.deliveryDate || new Date().toISOString().split('T')[0],
            driverId: driver?.id || doItem.driverId || '',
            driverName: driver?.name || doItem.driverName || '',
            vehicleId: vehicle?.id || doItem.vehicleId || '',
            vehicleNo: vehicle?.vehicleNo || doItem.vehicleNo || '',
            routeId: route?.id || doItem.routeId || '',
            routeName: route?.routeName || doItem.routeName || '',
            items: doItem.items || [],
            notes: doItem.notes || '',
            status: 'Open',
            created: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            timestamp: Date.now(),
            _timestamp: Date.now(),
          };

          deliveryNotes.push(newDN);
          suratJalanCreated++;
          console.log(`   ✓ Created Surat Jalan ${dnNo} for DO ${row.doNo}`);
        }

        // Update Petty Cash status to Distributed
        pc.status = 'Distributed';
        pc.distributedBy = 'System Auto-Distribute';
        pc.distributedAt = new Date().toISOString();
        pc.lastUpdate = new Date().toISOString();
        distributed++;
        console.log(`   ✓ Distributed ${pc.requestNo}`);
      }
    }

    // Save updated data
    console.log('\n💾 Saving updated data...');
    
    localStorage.setItem('trucking_pettycash_requests', JSON.stringify(pettyCash));
    console.log('   ✓ Saved Petty Cash data');
    
    localStorage.setItem('trucking_delivery_notes', JSON.stringify(deliveryNotes));
    console.log('   ✓ Saved Delivery Notes data');

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Updated amounts: ${updated}`);
    console.log(`   ✅ Approved: ${approved}`);
    console.log(`   ✅ Distributed: ${distributed}`);
    console.log(`   ✅ Surat Jalan created: ${suratJalanCreated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log('\n✅ DONE! Please refresh the page to see changes.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the update
updatePettyCashFromCSV();
