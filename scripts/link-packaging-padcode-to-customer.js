const fs = require('fs');
const path = require('path');

// Read products data
const productsPath = path.join(__dirname, '../data/localStorage/products.json');
const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// Extract unique customers with their padCodes
const customerMap = new Map();
const padCodeMap = new Map(); // padCode -> customer mapping

productsData.value.forEach(product => {
  if (product.customer && product.padCode) {
    const customerName = product.customer.trim();
    
    if (!customerMap.has(customerName)) {
      customerMap.set(customerName, {
        nama: customerName,
        padCodes: new Set(),
        products: []
      });
    }
    
    const customer = customerMap.get(customerName);
    customer.padCodes.add(product.padCode);
    customer.products.push({
      kode: product.kode,
      nama: product.nama,
      padCode: product.padCode
    });
    
    // Map padCode to customer
    if (!padCodeMap.has(product.padCode)) {
      padCodeMap.set(product.padCode, customerName);
    }
  }
});

// Create customer master with codes
const customerMaster = Array.from(customerMap.entries()).map((entry, index) => {
  const [customerName, data] = entry;
  const customerCode = `CUST${String(index + 1).padStart(3, '0')}`;
  
  return {
    id: `cust-${Date.now()}-${index}`,
    no: index + 1,
    kode: customerCode,
    nama: customerName,
    padCodes: Array.from(data.padCodes),
    productCount: data.products.length,
    products: data.products,
    created: new Date().toISOString()
  };
});

// Update products with customer code
const updatedProducts = productsData.value.map(product => {
  if (product.customer && product.padCode) {
    const customerName = product.customer.trim();
    const customer = customerMaster.find(c => c.nama === customerName);
    
    if (customer) {
      return {
        ...product,
        customerCode: customer.kode,
        padCode: product.padCode
      };
    }
  }
  return product;
});

// Output results
console.log('\n=== CUSTOMER MASTER ===');
console.log(`Total unique customers: ${customerMaster.length}`);
console.log('\nCustomer Code Mapping:');
customerMaster.forEach(customer => {
  console.log(`${customer.kode}: ${customer.nama} (${customer.productCount} products, ${customer.padCodes.length} padCodes)`);
  console.log(`  PadCodes: ${customer.padCodes.join(', ')}`);
});

console.log('\n=== PADCODE TO CUSTOMER MAPPING ===');
const sortedPadCodes = Array.from(padCodeMap.entries()).sort();
sortedPadCodes.forEach(([padCode, customerName]) => {
  const customer = customerMaster.find(c => c.nama === customerName);
  console.log(`${padCode} -> ${customer.kode} (${customerName})`);
});

// Save customer master
const customerMasterPath = path.join(__dirname, '../data/localStorage/packaging_customerMaster.json');
fs.writeFileSync(customerMasterPath, JSON.stringify({
  value: customerMaster,
  timestamp: Date.now(),
  _timestamp: Date.now()
}, null, 2));

console.log(`\n✓ Customer master saved to: ${customerMasterPath}`);

// Save updated products
const updatedProductsPath = path.join(__dirname, '../data/localStorage/products_with_customerCode.json');
fs.writeFileSync(updatedProductsPath, JSON.stringify({
  value: updatedProducts,
  timestamp: productsData.timestamp,
  _timestamp: productsData._timestamp
}, null, 2));

console.log(`✓ Updated products saved to: ${updatedProductsPath}`);

// Create mapping file for reference
const mappingFile = {
  customerCodeToPadCodes: {},
  padCodeToCustomerCode: {},
  summary: {
    totalCustomers: customerMaster.length,
    totalProducts: updatedProducts.length,
    totalPadCodes: padCodeMap.size
  }
};

customerMaster.forEach(customer => {
  mappingFile.customerCodeToPadCodes[customer.kode] = {
    nama: customer.nama,
    padCodes: customer.padCodes,
    productCount: customer.productCount
  };
});

Array.from(padCodeMap.entries()).forEach(([padCode, customerName]) => {
  const customer = customerMaster.find(c => c.nama === customerName);
  mappingFile.padCodeToCustomerCode[padCode] = customer.kode;
});

const mappingPath = path.join(__dirname, '../data/localStorage/packaging_padcode_customer_mapping.json');
fs.writeFileSync(mappingPath, JSON.stringify(mappingFile, null, 2));

console.log(`✓ Mapping reference saved to: ${mappingPath}`);

console.log('\n=== SUMMARY ===');
console.log(`Total customers: ${customerMaster.length}`);
console.log(`Total products: ${updatedProducts.length}`);
console.log(`Total unique padCodes: ${padCodeMap.size}`);
