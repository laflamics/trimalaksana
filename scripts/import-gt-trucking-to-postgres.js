const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration from command line args
const API_URL = process.argv[2] || 'http://100.81.50.37:9999';

// Helper to read JSON file
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Helper to write JSON file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ Written to ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
  }
}

// Helper to make API calls
async function callApi(endpoint, method = 'POST', data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error.response?.data || error.message);
    throw error;
  }
}

// Transform and import GT Customers
async function importGTCustomers() {
  console.log('\n=== Importing GT Customers ===');
  const filePath = path.join(__dirname, 'master/gt/gt_customers.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No customer data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(customer => ({
        id: customer.id,
        kode: customer.kode,
        nama: customer.nama,
        kontak: customer.kontak || '',
        picTitle: customer.picTitle || '',
        npwp: customer.npwp || '',
        email: customer.email || '',
        telepon: customer.telepon || '',
        alamat: customer.alamat || '',
        kategori: customer.kategori || 'Customer',
        created: customer.created || new Date().toISOString(),
        padCode: customer.padCode || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('gt_customers')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} GT customers`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT customers:`, error.message);
    return 0;
  }
}

// Transform and import GT Products
async function importGTProducts() {
  console.log('\n=== Importing GT Products ===');
  const filePath = path.join(__dirname, 'master/gt/gt_products.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No product data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(product => ({
        id: product.id,
        product_id: product.product_id || product.kode,
        kode: product.kode,
        nama: product.nama,
        satuan: product.satuan || 'PCS',
        harga: product.harga || 0,
        hargaSales: product.hargaSales || 0,
        hargaFg: product.hargaFg || 0,
        kategori: product.kategori || '',
        created: product.created || new Date().toISOString(),
        lastUpdate: product.lastUpdate || new Date().toISOString(),
        userUpdate: product.userUpdate || 'System',
        padCode: product.padCode || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('gt_products')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} GT products`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT products:`, error.message);
    return 0;
  }
}

// Transform and import GT Suppliers
async function importGTSuppliers() {
  console.log('\n=== Importing GT Suppliers ===');
  const filePath = path.join(__dirname, 'master/gt/gt_suppliers.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value || data.value.length === 0) {
    console.log('No supplier data found (empty)');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(supplier => ({
        id: supplier.id,
        kode: supplier.kode,
        nama: supplier.nama,
        kontak: supplier.kontak || '',
        npwp: supplier.npwp || '',
        email: supplier.email || '',
        telepon: supplier.telepon || '',
        alamat: supplier.alamat || '',
        kategori: supplier.kategori || 'Supplier',
        created: supplier.created || new Date().toISOString(),
        padCode: supplier.padCode || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('gt_suppliers')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} GT suppliers`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT suppliers:`, error.message);
    return 0;
  }
}

// Transform and import GT User Access Control
async function importGTUserAccess() {
  console.log('\n=== Importing GT User Access Control ===');
  const filePath = path.join(__dirname, 'master/gt/gt_userAccessControl.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No user access data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(user => ({
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        accessCode: user.accessCode,
        isActive: user.isActive !== false,
        businessUnits: user.businessUnits || ['general-trading'],
        defaultBusiness: user.defaultBusiness || 'general-trading',
        menuAccess: user.menuAccess || {},
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString(),
        deleted: user.deleted || false,
        deletedAt: user.deletedAt || null,
        padCode: user.padCode || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('gt_userAccessControl')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} GT users`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT users:`, error.message);
    return 0;
  }
}

// Transform and import Trucking Customers
async function importTruckingCustomers() {
  console.log('\n=== Importing Trucking Customers ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_customers.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No trucking customer data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(customer => ({
        id: customer.id,
        kode: customer.kode,
        nama: customer.nama,
        kontak: customer.kontak || '',
        npwp: customer.npwp || '',
        email: customer.email || '',
        telepon: customer.telepon || '',
        alamat: customer.alamat || '',
        kategori: customer.kategori || 'Customer',
        created: customer.created || new Date().toISOString(),
        padCode: customer.padCode || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_customers')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} trucking customers`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import trucking customers:`, error.message);
    return 0;
  }
}

// Transform and import Trucking Vehicles
async function importTruckingVehicles() {
  console.log('\n=== Importing Trucking Vehicles ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_vehicles.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No trucking vehicle data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(vehicle => ({
        id: vehicle.id,
        vehicleNo: vehicle.vehicleNo || '',
        vehicleType: vehicle.vehicleType || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        year: vehicle.year || 0,
        capacity: vehicle.capacity || 0,
        capacityUnit: vehicle.capacityUnit || 'KG',
        fuelType: vehicle.fuelType || '',
        licensePlate: vehicle.licensePlate || '',
        stnkExpiry: vehicle.stnkExpiry || '',
        kirExpiry: vehicle.kirExpiry || '',
        status: vehicle.status || 'Active',
        notes: vehicle.notes || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_vehicles')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} trucking vehicles`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import trucking vehicles:`, error.message);
    return 0;
  }
}

// Transform and import Trucking Drivers
async function importTruckingDrivers() {
  console.log('\n=== Importing Trucking Drivers ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_drivers.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No trucking driver data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(driver => ({
        id: driver.id,
        driverCode: driver.driverCode || '',
        name: driver.name || '',
        licenseNo: driver.licenseNo || '',
        licenseType: driver.licenseType || '',
        licenseExpiry: driver.licenseExpiry || '',
        phone: driver.phone || '',
        email: driver.email || '',
        address: driver.address || '',
        status: driver.status || 'Active',
        notes: driver.notes || '',
        vehicleId: driver.vehicleId || '',
        vehicleNo: driver.vehicleNo || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_drivers')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} trucking drivers`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import trucking drivers:`, error.message);
    return 0;
  }
}

// Transform and import Trucking Routes
async function importTruckingRoutes() {
  console.log('\n=== Importing Trucking Routes ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_routes.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No trucking route data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(route => ({
        id: route.id,
        routeCode: route.routeCode || '',
        routeName: route.routeName || '',
        origin: route.origin || '',
        destination: route.destination || '',
        distance: route.distance || 0,
        distanceUnit: route.distanceUnit || 'KM',
        estimatedTime: route.estimatedTime || 0,
        estimatedTimeUnit: route.estimatedTimeUnit || 'Hours',
        tollCost: route.tollCost || 0,
        fuelCost: route.fuelCost || 0,
        status: route.status || 'Active',
        notes: route.notes || '',
        padCode: route.padCode || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_routes')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} trucking routes`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import trucking routes:`, error.message);
    return 0;
  }
}

// Transform and import Trucking User Access Control
async function importTruckingUserAccess() {
  console.log('\n=== Importing Trucking User Access Control ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_userAccessControl.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.error('No trucking user access data found');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(user => ({
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        accessCode: user.accessCode,
        isActive: user.isActive !== false,
        businessUnits: user.businessUnits || ['tracking'],
        defaultBusiness: user.defaultBusiness || 'tracking',
        menuAccess: user.menuAccess || {},
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString(),
        deleted: user.deleted || false,
        deletedAt: user.deletedAt || null,
        padCode: user.padCode || '',
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_userAccessControl')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} trucking users`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import trucking users:`, error.message);
    return 0;
  }
}

// Helper to convert Excel serial number to ISO date
function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number') return new Date().toISOString();
  // Excel epoch is 1900-01-01, but with a leap year bug
  const excelEpoch = new Date(1900, 0, 1);
  const date = new Date(excelEpoch.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

// Helper to convert date string (MM/DD/YY or DD/MM/YY) to ISO date
function parseAndFormatDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  if (typeof dateStr !== 'string') return new Date().toISOString();
  
  // Try parsing MM/DD/YY format (most common in CSV)
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    let month, day, year;
    
    // Assume MM/DD/YY format from CSV
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
    
    // Convert 2-digit year to 4-digit (00-99 -> 2000-2099)
    if (year < 100) {
      year += 2000;
    }
    
    // Validate date
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day);
      return date.toISOString();
    }
  }
  
  return new Date().toISOString();
}

// Transform and import GT Sales Orders
async function importGTSalesOrders() {
  console.log('\n=== Importing GT Sales Orders ===');
  const filePath = path.join(__dirname, 'master/gt/gt_salesOrders.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.log('No sales order data found (empty)');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(so => ({
        id: so.id,
        soNo: so.soNo,
        customer: so.customer,
        paymentTerms: so.paymentTerms || 'TOP',
        topDays: so.topDays || 30,
        status: so.status || 'OPEN',
        created: so.created || new Date().toISOString(),
        items: (so.items || []).map(item => ({
          id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          productId: item.productId || item.itemSku || '',
          productKode: item.productKode || item.itemSku || '',
          productName: item.productName || item.product || '',
          qty: item.qty || 0,
          unit: item.unit || 'PCS',
          price: item.price || 0,
          total: item.total || 0,
          specNote: item.specNote || '',
          discountPercent: item.discountPercent || 0,
        })),
        ppicNotified: so.ppicNotified || false,
        notes: so.notes || '',
        timestamp: so.timestamp || Date.now(),
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('gt_salesOrders')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} GT sales orders`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT sales orders:`, error.message);
    return 0;
  }
}

// Transform and import GT Delivery Notes
async function importGTDeliveryNotes() {
  console.log('\n=== Importing GT Delivery Notes ===');
  const filePath = path.join(__dirname, 'master/gt/gt_delivery.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.log('No delivery note data found (empty)');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(dn => ({
        id: dn.id,
        sjNo: dn.sjNo,
        soNo: dn.soNo,
        customer: dn.customer,
        status: dn.status || 'CLOSE',
        items: (dn.items || []).map(item => ({
          spkNo: item.spkNo || '',
          product: item.product || '',
          productCode: item.productCode || '',
          qty: item.qty || 0,
          unit: item.unit || 'PCS',
          soNo: item.soNo || dn.soNo || '',
        })),
        deliveryDate: dn.deliveryDate || new Date().toISOString(),
        notes: dn.notes || '',
        timestamp: dn.timestamp || Date.now(),
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('gt_delivery')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} GT delivery notes`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT delivery notes:`, error.message);
    return 0;
  }
}

// Transform and import GT Invoices
async function importGTInvoices() {
  console.log('\n=== Importing GT Invoices ===');
  const filePath = path.join(__dirname, 'master/gt/gt_invoices.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.log('No invoice data found (empty)');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(inv => {
        // Calculate total tax from items
        const totalTax = (inv.items || []).reduce((sum, item) => sum + (item.tax || 0), 0);
        
        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          soNo: inv.soNo,
          sjNo: inv.sjNo,
          customer: inv.customer,
          noFP: inv.noFP || '',
          status: inv.status || 'OPEN',
          created: inv.created || new Date().toISOString(),
          topDate: inv.topDate || new Date().toISOString(),
          items: (inv.items || []).map(item => ({
            itemSku: item.productCode || item.itemSku || '',
            product: item.productName || item.product || '',
            qty: item.qty || 0,
            unit: item.unit || 'PCS',
            price: item.price || 0,
            discount: item.discount || 0,
            total: item.total || 0,
            tax: item.tax || 0,
            totalAkhir: item.totalAkhir || 0,
          })),
          discount: inv.discount || 0,
          tax: totalTax,
          taxPercent: inv.taxPercent || 11,
          notes: inv.notes || '',
          timestamp: inv.timestamp || Date.now(),
        };
      })
    };

    await callApi(`/api/storage/${encodeURIComponent('gt_invoices')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} GT invoices`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import GT invoices:`, error.message);
    return 0;
  }
}

// Transform and import Trucking Invoices
async function importTruckingInvoices() {
  console.log('\n=== Importing Trucking Invoices ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_invoices.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.log('No trucking invoice data found (empty)');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map(inv => {
        // Calculate total tax from items
        const totalTax = (inv.items || []).reduce((sum, item) => sum + (item.tax || 0), 0);
        
        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          customer: inv.customer,
          noFP: inv.noFP || '',
          status: inv.status || 'OPEN',
          created: inv.created || new Date().toISOString(),
          topDate: inv.topDate || new Date().toISOString(),
          items: (inv.items || []).map(item => ({
            itemSku: item.itemSku || '',
            product: item.product || '',
            qty: item.qty || 0,
            unit: item.unit || 'PCS',
            price: item.price || 0,
            discount: item.discount || 0,
            total: item.total || 0,
            tax: item.tax || 0,
            totalAkhir: item.totalAkhir || 0,
          })),
          discount: inv.discount || 0,
          tax: totalTax,
          taxPercent: inv.taxPercent || 11,
          notes: inv.notes || '',
          timestamp: inv.timestamp || Date.now(),
        };
      })
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_invoices')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} Trucking invoices`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import Trucking invoices:`, error.message);
    return 0;
  }
}

// Transform and import Trucking Surat Jalan (Delivery Notes)
async function importTruckingSuratJalan() {
  console.log('\n=== Importing Trucking Surat Jalan ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_suratJalan.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.log('No trucking surat jalan data found (empty)');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map((sj, idx) => ({
        id: sj.id,
        no: idx + 1,
        dnNo: sj.dnNo || '',
        doNo: sj.doNo || '',
        customerName: sj.customerName || '',
        customerAddress: sj.customerAddress || '',
        driverId: sj.driverId || '',
        driverName: sj.driverName || '',
        driverCode: sj.driverCode || '',
        vehicleId: sj.vehicleId || '',
        vehicleNo: sj.vehicleNo || '',
        routeId: sj.routeId || '',
        routeName: sj.routeName || '',
        items: (sj.items || []).map(item => ({
          product: item.product || '',
          qty: item.qty || 0,
          unit: item.unit || 'PCS',
          description: item.description || '',
        })),
        scheduledDate: sj.scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: sj.scheduledTime || '08:00',
        status: sj.status || 'Close',
        created: sj.created || new Date().toISOString(),
        notes: sj.notes || '',
        timestamp: sj.timestamp || Date.now(),
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_suratJalan')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} Trucking Surat Jalan`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import Trucking Surat Jalan:`, error.message);
    return 0;
  }
}

// Transform and import Trucking Delivery Orders
async function importTruckingDeliveryOrders() {
  console.log('\n=== Importing Trucking Delivery Orders ===');
  const filePath = path.join(__dirname, 'master/trucking/trucking_delivery_orders.json');
  const data = readJsonFile(filePath);

  if (!data || !data.value) {
    console.log('No trucking delivery orders data found (empty)');
    return 0;
  }

  try {
    const payload = {
      value: data.value.map((do_, idx) => ({
        id: do_.id,
        no: idx + 1,
        doNo: do_.doNo || '',
        orderDate: do_.orderDate || new Date().toISOString().split('T')[0],
        customerCode: do_.customerCode || '',
        customerName: do_.customerName || '',
        customerAddress: do_.customerAddress || '',
        status: do_.status || 'Close',
        scheduledDate: do_.scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: do_.scheduledTime || '08:00',
        vehicleId: do_.vehicleId || '',
        vehicleNo: do_.vehicleNo || '',
        driverId: do_.driverId || '',
        driverName: do_.driverName || '',
        routeId: do_.routeId || '',
        routeName: do_.routeName || '',
        items: (do_.items || []).map(item => ({
          product: item.product || '',
          qty: item.qty || 0,
          unit: item.unit || 'PCS',
          description: item.description || '',
        })),
        customerDirectDeal: do_.customerDirectDeal || 0,
        customerVendorDeal: do_.customerVendorDeal || 0,
        totalDeal: do_.totalDeal || 0,
        created: do_.created || new Date().toISOString(),
        notes: do_.notes || '',
        timestamp: do_.timestamp || Date.now(),
      }))
    };

    await callApi(`/api/storage/${encodeURIComponent('trucking_delivery_orders')}`, 'POST', payload);
    console.log(`✓ Imported ${payload.value.length} Trucking Delivery Orders`);
    return payload.value.length;
  } catch (error) {
    console.error(`✗ Failed to import Trucking Delivery Orders:`, error.message);
    return 0;
  }
}

// Main execution
async function main() {
  console.log('Starting GT and Trucking data import to PostgreSQL...');
  console.log(`API Base URL: ${API_URL}`);

  try {
    // GT imports
    const gtCustomers = await importGTCustomers();
    const gtProducts = await importGTProducts();
    const gtSuppliers = await importGTSuppliers();
    const gtUsers = await importGTUserAccess();
    const gtSalesOrders = await importGTSalesOrders();
    const gtDeliveryNotes = await importGTDeliveryNotes();
    const gtInvoices = await importGTInvoices();

    // Trucking imports
    const truckingCustomers = await importTruckingCustomers();
    const truckingVehicles = await importTruckingVehicles();
    const truckingDrivers = await importTruckingDrivers();
    const truckingRoutes = await importTruckingRoutes();
    const truckingUsers = await importTruckingUserAccess();
    const truckingInvoices = await importTruckingInvoices();
    const truckingSuratJalan = await importTruckingSuratJalan();
    const truckingDeliveryOrders = await importTruckingDeliveryOrders();

    // Summary
    console.log('\n\n=== IMPORT SUMMARY ===');
    console.log('General Trading:');
    console.log(`  - Customers: ${gtCustomers}`);
    console.log(`  - Products: ${gtProducts}`);
    console.log(`  - Suppliers: ${gtSuppliers}`);
    console.log(`  - Users: ${gtUsers}`);
    console.log(`  - Sales Orders: ${gtSalesOrders}`);
    console.log(`  - Delivery Notes: ${gtDeliveryNotes}`);
    console.log(`  - Invoices: ${gtInvoices}`);
    console.log('\nTracking:');
    console.log(`  - Customers: ${truckingCustomers}`);
    console.log(`  - Vehicles: ${truckingVehicles}`);
    console.log(`  - Drivers: ${truckingDrivers}`);
    console.log(`  - Routes: ${truckingRoutes}`);
    console.log(`  - Users: ${truckingUsers}`);
    console.log(`  - Invoices: ${truckingInvoices}`);
    console.log(`  - Surat Jalan: ${truckingSuratJalan}`);
    console.log(`  - Delivery Orders: ${truckingDeliveryOrders}`);
    console.log('\nTotal records imported:', gtCustomers + gtProducts + gtSuppliers + gtUsers + gtSalesOrders + gtDeliveryNotes + gtInvoices + truckingCustomers + truckingVehicles + truckingDrivers + truckingRoutes + truckingUsers + truckingInvoices + truckingSuratJalan + truckingDeliveryOrders);
  } catch (error) {
    console.error('Fatal error during import:', error.message);
    process.exit(1);
  }
}

main();
