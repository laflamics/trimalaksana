const fs = require('fs');
const path = require('path');

// Read packaging data
const packagingProductsPath = path.join(__dirname, '../data/localStorage/Packaging/products.json');
const packagingCustomersPath = path.join(__dirname, '../data/localStorage/Packaging/customers.json');

const productsData = JSON.parse(fs.readFileSync(packagingProductsPath, 'utf8'));
const customersData = JSON.parse(fs.readFileSync(packagingCustomersPath, 'utf8'));

// Build customer code mapping from packaging customers
const customerCodeMap = new Map();
customersData.value.forEach(customer => {
  if (customer.nama && customer.kode) {
    const customerName = customer.nama.trim();
    if (!customerCodeMap.has(customerName)) {
      customerCodeMap.set(customerName, customer.kode);
    }
  }
});

console.log('\n=== PACKAGING CUSTOMER CODE MAPPING ===');
console.log(`Found ${customerCodeMap.size} unique customers:`);
Array.from(customerCodeMap.entries()).forEach(([name, code]) => {
  console.log(`  ${code}: ${name}`);
});

// Fill empty padCodes in products
let filledCount = 0;
let skippedCount = 0;
let alreadyHaveCount = 0;

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
      } else {
        alreadyHaveCount++;
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
console.log(`Already have padCode: ${alreadyHaveCount}`);
console.log(`Skipped (customer not found): ${skippedCount}`);

// Show examples of filled products
const filledProducts = updatedProducts.filter(p => 
  p.customer && 
  customerCodeMap.has(p.customer.trim()) && 
  !productsData.value.find(orig => orig.id === p.id && orig.padCode === p.padCode)
);

if (filledProducts.length > 0) {
  console.log('\n=== EXAMPLES OF FILLED PRODUCTS ===');
  filledProducts.slice(0, 15).forEach(product => {
    console.log(`  ${product.kode}: ${product.nama}`);
    console.log(`    Customer: ${product.customer}`);
    console.log(`    PadCode: ${product.padCode}`);
  });
}

// Save updated products
const outputPath = path.join(__dirname, '../data/localStorage/Packaging/products_padcode_filled.json');
fs.writeFileSync(outputPath, JSON.stringify({
  value: updatedProducts,
  timestamp: productsData.timestamp,
  _timestamp: productsData._timestamp
}, null, 2));

console.log(`\n✓ Updated products saved to: ${outputPath}`);

// Create summary report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalProducts: productsData.value.length,
    filledCount: filledCount,
    alreadyHaveCount: alreadyHaveCount,
    skippedCount: skippedCount
  },
  customerCodeMapping: Object.fromEntries(customerCodeMap),
  filledProducts: filledProducts.map(p => ({
    kode: p.kode,
    nama: p.nama,
    customer: p.customer,
    padCode: p.padCode
  }))
};

const reportPath = path.join(__dirname, '../data/localStorage/Packaging/padcode_fill_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`✓ Report saved to: ${reportPath}`);
