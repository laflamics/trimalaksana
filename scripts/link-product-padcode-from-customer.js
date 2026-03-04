const fs = require('fs');
const path = require('path');

// Read data
const customersPath = path.join(__dirname, '../data/localStorage/customers.json');
const productsPath = path.join(__dirname, '../data/localStorage/products.json');

const customersData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

let customers = customersData.value || customersData;
let products = productsData.value || productsData;

if (!Array.isArray(customers)) customers = [];
if (!Array.isArray(products)) products = [];

console.log(`[Link PadCode] Starting with ${products.length} products and ${customers.length} customers`);

// Build mapping: customer nama → customer kode (PL code)
const customerNameToKodeMap = {};
customers.forEach((customer) => {
  const nama = (customer.nama || '').trim().toUpperCase();
  customerNameToKodeMap[nama] = customer.kode;
});

console.log(`[Link PadCode] Built mapping for ${Object.keys(customerNameToKodeMap).length} customers`);

// Helper function to find customer kode
function findCustomerKode(productCustomerName) {
  if (!productCustomerName) return null;
  
  // Try exact match first
  const normalized = productCustomerName.trim().toUpperCase();
  if (customerNameToKodeMap[normalized]) {
    return customerNameToKodeMap[normalized];
  }
  
  // Try partial match (remove PT., CV., etc.)
  const cleaned = normalized.replace(/^(PT\.|CV\.|PT |CV )\s*/i, '').trim();
  for (const [custName, kode] of Object.entries(customerNameToKodeMap)) {
    const cleanedCustName = custName.replace(/^(PT\.|CV\.|PT |CV )\s*/i, '').trim();
    if (cleanedCustName === cleaned) {
      return kode;
    }
  }
  
  return null;
}

// Link padCode from customer kode
let updated = 0;
let skipped = 0;
let noCustomer = 0;

const updatedProducts = products.map((product) => {
  // If product has no customer, skip
  if (!product.customer) {
    noCustomer++;
    return product;
  }
  
  // Find customer kode
  const customerKode = findCustomerKode(product.customer);
  
  if (!customerKode) {
    console.log(`  ⚠️  Skipped: "${product.kode}" - Customer not found: "${product.customer}"`);
    skipped++;
    return product;
  }
  
  // If padCode already matches, skip
  if (product.padCode === customerKode) {
    return product;
  }
  
  // Update padCode
  console.log(`  ✅ Updated: "${product.kode}" - Set padCode to "${customerKode}" (from customer: "${product.customer}")`);
  updated++;
  
  return {
    ...product,
    padCode: customerKode,
  };
});

// Save updated products
const output = {
  value: updatedProducts,
};

fs.writeFileSync(productsPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n=== SUMMARY ===`);
console.log(`Total products: ${products.length}`);
console.log(`Updated: ${updated}`);
console.log(`Skipped (customer not found): ${skipped}`);
console.log(`No customer: ${noCustomer}`);
console.log(`Already correct: ${products.length - updated - skipped - noCustomer}`);
console.log(`\n✅ PadCode linking complete!`);
