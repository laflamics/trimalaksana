#!/usr/bin/env node

/**
 * Parse GT Master CSV dan split jadi 3 JSON files:
 * - gt_salesOrders.json (status: OPEN, no PPIC notification)
 * - gt_delivery.json (status: CLOSE)
 * - gt_invoices.json (status: OPEN)
 * 
 * Spec:
 * - Payment Terms: TOP 30 hari (calculated from invoice date)
 * - itemSku = Kode Item
 * - unit = Satuan
 * - price = Harga
 * - discount = Pot.
 * - tax = PPN (bom)
 * - DO extracted from Ket field
 * 
 * Usage: node scripts/parse-gt-master-csv.js <input_csv>
 * Example: node scripts/parse-gt-master-csv.js scripts/master/gt/gtmaster_cleaned.csv
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('❌ Error: Input CSV file is required');
  console.error('Usage: node scripts/parse-gt-master-csv.js <input_csv>');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: File not found: ${inputFile}`);
  process.exit(1);
}

console.log(`📖 Reading: ${inputFile}`);

const salesOrders = new Map();
const deliveryNotes = new Map();
const invoices = new Map();

const parseCSVLine = (line) => {
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
  
  return fields;
};

// Helper to calculate TOP date (30 days from invoice date)
const calculateTopDate = (invoiceDate) => {
  try {
    const [month, day, year] = invoiceDate.split('/');
    const date = new Date(parseInt(year) + 2000, parseInt(month) - 1, parseInt(day));
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
};

const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let lineCount = 0;
let headerLine = null;
const headers = {};

rl.on('line', (line) => {
  lineCount++;
  
  if (lineCount === 1) {
    // Parse header
    headerLine = line;
    const headerFields = parseCSVLine(line);
    headerFields.forEach((field, idx) => {
      headers[field.trim()] = idx;
    });
    console.log('📋 Headers found:', Object.keys(headers).length);
    return;
  }
  
  // Parse data line
  const fields = parseCSVLine(line);
  
  const getNamaCustomer = () => fields[headers['Nama Cust']] || '';
  const getTanggal = () => fields[headers['Tanggal']] || '';
  const getSoNo = () => fields[headers['So No '] || headers['So No']] || '';
  const getNoInv = () => fields[headers['No Inv']] || '';
  const getNo = () => fields[headers['No.']] || '';
  const getKodeItem = () => fields[headers['Kode Item']] || '';
  const getNamaItem = () => fields[headers['Nama Item']] || '';
  const getJml = () => parseInt(fields[headers['Jml']] || '0');
  const getSatuan = () => fields[headers['Satuan']] || '';
  const getHarga = () => parseInt(fields[headers['Harga']] || '0');
  const getPot = () => parseInt(fields[headers['Pot.']] || '0');
  const getTotal = () => parseInt(fields[headers['Total']] || '0');
  const getPPN = () => parseInt(fields[headers['PPN']] || '0');
  const getTotalAkhir = () => parseInt(fields[headers['Total Akhir']] || '0');
  const getNoFP = () => fields[headers['No FP']] || '';
  const getKet = () => fields[headers['Ket']] || '';
  
  const soNo = getSoNo();
  const noInv = getNoInv();
  const tanggal = getTanggal();
  const ket = getKet();
  
  // Extract DO/Delivery Note from Ket
  const doMatch = ket.match(/DO\s*:\s*([^\s]+)/i);
  const doNo = doMatch ? doMatch[1] : '';
  
  if (!soNo || !noInv) return; // Skip invalid lines
  
  // Create line item for SO
  const soLineItem = {
    itemSku: getKodeItem(),
    product: getNamaItem(),
    qty: getJml(),
    unit: getSatuan(),
    price: getHarga(),
    discount: getPot(),
    total: getTotal(),
    tax: getPPN(),
    totalAkhir: getTotalAkhir(),
  };
  
  // Create line item for DN
  const dnLineItem = {
    product: getNamaItem(),
    productCode: getKodeItem(),
    qty: getJml(),
    unit: getSatuan(),
    soNo: soNo,
  };
  
  // Create line item for Invoice
  const invLineItem = {
    itemSku: getKodeItem(),
    product: getNamaItem(),
    qty: getJml(),
    unit: getSatuan(),
    price: getHarga(),
    discount: getPot(),
    total: getTotal(),
    tax: getPPN(),
    totalAkhir: getTotalAkhir(),
  };
  
  // ===== SALES ORDER =====
  if (!salesOrders.has(soNo)) {
    salesOrders.set(soNo, {
      id: `so_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      soNo: soNo,
      customer: getNamaCustomer(),
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: tanggal,
      items: [],
      ppicNotified: false,
      notes: ket,
      timestamp: Date.now(),
    });
  }
  
  const so = salesOrders.get(soNo);
  so.items.push(soLineItem);
  
  // ===== DELIVERY NOTE =====
  if (doNo) {
    if (!deliveryNotes.has(doNo)) {
      deliveryNotes.set(doNo, {
        id: `dn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sjNo: doNo,
        soNo: soNo,
        customer: getNamaCustomer(),
        status: 'CLOSE',
        items: [],
        deliveryDate: tanggal,
        notes: ket,
        timestamp: Date.now(),
      });
    }
    
    const dn = deliveryNotes.get(doNo);
    dn.items.push(dnLineItem);
  }
  
  // ===== INVOICE =====
  if (!invoices.has(noInv)) {
    invoices.set(noInv, {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNo: noInv,
      soNo: soNo,
      sjNo: doNo,
      customer: getNamaCustomer(),
      noFP: getNoFP(),
      status: 'OPEN',
      created: tanggal,
      topDate: calculateTopDate(tanggal),
      items: [],
      discount: 0,
      taxPercent: 11,
      notes: ket,
      timestamp: Date.now(),
    });
  }
  
  const inv = invoices.get(noInv);
  inv.items.push(invLineItem);
});

rl.on('close', () => {
  console.log(`\n✅ Parsed ${lineCount} lines`);
  
  // Convert Maps to arrays
  const soArray = Array.from(salesOrders.values());
  const dnArray = Array.from(deliveryNotes.values());
  const invArray = Array.from(invoices.values());
  
  console.log(`📊 Sales Orders: ${soArray.length}`);
  console.log(`📊 Delivery Notes: ${dnArray.length}`);
  console.log(`📊 Invoices: ${invArray.length}`);
  
  // Write JSON files
  const outputDir = path.dirname(inputFile);
  
  const soFile = path.join(outputDir, 'gt_salesOrders.json');
  fs.writeFileSync(soFile, JSON.stringify({ value: soArray }, null, 2));
  console.log(`✅ Written: ${soFile}`);
  
  const dnFile = path.join(outputDir, 'gt_delivery.json');
  fs.writeFileSync(dnFile, JSON.stringify({ value: dnArray }, null, 2));
  console.log(`✅ Written: ${dnFile}`);
  
  const invFile = path.join(outputDir, 'gt_invoices.json');
  fs.writeFileSync(invFile, JSON.stringify({ value: invArray }, null, 2));
  console.log(`✅ Written: ${invFile}`);
  
  console.log('\n✨ Done! Ready to import to server.');
});

rl.on('error', (err) => {
  console.error('❌ Read error:', err.message);
  process.exit(1);
});
