#!/usr/bin/env node

/**
 * Convert Packaging CSV to JSON (salesOrders, invoices, deliveryNotes)
 * Usage: node scripts/convert-packaging-csv-to-json.js <input_csv> [output_dir]
 * Example: node scripts/convert-packaging-csv-to-json.js scripts/master/packaging/pkgfeb_cleaned.csv scripts/master/packaging/
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFile = process.argv[2];
const outputDir = process.argv[3] || path.dirname(inputFile);

if (!inputFile) {
  console.error('❌ Error: Input CSV file is required');
  console.error('Usage: node scripts/convert-packaging-csv-to-json.js <input_csv> [output_dir]');
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
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to convert Excel date to ISO string
const excelDateToISO = (excelDate) => {
  if (!excelDate || isNaN(excelDate)) return new Date().toISOString();
  // Excel date starts from 1900-01-01
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString();
};

// Helper to extract PO and DO from Ket field
const extractPoAndDo = (ket) => {
  if (!ket) return { po: '', dos: [] };
  
  const poMatch = ket.match(/PO:\s*([^\s]+)/);
  const po = poMatch ? poMatch[1] : '';
  
  // Extract all DO references (DLV-xxx)
  const doMatches = ket.match(/DLV-\d+/g) || [];
  const dos = [...new Set(doMatches)]; // Remove duplicates
  
  return { po, dos };
};

const salesOrders = {};
const invoices = {};
const deliveryNotes = {};

const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let lineCount = 0;
let headers = [];

rl.on('line', (line) => {
  lineCount++;
  
  // Parse headers
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
  
  // Map fields to headers
  const row = {};
  headers.forEach((header, idx) => {
    row[header] = fields[idx] || '';
  });
  
  // Extract data
  const namaCust = row['Nama Cust'];
  const tanggal = row['Tanggal'];
  const noPo = row['No PO'];
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
  
  const { po, dos } = extractPoAndDo(ket);
  
  // Create or update Sales Order
  if (!salesOrders[noPo]) {
    salesOrders[noPo] = {
      id: generateId('so'),
      soNo: noPo,
      customer: namaCust,
      customerKode: '', // Will need to map from master data
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: excelDateToISO(tanggal),
      items: []
    };
  }
  
  // Add item to Sales Order
  salesOrders[noPo].items.push({
    id: generateId('item'),
    productId: kodeItem,
    productKode: kodeItem,
    productName: namaItem,
    qty: jml,
    unit: satuan,
    price: harga,
    total: total,
    specNote: '',
    discountPercent: 0
  });
  
  // Create or update Invoice
  if (!invoices[noInv]) {
    invoices[noInv] = {
      id: generateId('inv'),
      invoiceNo: noInv,
      soNo: noPo,
      dlvNo: dos.length > 0 ? dos[0] : '',
      noFp: noFp,
      keterangan: ket,
      customer: namaCust,
      status: 'OPEN',
      created: excelDateToISO(tanggal),
      items: [],
      subtotal: 0,
      ppn: 0,
      total: 0,
      paymentStatus: 'OPEN',
      bom: {
        subtotal: 0,
        discount: 0,
        discountPercent: 0,
        tax: 0,
        taxPercent: 11,
        biayaLain: 0,
        total: 0
      }
    };
  }
  
  // Add item to Invoice
  invoices[noInv].items.push({
    productKode: kodeItem,
    productName: namaItem,
    qty: jml,
    unit: satuan,
    price: harga,
    total: total,
    ppn: ppn,
    totalAkhir: totalAkhir
  });
  
  // Update invoice totals
  invoices[noInv].subtotal += total;
  invoices[noInv].ppn += ppn;
  invoices[noInv].total += totalAkhir;
  invoices[noInv].bom.subtotal += total;
  invoices[noInv].bom.tax += ppn;
  invoices[noInv].bom.total += totalAkhir;
  
  // Create Delivery Notes for each DO
  dos.forEach((doNo) => {
    if (!deliveryNotes[doNo]) {
      deliveryNotes[doNo] = {
        id: generateId('dlv'),
        sjNo: doNo,
        soNo: noPo,
        customer: namaCust,
        customerAddress: '',
        customerPIC: '',
        customerPhone: '',
        status: 'CLOSE',
        items: [],
        deliveryDate: excelDateToISO(tanggal),
        driver: '',
        vehicleNo: '',
        specNote: ket
      };
    }
    
    // Add item to Delivery Note
    deliveryNotes[doNo].items.push({
      product: namaItem,
      productCode: kodeItem,
      qty: jml,
      unit: satuan,
      soNo: noPo
    });
  });
});

rl.on('close', () => {
  // Convert objects to arrays
  const soArray = Object.values(salesOrders);
  const invArray = Object.values(invoices);
  const dlvArray = Object.values(deliveryNotes);
  
  // Write JSON files
  const soFile = path.join(outputDir, 'salesOrders.json');
  const invFile = path.join(outputDir, 'invoices.json');
  const dlvFile = path.join(outputDir, 'deliveryNotes.json');
  
  fs.writeFileSync(soFile, JSON.stringify(soArray, null, 2));
  fs.writeFileSync(invFile, JSON.stringify(invArray, null, 2));
  fs.writeFileSync(dlvFile, JSON.stringify(dlvArray, null, 2));
  
  console.log(`\n✅ Done!`);
  console.log(`📊 Total lines processed: ${lineCount - 1}`);
  console.log(`📦 Sales Orders: ${soArray.length}`);
  console.log(`📄 Invoices: ${invArray.length}`);
  console.log(`🚚 Delivery Notes: ${dlvArray.length}`);
  console.log(`\n📁 Output files:`);
  console.log(`   - ${soFile}`);
  console.log(`   - ${invFile}`);
  console.log(`   - ${dlvFile}`);
});

rl.on('error', (err) => {
  console.error('❌ Read error:', err.message);
  process.exit(1);
});
