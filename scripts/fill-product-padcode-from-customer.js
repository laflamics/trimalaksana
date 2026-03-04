const fs = require('fs');
const path = require('path');

// Read data
const productsPath = path.join(__dirname, '../data/localStorage/products.json');
const packagingCustomersPath = path.join(__dirname, '../data/localStorage/Packaging/customers.json');

const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const packagingCustomersData = JSON.parse(fs.readFileSync(packagingCustomersPath, 'utf8'));

// Build customer code mapping from packaging customers
const customerCodeMap = new Map();
packagingCustomersData.value.forEach(customer => {
  if (customer.nama && customer.kode) {
    const customerName = customer.nama.trim();
    if (!customerCodeMap.has(customerName)) {
      customerCodeMap.set(customerName, customer.kode);
    }
  }
});

console.log('\n=== CUSTOMER CODE MAPPING ===');
console.log(`Found ${customerCodeMap.size} unique customers from quotations:`);
Array.from(customerCodeMap.entries()).forEach(([name, code]) => {
  console.log(`  ${code}: ${name}`);
});

// Fill empty padCodes in products
let filledCount = 0;
let skippedCount = 0;
const updatedProducts = productsData.value.map(product => {
  if (product.customer) {
    const customerName = product.customer.trim();
    const customerCode = customerCodeMap.get(customerName);
    
    if (customerCode) {
      // If padCode is empty, fill with customer code
      if (!product.padCode || product.padCode === '') {
        filledCount++;
        return {
          ...product,
          padCode: customerCode
        };
      }
    } else {
      skippedCount++;
    }
  }
  return product;
});

console.log('\n=== FILL RESULTS ===');
console.log(`Total products: ${productsData.value.length}`);
console.log(`Filled empty padCodes: ${filledCount}`);
console.log(`Skipped (customer not found): ${skippedCount}`);
console.log(`Already have padCode: ${productsData.value.length - filledCount - skippedCount}`);

// Show examples of filled products
console.log('\n=== EXAMPLES OF FILLED PRODUCTS ===');
updatedProducts
  .filter(p => p.customer && customerCodeMap.has(p.customer.trim()) && !productsData.value.find(orig => orig.id === p.id && orig.padCode === p.padCode))
  .slice(0, 10)
  .forEach(product => {
    console.log(`  ${product.kode}: ${product.nama}`);
    console.log(`    Customer: ${product.customer}`);
    console.log(`    PadCode: ${product.padCode}`);
  });

// Update products.json directly with SAME timestamp (don't change it or server will sync back)
fs.writeFileSync(productsPath, JSON.stringify({
  value: updatedProducts,
  timestamp: productsData.timestamp,
  _timestamp: productsData._timestamp
}, null, 2));

console.log(`\n✓ Updated products.json with same timestamp: ${productsData.timestamp}`);

// Create summary report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalProducts: productsData.value.length,
    filledCount: filledCount,
    skippedCount: skippedCount,
    alreadyHavePadCode: productsData.value.length - filledCount - skippedCount
  },
  customerCodeMapping: Object.fromEntries(customerCodeMap),
  filledProducts: updatedProducts
    .filter(p => p.customer && customerCodeMap.has(p.customer.trim()) && !productsData.value.find(orig => orig.id === p.id && orig.padCode === p.padCode))
    .map(p => ({
      kode: p.kode,
      nama: p.nama,
      customer: p.customer,
      padCode: p.padCode
    }))
};

const reportPath = path.join(__dirname, '../data/localStorage/padcode_fill_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`✓ Report saved to: ${reportPath}`);
