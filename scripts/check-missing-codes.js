const fs = require('fs');

const customers = JSON.parse(fs.readFileSync('data/localStorage/customers.json', 'utf8')).value;
const so = JSON.parse(fs.readFileSync('data/localStorage/salesOrders.json', 'utf8')).value;
const delivery = JSON.parse(fs.readFileSync('data/localStorage/delivery.json', 'utf8')).value;

// Find unique customer codes
const soCodes = new Set();
so.forEach(s => {
  if (s.customerKode) soCodes.add(s.customerKode);
});

const deliveryCodes = new Set();
delivery.forEach(d => {
  if (d.customerKode) deliveryCodes.add(d.customerKode);
});

const custCodes = new Set();
customers.forEach(c => {
  custCodes.add(c.kode);
});

// Find missing codes
const missingInSO = [];
soCodes.forEach(code => {
  if (!custCodes.has(code)) {
    missingInSO.push(code);
  }
});

const missingInDelivery = [];
deliveryCodes.forEach(code => {
  if (!custCodes.has(code)) {
    missingInDelivery.push(code);
  }
});

console.log('=== MISSING CODES ===');
console.log('In SO:', missingInSO);
console.log('In Delivery:', missingInDelivery);

// Show SO with missing codes
if (missingInSO.length > 0) {
  console.log('\n=== SO WITH MISSING CODES ===');
  const soWithMissing = so.filter(s => missingInSO.includes(s.customerKode));
  soWithMissing.slice(0, 10).forEach(s => {
    console.log(`  ${s.customerKode} | ${s.customer}`);
  });
}

// Show delivery with missing codes
if (missingInDelivery.length > 0) {
  console.log('\n=== DELIVERY WITH MISSING CODES ===');
  const deliveryWithMissing = delivery.filter(d => missingInDelivery.includes(d.customerKode));
  deliveryWithMissing.slice(0, 10).forEach(d => {
    console.log(`  ${d.customerKode} | ${d.customer}`);
  });
}
