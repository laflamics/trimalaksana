const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '../data');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

// Helper function to generate ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Read CSV file
function readCSVFile(filePath) {
  try {
    // XLSX can read CSV files directly
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error.message);
    return [];
  }
}

// Save to storage (local or server) with trucking_ prefix
async function saveToStorage(key, data, replace = true) {
  const truckingKey = `trucking_${key}`;
  
  try {
    // Try to save to server first
    try {
      await axios.post(`${SERVER_URL}/api/storage/${truckingKey}`, { value: data }, {
        timeout: 5000,
      });
      console.log(`✓ Saved ${truckingKey} to server (${data.length} records)`);
      return;
    } catch (serverError) {
      // If server not available, fallback to local
      if (serverError.code === 'ECONNREFUSED' || serverError.code === 'ERR_NETWORK') {
        console.log(`Server not available, saving ${truckingKey} to local file...`);
      } else {
        throw serverError;
      }
    }
  } catch (error) {
    console.error(`Error saving ${truckingKey} to server:`, error.message);
  }
  
  // Fallback to local JSON file (data/localStorage/trucking)
  try {
    const localStorageDir = path.join(DATA_DIR, 'localStorage', 'trucking');
    await fs.mkdir(localStorageDir, { recursive: true });
    const localPath = path.join(localStorageDir, `${truckingKey}.json`);
    
    // Format sesuai dengan struktur yang digunakan aplikasi
    let formattedData = {
      value: data,
      timestamp: Date.now(),
      _timestamp: Date.now()
    };
    
    // Jika replace = false, merge dengan data yang sudah ada
    if (!replace) {
      try {
        const existingContent = await fs.readFile(localPath, 'utf8');
        const existingData = JSON.parse(existingContent);
        if (existingData.value && Array.isArray(existingData.value)) {
          // Merge: gabungkan data baru dengan yang sudah ada (hindari duplikat)
          const existingIds = new Set(existingData.value.map(item => {
            if (key === 'drivers') return item.driverCode?.toLowerCase();
            if (key === 'vehicles') return item.vehicleNo?.toLowerCase();
            if (key === 'customers') return item.kode?.toLowerCase() || item.nama?.toLowerCase();
            return item.id;
          }));
          
          const newData = data.filter(item => {
            let identifier;
            if (key === 'drivers') identifier = item.driverCode?.toLowerCase();
            else if (key === 'vehicles') identifier = item.vehicleNo?.toLowerCase();
            else if (key === 'customers') identifier = item.kode?.toLowerCase() || item.nama?.toLowerCase();
            else identifier = item.id;
            
            return !existingIds.has(identifier);
          });
          
          formattedData.value = [...existingData.value, ...newData];
          console.log(`  Merged: ${existingData.value.length} existing + ${newData.length} new = ${formattedData.value.length} total`);
        }
      } catch (readError) {
        // File tidak ada atau error membaca, gunakan data baru saja
        console.log(`  No existing data found, using new data only`);
      }
    }
    
    // Force write (overwrite existing file)
    await fs.writeFile(localPath, JSON.stringify(formattedData, null, 2), 'utf8');
    console.log(`✓ Saved ${truckingKey} to local file (${formattedData.value.length} records)`);
  } catch (localError) {
    console.error(`Error saving ${truckingKey} to local file:`, localError.message);
    throw localError;
  }
}

// Seed Vehicles from CSV
async function seedVehicles() {
  console.log('\nSeeding Vehicles from tracking_master_Master Vehicles.csv...');
  const filePath = path.join(DATA_DIR, 'tracking_master_Master Vehicles.csv');
  
  if (!await fileExists(filePath)) {
    console.log('tracking_master_Master Vehicles.csv not found, skipping...');
    return [];
  }

  const rows = readCSVFile(filePath);
  console.log(`Found ${rows.length} vehicles in CSV`);

  const vehicles = rows
    .filter(row => {
      const vehicleNo = (row['VEHICLE NO'] || row['VEHICLE NO'] || '').toString().trim();
      return vehicleNo; // Must have vehicle no
    })
    .map((row, index) => {
      const vehicleNo = (row['VEHICLE NO'] || row['VEHICLE NO'] || '').toString().trim();
      const licensePlate = (row['LICENSE PLATE'] || '').toString().trim();
      const vehicleType = (row['TYPE'] || 'Truck').toString().trim();
      const brand = (row['BRAND'] || '').toString().trim();
      const model = (row['MODEL'] || '').toString().trim();
      const year = parseInt(row['YEAR']) || new Date().getFullYear();
      const capacity = parseInt(row['CAPACITY']) || 0;
      const driver = (row['DRIVER'] || '').toString().trim();
      const status = (row['STATUS'] || 'ACTIVE').toString().trim().toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive';

      return {
        id: generateId(),
        no: index + 1,
        vehicleNo: vehicleNo,
        vehicleType: vehicleType,
        brand: brand,
        model: model,
        year: year,
        capacity: capacity,
        capacityUnit: 'KG',
        fuelType: 'Diesel',
        licensePlate: licensePlate || vehicleNo,
        stnkExpiry: '',
        kirExpiry: '',
        status: status,
        notes: driver ? `Driver: ${driver}` : '',
      };
    });

  console.log(`Processed ${vehicles.length} vehicles`);
  return vehicles;
}

// Seed Drivers from CSV
async function seedDrivers() {
  console.log('\nSeeding Drivers from tracking_master_Master Drivers.csv...');
  const filePath = path.join(DATA_DIR, 'tracking_master_Master Drivers.csv');
  
  if (!await fileExists(filePath)) {
    console.log('tracking_master_Master Drivers.csv not found, skipping...');
    return [];
  }

  const rows = readCSVFile(filePath);
  console.log(`Found ${rows.length} drivers in CSV`);

  const drivers = rows
    .filter(row => {
      const driverCode = (row['DRIVER CODE'] || '').toString().trim();
      const name = (row['NAME'] || '').toString().trim();
      return driverCode || name; // Must have driver code or name
    })
    .map((row, index) => {
      const driverCode = (row['DRIVER CODE'] || '').toString().trim();
      const name = (row['NAME'] || '').toString().trim();
      const licenseNo = (row['LICENSE NO'] || '').toString().trim();
      const licenseType = (row['LICENSE TYPE'] || 'B2').toString().trim();
      const phone = (row['PHONE'] || '').toString().trim();
      const vehicle = (row['VEHICLE'] || '').toString().trim();
      const status = (row['STATUS'] || 'ACTIVE').toString().trim().toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive';

      return {
        id: generateId(),
        no: index + 1,
        driverCode: driverCode || `DRV${String(index + 1).padStart(3, '0')}`,
        name: name,
        licenseNo: licenseNo,
        licenseType: licenseType,
        licenseExpiry: '',
        phone: phone,
        email: '',
        address: '',
        status: status,
        vehicleId: '',
        vehicleNo: vehicle,
        notes: '',
      };
    });

  console.log(`Processed ${drivers.length} drivers`);
  return drivers;
}

// Seed Customers from CSV
async function seedCustomers() {
  console.log('\nSeeding Customers from tracking_master_Master Customers.csv...');
  const filePath = path.join(DATA_DIR, 'tracking_master_Master Customers.csv');
  
  if (!await fileExists(filePath)) {
    console.log('tracking_master_Master Customers.csv not found, skipping...');
    return [];
  }

  const rows = readCSVFile(filePath);
  console.log(`Found ${rows.length} customers in CSV`);

  const customers = rows
    .filter(row => {
      const nama = (row['NAMA'] || '').toString().trim();
      return nama; // Must have nama
    })
    .map((row, index) => {
      const kode = (row['KODE'] || '').toString().trim();
      const nama = (row['NAMA'] || '').toString().trim();
      const kontak = (row['KONTAK'] || '').toString().trim();
      const email = (row['EMAIL'] || '').toString().trim();
      const telepon = (row['TELEPON'] || '').toString().trim();
      const alamat = (row['ALAMAT'] || '').toString().trim();
      const kategori = (row['KATEGORI'] || '').toString().trim();

      return {
        id: generateId(),
        no: index + 1,
        kode: kode || `CUST${String(index + 1).padStart(3, '0')}`,
        nama: nama,
        kontak: kontak,
        email: email,
        telepon: telepon,
        alamat: alamat,
        kategori: kategori,
        npwp: '',
        notes: '',
      };
    });

  console.log(`Processed ${customers.length} customers`);
  return customers;
}

// Main seed function
async function seedTrucking() {
  console.log('Starting Trucking seed process...\n');

  try {
    // Seed all trucking master data
    const vehicles = await seedVehicles();
    const drivers = await seedDrivers();
    const customers = await seedCustomers();
    
    // Save to storage (replace existing data)
    if (vehicles.length > 0) {
      await saveToStorage('vehicles', vehicles, true);
    }
    if (drivers.length > 0) {
      await saveToStorage('drivers', drivers, true);
    }
    if (customers.length > 0) {
      await saveToStorage('customers', customers, true);
    }
    
    console.log('\n✓ Trucking seed completed!');
    console.log(`  - Vehicles: ${vehicles.length}`);
    console.log(`  - Drivers: ${drivers.length}`);
    console.log(`  - Customers: ${customers.length}`);
    
  } catch (error) {
    console.error('Error during seed process:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTrucking().then(() => {
    console.log('\nDone!');
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { seedTrucking };

