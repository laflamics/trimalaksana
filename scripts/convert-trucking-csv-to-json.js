#!/usr/bin/env node

/**
 * Convert Trucking CSV to JSON (invoices, deliveryNotes)
 * Usage: node scripts/convert-trucking-csv-to-json.js <input_csv> [output_dir]
 * Example: node scripts/convert-trucking-csv-to-json.js scripts/master/trucking/truckingfeb_cleaned.csv scripts/master/packaging/
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFile = process.argv[2];
const outputDir = process.argv[3] || path.dirname(inputFile);

if (!inputFile) {
  console.error('❌ Error: Input CSV file is required');
  console.error('Usage: node scripts/convert-trucking-csv-to-json.js <input_csv> [output_dir]');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: File not found: ${inputFile}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`📖 Reading: ${inputFile}`);
console.log(`💾 Output dir: ${outputDir}`);

// Helper to generate unique ID
const generateId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to convert Excel date to ISO string
const excelDateToISO = (excelDate) => {
  if (!excelDate || isNaN(excelDate)) return new Date().toISOString().split('T')[0];
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
};

// Helper to extract SPO numbers from Ket field
const extractSpoNumbers = (ket) => {
  if (!ket) return [];
  const spoMatches = ket.match(/SPO NO \d+/g) || [];
  return [...new Set(spoMatches)];
};

const invoices = {};
const deliveryNotes = {};
const deliveryOrders = {};

const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let lineCount = 0;
let headers = [];
let invoiceCounter = 0;
let doCounter = 0;

rl.on('line', (line) => {
  lineCount++;
  
  if (lineCount === 1) {
    headers = line.split(',').map(h => h.trim());
    return;
  }
  
  // Parse CSV line
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  fields.push(current.trim());
  
  const row = {};
  headers.forEach((header, idx) => {
    row[header] = fields[idx] || '';
  });
  
  const namaCust = row['Nama Cust'];
  const tanggal = row['Tanggal'];
  const noInv = row['No Inv'];
  const kodeItem = row['Kode Item'];
  const namaItem = row['Nama Item'];
  const jml = parseInt(row['Jml']) || 0;
  const satuan = row['Satuan'];
  const harga = parseInt(row['Harga']) || 0;
  const total = parseInt(row['Total']) || 0;
  const ppn = parseInt(row['PPN']) || 0;
  const totalAkhir = parseInt(row['Total Akhir']) || 0;
  const noFp = row['No FP'];
  const ket = row['Ket'];
  
  const spoNumbers = extractSpoNumbers(ket);
  const createdDate = excelDateToISO(tanggal);
  
  // Create or update Invoice
  if (!invoices[noInv]) {
    invoiceCounter++;
    invoices[noInv] = {
      id: generateId('inv'),
      invoiceNo: noInv,
      soNo: '',
      sjNo: '',
      customer: namaCust,
      noFP: noFp,
      status: 'OPEN',
      created: createdDate,
      topDate: createdDate,
      items: [],
      discount: 0,
      taxPercent: 11,
      notes: ket,
      timestamp: Date.now()
    };
  }
  
  invoices[noInv].items.push({
    productCode: kodeItem,
    qty: jml,
    unit: satuan,
    price: harga,
    discount: 0,
    total: total,
    tax: ppn,
    totalAkhir: totalAkhir,
    productName: namaItem
  });
  
  // Create Delivery Notes for each SPO
  spoNumbers.forEach((spoNo) => {
    if (!deliveryNotes[spoNo]) {
      deliveryNotes[spoNo] = {
        id: generateId('dlv'),
        sjNo: spoNo,
        soNo: '',
        customer: namaCust,
        customerAddress: '',
        customerPIC: '',
        customerPhone: '',
        status: 'CLOSE',
        items: [],
        deliveryDate: createdDate,
        driver: '',
        vehicleNo: '',
        specNote: ket
      };
    }
    
    deliveryNotes[spoNo].items.push({
      product: namaItem,
      productCode: kodeItem,
      qty: jml,
      unit: satuan,
      soNo: ''
    });
  });
  
  // Create Delivery Order (one per invoice)
  if (!deliveryOrders[noInv]) {
    doCounter++;
    deliveryOrders[noInv] = {
      id: generateId('do'),
      no: doCounter,
      doNo: noInv,
      orderDate: createdDate,
      customerCode: '',
      customerName: namaCust,
      customerAddress: '',
      status: 'Close',
      scheduledDate: createdDate,
      scheduledTime: '08:00',
      items: [],
      vehicleId: '',
      vehicleNo: '',
      driverId: '',
      driverName: '',
      routeId: '',
      routeName: '',
      customerDirectDeal: 0,
      customerVendorDeal: 0,
      totalDeal: 0,
      created: createdDate,
      notes: ket,
      timestamp: Date.now()
    };
  }
  
  deliveryOrders[noInv].items.push({
    product: namaItem,
    qty: jml,
    unit: satuan,
    description: `${kodeItem} - ${namaItem}`
  });
});

rl.on('close', () => {
  const invArray = Object.values(invoices);
  const dlvArray = Object.values(deliveryNotes);
  const doArray = Object.values(deliveryOrders);
  
  // Write JSON files
  const invFile = path.join(outputDir, 'trucking_invoices.json');
  const dlvFile = path.join(outputDir, 'trucking_deliveryNotes.json');
  const doFile = path.join(outputDir, 'trucking_deliveryOrders.json');
  
  fs.writeFileSync(invFile, JSON.stringify(invArray, null, 2));
  fs.writeFileSync(dlvFile, JSON.stringify(dlvArray, null, 2));
  fs.writeFileSync(doFile, JSON.stringify(doArray, null, 2));
  
  console.log(`\n✅ Done!`);
  console.log(`📊 Total lines processed: ${lineCount - 1}`);
  console.log(`📄 Invoices: ${invArray.length}`);
  console.log(`🚚 Delivery Notes: ${dlvArray.length}`);
  console.log(`📦 Delivery Orders: ${doArray.length}`);
  console.log(`\n📁 Output files:`);
  console.log(`   - ${invFile}`);
  console.log(`   - ${dlvFile}`);
  console.log(`   - ${doFile}`);
});

rl.on('error', (err) => {
  console.error('❌ Read error:', err.message);
  process.exit(1);
});
