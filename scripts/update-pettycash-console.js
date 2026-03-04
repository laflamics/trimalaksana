// PASTE THIS IN BROWSER CONSOLE (F12)
// This will update Petty Cash from CSV data

(async function() {
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

  console.log('🚀 Starting Petty Cash update from CSV...\n');

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

  // Helper function to safely get data from localStorage
  const getData = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) {
      console.warn(`⚠️  No data found for ${key}`);
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.value || []);
    } catch (e) {
      console.error(`❌ Error parsing ${key}:`, e);
      return [];
    }
  };

  const pettyCash = getData('trucking_pettycash_requests');
  const deliveryOrders = getData('trucking_delivery_orders');
  const drivers = getData('trucking_drivers');
  const vehicles = getData('trucking_vehicles');
  const routes = getData('trucking_routes');
  const deliveryNotes = getData('trucking_delivery_notes');
  
  console.log(`📦 Petty Cash: ${pettyCash.length}, DO: ${deliveryOrders.length}, Drivers: ${drivers.length}, Vehicles: ${vehicles.length}, Routes: ${routes.length}, DN: ${deliveryNotes.length}\n`);

  if (pettyCash.length === 0) {
    console.error('❌ No Petty Cash data found! Please make sure you are in Trucking module and have confirmed some DOs first.');
    return;
  }

  if (deliveryOrders.length === 0) {
    console.error('❌ No Delivery Orders found! Please make sure you have some DOs in the system.');
    return;
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
    
    if (pc.amount !== row.amount) {
      pc.amount = row.amount;
      pc.lastUpdate = new Date().toISOString();
      updated++;
      console.log(`✅ ${pc.requestNo}: Rp ${row.amount.toLocaleString('id-ID')}`);
    }

    if (row.statusAction1 === 'Approve' && pc.status === 'Open') {
      pc.status = 'Approved';
      pc.approvedBy = 'System';
      pc.approvedAt = new Date().toISOString();
      pc.lastUpdate = new Date().toISOString();
      approved++;
      console.log(`   ✓ Approved`);
    }

    if (row.statusAction2 === 'Distribusi' && pc.status === 'Approved') {
      const existingDN = deliveryNotes.find(dn => dn.doNo === row.doNo && !dn.deleted);
      
      if (!existingDN) {
        const doItem = deliveryOrders.find(d => d.doNo === row.doNo);
        if (!doItem) {
          console.log(`   ⚠️  DO not found: ${row.doNo}`);
          continue;
        }

        const driver = drivers.find(d => d.id === doItem.driverId);
        const vehicle = vehicles.find(v => v.id === doItem.vehicleId);
        const route = routes.find(r => r.id === doItem.routeId);

        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const dnNo = `DN-${year}${month}${day}-${random}`;

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
        console.log(`   ✓ Created Surat Jalan ${dnNo}`);
      }

      pc.status = 'Distributed';
      pc.distributedBy = 'System';
      pc.distributedAt = new Date().toISOString();
      pc.lastUpdate = new Date().toISOString();
      distributed++;
      console.log(`   ✓ Distributed`);
    }
  }

  localStorage.setItem('trucking_pettycash_requests', JSON.stringify(pettyCash));
  localStorage.setItem('trucking_delivery_notes', JSON.stringify(deliveryNotes));

  console.log('\n📊 SUMMARY:');
  console.log(`   ✅ Updated: ${updated}, Approved: ${approved}, Distributed: ${distributed}`);
  console.log(`   ✅ Surat Jalan created: ${suratJalanCreated}, Skipped: ${skipped}`);
  console.log('\n✅ DONE! Refresh page to see changes.');
})();
