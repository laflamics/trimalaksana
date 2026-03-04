const fs = require('fs');
const path = require('path');

// Read the code mapping dari customers
const customersPath = path.join(__dirname, '../data/localStorage/customers.json');
const customersData = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
const customers = customersData.value || customersData;

// Build mapping dari nama customer ke PL code
const nameToCodeMap = {};
customers.forEach((customer) => {
  const nama = (customer.nama || '').trim().toUpperCase();
  nameToCodeMap[nama] = customer.kode;
});

console.log(`[Update Customer Codes] Built mapping for ${Object.keys(nameToCodeMap).length} customers`);

// Files to update
const filesToUpdate = [
  'data/localStorage/salesOrders.json',
  'data/localStorage/spk.json',
  'data/localStorage/ptp.json',
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
        const customerName = (item.customer || '').trim().toUpperCase();
        const newCode = nameToCodeMap[customerName];
        if (newCode && item.customerKode !== newCode) {
          item.customerKode = newCode;
          changed = true;
        }
      }
      
      // For SO items, also update items array
      if (item.items && Array.isArray(item.items)) {
        item.items = item.items.map((subItem) => {
          if (subItem.customer) {
            const customerName = (subItem.customer || '').trim().toUpperCase();
            const newCode = nameToCodeMap[customerName];
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

console.log('\n✅ All customer codes updated!');
