/**
 * Fix Duplicate Suppliers - Simple Version
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Duplicate Suppliers...');

// Read suppliers.json
const suppliersPath = path.join(__dirname, 'data/localStorage/suppliers.json');

if (fs.existsSync(suppliersPath)) {
  try {
    const content = fs.readFileSync(suppliersPath, 'utf8');
    const data = JSON.parse(content);
    
    if (data && data.value && Array.isArray(data.value)) {
      const suppliers = data.value;
      console.log(`Original suppliers count: ${suppliers.length}`);
      
      // Remove duplicates based on kode
      const seen = new Set();
      const uniqueSuppliers = [];
      
      suppliers.forEach(supplier => {
        if (supplier && supplier.kode) {
          const key = supplier.kode.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSuppliers.push(supplier);
          } else {
            console.log(`Removed duplicate: ${supplier.kode} - ${supplier.nama}`);
          }
        }
      });
      
      // Renumber
      const renumberedSuppliers = uniqueSuppliers.map((supplier, index) => ({
        ...supplier,
        no: index + 1
      }));
      
      console.log(`Cleaned suppliers count: ${renumberedSuppliers.length}`);
      console.log(`Duplicates removed: ${suppliers.length - renumberedSuppliers.length}`);
      
      // Save back
      const cleanedData = {
        ...data,
        value: renumberedSuppliers
      };
      
      fs.writeFileSync(suppliersPath, JSON.stringify(cleanedData, null, 2));
      console.log('✅ Suppliers cleaned and saved!');
      
    } else {
      console.log('❌ Invalid data format in suppliers.json');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
} else {
  console.log('⚠️  suppliers.json not found');
}

// Read customers.json
const customersPath = path.join(__dirname, 'data/localStorage/customers.json');

if (fs.existsSync(customersPath)) {
  try {
    const content = fs.readFileSync(customersPath, 'utf8');
    const data = JSON.parse(content);
    
    if (data && data.value && Array.isArray(data.value)) {
      const customers = data.value;
      console.log(`Original customers count: ${customers.length}`);
      
      // Remove duplicates based on kode
      const seen = new Set();
      const uniqueCustomers = [];
      
      customers.forEach(customer => {
        if (customer && customer.kode) {
          const key = customer.kode.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push(customer);
          } else {
            console.log(`Removed duplicate: ${customer.kode} - ${customer.nama}`);
          }
        }
      });
      
      // Renumber
      const renumberedCustomers = uniqueCustomers.map((customer, index) => ({
        ...customer,
        no: index + 1
      }));
      
      console.log(`Cleaned customers count: ${renumberedCustomers.length}`);
      console.log(`Duplicates removed: ${customers.length - renumberedCustomers.length}`);
      
      // Save back
      const cleanedData = {
        ...data,
        value: renumberedCustomers
      };
      
      fs.writeFileSync(customersPath, JSON.stringify(cleanedData, null, 2));
      console.log('✅ Customers cleaned and saved!');
      
    } else {
      console.log('❌ Invalid data format in customers.json');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
} else {
  console.log('⚠️  customers.json not found');
}

console.log('\n🎯 Duplicate cleaning completed! Refresh the page to see the results.');