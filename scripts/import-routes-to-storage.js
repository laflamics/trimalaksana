const fs = require('fs');
const path = require('path');

// Path file JSON hasil import
const importFile = path.join(__dirname, '../data/trucking-routes-import.json');

// Baca data import
console.log('📖 Reading import data from:', importFile);
const importedRoutes = JSON.parse(fs.readFileSync(importFile, 'utf8'));

console.log(`✅ Found ${importedRoutes.length} routes to import`);

// Simpan ke storage (akan di-copy manual atau via UI)
// Karena storage service butuh browser context, kita simpan sebagai JSON yang bisa di-import via UI

const outputFile = path.join(__dirname, '../data/trucking-routes-ready.json');

// Format untuk import ke storage
const routesForStorage = importedRoutes.map(route => ({
  id: route.id,
  no: route.no,
  routeCode: route.routeCode,
  routeName: route.routeName,
  origin: route.origin,
  destination: route.destination,
  distance: route.distance,
  distanceUnit: route.distanceUnit,
  estimatedTime: route.estimatedTime,
  estimatedTimeUnit: route.estimatedTimeUnit,
  tollCost: route.tollCost,
  fuelCost: route.fuelCost,
  status: route.status,
  notes: route.notes,
  // Extended fields (akan disimpan di notes atau bisa di-extend interface)
  _customer: route.customer,
  _truckType: route.truckType,
  _price: route.price,
}));

fs.writeFileSync(outputFile, JSON.stringify(routesForStorage, null, 2), 'utf8');

console.log(`\n✅ Routes formatted and saved to: ${outputFile}`);
console.log(`\n📋 Next steps:`);
console.log(`   1. File sudah siap di: ${outputFile}`);
console.log(`   2. Bisa di-import via UI di Routes page (tambah fitur import)`);
console.log(`   3. Atau copy ke localStorage key: trucking_routes`);
console.log(`\n📊 Summary:`);
console.log(`   - Total routes: ${routesForStorage.length}`);
console.log(`   - Format: Compatible with trucking_routes storage`);

