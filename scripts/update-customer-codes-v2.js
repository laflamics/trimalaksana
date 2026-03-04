const fs = require('fs');
const path = require('path');

// Read the code mapping dari customers
const customersPath = path.join(__dirname, '../data/localStorage/customers.json');
const customersData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
const customers = customersData.value || customersData;

// Build mapping dari nama customer ke PL code (normalize untuk matching)
const nameToCodeMap = {};
const normalizeMap = {}; // Map normalized names to original names

customers.forEach((customer) => {
  const nama = (customer.nama || '').trim();
  const normalized = nama.toUpperCase().replace(/^(PT\.|CV\.|PT |CV )\s*/i, '').trim();
  nameToCodeMap[nama] = customer.kode;
  normalizeMap[normalized] = customer.kode;
});

console.log(`[Update Customer Codes v2] Built mapping for ${Object.keys(nameToCodeMap).length} customers`);

// Helper function to find customer code
function findCustomerCode(customerName) {
  if (!customerName) return null;
  
  // Try exact match first
  if (nameToCodeMap[customerName]) {
    return nameToCodeMap[customerName];
  }
  
  // Try normalized match
  const normalized = customerName.toUpperCase().replace(/^(PT\.|CV\.|PT |CV )\s*/i, '').trim();
  if (normalizeMap[normalized]) {
    return normalizeMap[normalized];
  }
  
  return null;
}

// Files to update
const filesToUpdate = [
  'data/localStorage/salesOrders.json',
  'data/localStorage/spk.json',
  'data/localStorage/delivery.json',
  'data/localStorage/purchaseOrders.json',
  'data/localStorage/quotations.json',
];

filesToUpdate.forEach((filePath) => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  try {
    const fileData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    let items = fileData.value || fileData;
    if (!Array.isArray(items)) {
      items = [];
    }
    
    let updated = 0;
    
    // Update customer codes in items
    items = items.map((item) => {
      let changed = false;
      
      // Update customerKode if customer name exists
      if (item.customer) {
        const newCode = findCustomerCode(item.customer);
        if (newCode && item.customerKode !== newCode) {
          console.log(`  Updated: "${item.customer}" → ${newCode}`);
          item.customerKode = newCode;
          changed = true;
        }
      }
      
      // For SO items, also update items array
      if (item.items && Array.isArray(item.items)) {
        item.items = item.items.map((subItem) => {
          if (subItem.customer) {
            const newCode = findCustomerCode(subItem.customer);
            if (newCode && subItem.customerKode !== newCode) {
              subItem.customerKode = newCode;
              changed = true;
            }
          }
          return subItem;
        });
      }
      
      if (changed) {
        updated++;
      }
      
      return item;
    });
    
    // Save updated data
    const output = {
      value: items,
    };
    
    fs.writeFileSync(fullPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✅ ${filePath}: Updated ${updated} items`);
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n✅ All customer codes updated (v2)!');
