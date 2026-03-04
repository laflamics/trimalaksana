const fs = require('fs');
const path = require('path');

// Simple CSV parser tanpa dependency
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }
  
  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Read CSV file
const csvPath = path.join(__dirname, 'master/trucking/truckingmaster_cleaned.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV
const records = parseCSV(csvContent);

console.log(`Parsed ${records.length} records from trucking CSV`);

// Group by invoice number to create invoices
const invoiceMap = {};
const deliveryNoteMap = {};
const doMap = {};

records.forEach((row, idx) => {
  const invoiceNo = row['No Inv'] || '';
  const tanggal = row['Tanggal'] || '';
  const customer = row['Nama Cust'] || '';
  const kode = row['Kode Item'] || '';
  const nama = row['Nama Item'] || '';
  const jml = parseInt(row['Jml']) || 0;
  const satuan = row['Satuan'] || 'PCS';
  const harga = parseFloat(row['Harga']) || 0;
  const pot = parseFloat(row['Pot.']) || 0;
  const total = parseFloat(row['Total']) || 0;
  const ppn = parseFloat(row['PPN']) || 0;
  const totalAkhir = parseFloat(row['Total Akhir']) || 0;
  const noFP = row['No FP'] || '';
  const ket = row['Ket'] || '';

  // Convert date from MM/DD/YY to YYYY-MM-DD
  const dateMatch = tanggal.match(/(\d{2})\/(\d{2})\/(\d{2})/);
  let isoDate = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    const month = dateMatch[1];
    const day = dateMatch[2];
    const year = '20' + dateMatch[3];
    isoDate = `${year}-${month}-${day}`;
  }

  // Extract delivery/shipment numbers from Ket field
  // Format: "1.04/01/2026 CDD B 9834 HP" atau "02/01/2026 SPO NO 8306061276"
  // Extract nomor setelah CDD/SPO/RITEL
  const shipmentMatches = ket.match(/(?:CDD|SPO|RITEL)\s+(?:NO\s+)?([A-Z0-9\s]+?)(?=\s+(?:CDD|SPO|RITEL|$))/gi);
  const shipmentNumbers = shipmentMatches ? shipmentMatches.map(m => {
    return m.replace(/(?:CDD|SPO|RITEL)\s+(?:NO\s+)?/i, '').trim();
  }).filter(n => n.length > 0) : [];

  // If no shipment numbers found, use invoice number as fallback
  const doNumbers = shipmentNumbers.length > 0 ? shipmentNumbers : [invoiceNo];

  // Create or update invoice
  if (invoiceNo) {
    if (!invoiceMap[invoiceNo]) {
      invoiceMap[invoiceNo] = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNo: invoiceNo,
        customer: customer,
        noFP: noFP,
        status: 'OPEN',
        created: isoDate,
        topDate: new Date(new Date(isoDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        discount: 0,
        tax: 0,
        taxPercent: 11,
        notes: ket,
        timestamp: Date.now(),
      };
    }

    // Add item to invoice
    invoiceMap[invoiceNo].items.push({
      itemSku: kode,
      qty: jml,
      unit: satuan,
      price: harga,
      discount: pot,
      total: total,
      tax: ppn,
      totalAkhir: totalAkhir,
      product: nama,
    });
    
    // Add to total tax
    invoiceMap[invoiceNo].tax += ppn;
  }

  // Create delivery notes from DO numbers
  doNumbers.forEach(doNo => {
    const dnKey = `${doNo}_${customer}`;
    if (!deliveryNoteMap[dnKey]) {
      deliveryNoteMap[dnKey] = {
        id: `dn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        no: Object.keys(deliveryNoteMap).length + 1,
        dnNo: doNo,
        doNo: doNo,
        customerName: customer,
        customerAddress: '',
        driverId: '',
        driverName: '',
        driverCode: '',
        vehicleId: '',
        vehicleNo: '',
        routeId: '',
        routeName: '',
        items: [],
        scheduledDate: isoDate,
        scheduledTime: '08:00',
        status: 'Close',
        created: isoDate,
        notes: ket,
        timestamp: Date.now(),
      };
    }

    // Add item to delivery note
    deliveryNoteMap[dnKey].items.push({
      product: nama,
      qty: jml,
      unit: satuan,
      description: `${kode} - ${nama}`,
    });
  });

  // Create DO records
  doNumbers.forEach(doNo => {
    if (!doMap[doNo]) {
      doMap[doNo] = {
        id: `do_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        no: Object.keys(doMap).length + 1,
        doNo: doNo,
        orderDate: isoDate,
        customerCode: '',
        customerName: customer,
        customerAddress: '',
        status: 'Close',
        scheduledDate: isoDate,
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
        created: isoDate,
        notes: ket,
        timestamp: Date.now(),
      };
    }

    // Add item to DO
    doMap[doNo].items.push({
      product: nama,
      qty: jml,
      unit: satuan,
      description: `${kode} - ${nama}`,
    });
  });
});

// Convert maps to arrays
const invoices = Object.values(invoiceMap);
const deliveryNotes = Object.values(deliveryNoteMap);
const dos = Object.values(doMap);

console.log(`Generated ${invoices.length} invoices`);
console.log(`Generated ${deliveryNotes.length} delivery notes`);
console.log(`Generated ${dos.length} delivery orders`);

// Write JSON files
const outputDir = path.join(__dirname, 'master/trucking');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'trucking_invoices.json'),
  JSON.stringify({ value: invoices }, null, 2),
  'utf8'
);
console.log('✓ Written trucking_invoices.json');

fs.writeFileSync(
  path.join(outputDir, 'trucking_suratJalan.json'),
  JSON.stringify({ value: deliveryNotes }, null, 2),
  'utf8'
);
console.log('✓ Written trucking_suratJalan.json');

fs.writeFileSync(
  path.join(outputDir, 'trucking_delivery_orders.json'),
  JSON.stringify({ value: dos }, null, 2),
  'utf8'
);
console.log('✓ Written trucking_delivery_orders.json');

console.log('\n✅ Trucking data parsing complete!');
