const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path folder CSV
const csvDir = path.join(__dirname, '../data/trucking');
const outputFile = path.join(__dirname, '../data/trucking-routes-import.json');

// Helper function untuk parse harga dari format " Rp586,500.00 "
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  // Remove "Rp", spaces, commas, and quotes
  const cleaned = priceStr.toString()
    .replace(/Rp/gi, '')
    .replace(/,/g, '')
    .replace(/"/g, '')
    .replace(/\s/g, '')
    .trim();
  return parseFloat(cleaned) || 0;
}

// Helper function untuk generate route code
function generateRouteCode(customer, origin, destination, truckType = '') {
  const customerCode = customer.replace(/[^A-Z0-9]/gi, '').substring(0, 6).toUpperCase();
  const originCode = origin.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const destCode = destination.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
  const truckCode = truckType ? truckType.replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase() : '';
  return `${customerCode}_${originCode}_${destCode}${truckCode ? '_' + truckCode : ''}`;
}

// Parse WILMAR format (CIKARANG & SERANG-1)
function parseWilmarFormat(csvPath, customerName) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const routes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV dengan handle quoted values
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length < 6) continue;
    
    const originDesc = values[0] || '';
    const originCity = values[1] || '';
    const destDesc = values[2] || '';
    const destCity = values[3] || '';
    const truckType = values[4] || '';
    const price = parsePrice(values[5] || '');
    
    if (!originDesc || !destDesc || !truckType || price === 0) continue;
    
    const origin = `${originDesc}, ${originCity}`.trim().replace(/,$/, '');
    const destination = `${destDesc}, ${destCity}`.trim().replace(/,$/, '');
    
    routes.push({
      customer: customerName,
      origin: origin,
      destination: destination,
      truckType: truckType.trim(),
      price: price,
      routeCode: generateRouteCode(customerName, origin, destination, truckType),
      routeName: `${origin} → ${destination} (${truckType})`,
    });
  }
  
  return routes;
}

// Parse KAWATA format (multiple truck types per route)
function parseKawataFormat(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const routes = [];
  let currentOrigin = '';
  
  for (let i = 2; i < lines.length; i++) { // Skip header rows
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    if (values.length < 6) continue;
    
    const no = values[0];
    const origin = values[1] || currentOrigin;
    const destination = values[2] || '';
    
    if (origin) currentOrigin = origin;
    if (!destination) continue;
    
    const truckTypes = [
      { name: 'CARRY (1.5 Ton)', price: parsePrice(values[3] || '') },
      { name: 'CDD/COLT DIESEL (4 Ton)', price: parsePrice(values[4] || '') },
      { name: 'FUSSO (8 Ton)', price: parsePrice(values[5] || '') },
      { name: 'WINGBOXN (18 Ton)', price: parsePrice(values[6] || '') },
    ];
    
    truckTypes.forEach(truck => {
      if (truck.price > 0) {
        routes.push({
          customer: 'KAWATA',
          origin: currentOrigin || 'Cikarang',
          destination: destination,
          truckType: truck.name,
          price: truck.price,
          routeCode: generateRouteCode('KAWATA', currentOrigin || 'Cikarang', destination, truck.name),
          routeName: `${currentOrigin || 'Cikarang'} → ${destination} (${truck.name})`,
        });
      }
    });
  }
  
  return routes;
}

// Parse KBI format
function parseKBIFormat(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const routes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse dengan handle quoted values dan empty columns
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // KBI format: No, ORIGIN, Tujuan, (empty), Harga, (empty), ServiceType
    if (values.length < 5) continue;
    
    const no = values[0];
    const origin = values[1] || '';
    const destination = values[2] || '';
    const price = parsePrice(values[4] || ''); // Index 4 karena ada empty column di index 3
    const serviceType = values[6] || ''; // CDD, RITEL, etc.
    
    if (!origin || !destination || price === 0) continue;
    
    const truckType = serviceType || 'Standard';
    const routeName = destination.includes('one day service') 
      ? `${origin} → ${destination} (One Day Service)`
      : `${origin} → ${destination}`;
    
    routes.push({
      customer: 'KBI',
      origin: origin,
      destination: destination,
      truckType: truckType,
      price: price,
      routeCode: generateRouteCode('KBI', origin, destination, truckType),
      routeName: routeName,
    });
  }
  
  return routes;
}

// Parse YMPI format
function parseYMPIFormat(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const routes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    if (values.length < 5) continue;
    
    const no = values[0];
    const origin = values[1] || '';
    const destination = values[2] || '';
    const berat = values[3] || '';
    const price = parsePrice(values[4] || '');
    
    if (!origin || !destination || price === 0) continue;
    
    routes.push({
      customer: 'YMPI',
      origin: origin,
      destination: destination,
      truckType: berat ? `${berat} kg` : 'Standard',
      price: price,
      routeCode: generateRouteCode('YMPI', origin, destination),
      routeName: `${origin} → ${destination}${berat ? ` (${berat} kg)` : ''}`,
    });
  }
  
  return routes;
}

// Parse UNIFOODS format
function parseUnifoodsFormat(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const routes = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    if (values.length < 4) continue;
    
    const no = values[0];
    const origin = values[1] || '';
    const destination = values[2] || '';
    const price = parsePrice(values[3] || '');
    
    if (!origin || !destination || price === 0) continue;
    
    routes.push({
      customer: 'UNIFOODS',
      origin: origin,
      destination: destination,
      truckType: 'Standard',
      price: price,
      routeCode: generateRouteCode('UNIFOODS', origin, destination),
      routeName: `${origin} → ${destination}`,
    });
  }
  
  return routes;
}

// Main import function
function importAllRoutes() {
  const allRoutes = [];
  
  console.log('📖 Reading CSV files from:', csvDir);
  
  // WILMAR CIKARANG
  const wilmarCikarangPath = path.join(csvDir, 'WILMAR_CIKARANG.csv');
  if (fs.existsSync(wilmarCikarangPath)) {
    console.log('✅ Processing WILMAR_CIKARANG.csv...');
    const routes = parseWilmarFormat(wilmarCikarangPath, 'WILMAR CIKARANG');
    allRoutes.push(...routes);
    console.log(`   → Found ${routes.length} routes`);
  }
  
  // WILMAR SERANG-1
  const wilmarSerangPath = path.join(csvDir, 'WILMAR_SERANG-1.csv');
  if (fs.existsSync(wilmarSerangPath)) {
    console.log('✅ Processing WILMAR_SERANG-1.csv...');
    const routes = parseWilmarFormat(wilmarSerangPath, 'WILMAR SERANG');
    allRoutes.push(...routes);
    console.log(`   → Found ${routes.length} routes`);
  }
  
  // KAWATA
  const kawataPath = path.join(csvDir, 'KAWATA.csv');
  if (fs.existsSync(kawataPath)) {
    console.log('✅ Processing KAWATA.csv...');
    const routes = parseKawataFormat(kawataPath);
    allRoutes.push(...routes);
    console.log(`   → Found ${routes.length} routes`);
  }
  
  // KBI
  const kbiPath = path.join(csvDir, 'KBI.csv');
  if (fs.existsSync(kbiPath)) {
    console.log('✅ Processing KBI.csv...');
    const routes = parseKBIFormat(kbiPath);
    allRoutes.push(...routes);
    console.log(`   → Found ${routes.length} routes`);
  }
  
  // YMPI
  const ympiPath = path.join(csvDir, 'YMPI.csv');
  if (fs.existsSync(ympiPath)) {
    console.log('✅ Processing YMPI.csv...');
    const routes = parseYMPIFormat(ympiPath);
    allRoutes.push(...routes);
    console.log(`   → Found ${routes.length} routes`);
  }
  
  // UNIFOODS
  const unifoodsPath = path.join(csvDir, 'UNIFOODS.csv');
  if (fs.existsSync(unifoodsPath)) {
    console.log('✅ Processing UNIFOODS.csv...');
    const routes = parseUnifoodsFormat(unifoodsPath);
    allRoutes.push(...routes);
    console.log(`   → Found ${routes.length} routes`);
  }
  
  // Convert ke format Route yang sesuai dengan aplikasi
  const formattedRoutes = allRoutes.map((route, index) => ({
    id: `route_${Date.now()}_${index}`,
    no: index + 1,
    routeCode: route.routeCode,
    routeName: route.routeName,
    origin: route.origin,
    destination: route.destination,
    distance: 0, // Tidak ada di CSV
    distanceUnit: 'KM',
    estimatedTime: 0, // Tidak ada di CSV
    estimatedTimeUnit: 'Hours',
    tollCost: 0, // Tidak ada di CSV
    fuelCost: 0, // Tidak ada di CSV
    status: 'Active',
    notes: `Customer: ${route.customer}\nTruck Type: ${route.truckType}\nPrice: Rp ${route.price.toLocaleString('id-ID')}`,
    // Extended fields untuk pricing
    customer: route.customer,
    truckType: route.truckType,
    price: route.price,
  }));
  
  // Save to JSON
  fs.writeFileSync(outputFile, JSON.stringify(formattedRoutes, null, 2), 'utf8');
  
  console.log(`\n🎉 Done! Imported ${formattedRoutes.length} routes`);
  console.log(`📄 Output saved to: ${outputFile}`);
  console.log(`\n📊 Summary by Customer:`);
  
  const summary = {};
  formattedRoutes.forEach(route => {
    const customer = route.customer || 'Unknown';
    summary[customer] = (summary[customer] || 0) + 1;
  });
  
  Object.entries(summary).forEach(([customer, count]) => {
    console.log(`   - ${customer}: ${count} routes`);
  });
  
  return formattedRoutes;
}

// Run import
try {
  importAllRoutes();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

