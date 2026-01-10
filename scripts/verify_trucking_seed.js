const fs = require('fs');
const path = require('path');

const drivers = JSON.parse(fs.readFileSync('data/localStorage/trucking/trucking_drivers.json', 'utf8'));
const vehicles = JSON.parse(fs.readFileSync('data/localStorage/trucking/trucking_vehicles.json', 'utf8'));
const customers = JSON.parse(fs.readFileSync('data/localStorage/trucking/trucking_customers.json', 'utf8'));

console.log('=== TRUCKING SEED VERIFICATION ===\n');
console.log('DRIVERS (' + drivers.value.length + '):');
drivers.value.forEach(d => console.log(`  ${d.driverCode} - ${d.name} (${d.phone})`));
console.log('\nVEHICLES (' + vehicles.value.length + '):');
vehicles.value.forEach(v => console.log(`  ${v.vehicleNo} - ${v.brand} ${v.model} (${v.year})`));
console.log('\nCUSTOMERS (' + customers.value.length + '):');
customers.value.forEach(c => console.log(`  ${c.kode} - ${c.nama}`));
console.log('\n=== VERIFICATION COMPLETE ===');

