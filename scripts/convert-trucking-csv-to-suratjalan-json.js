/**
 * Convert Trucking CSV (truckingmaster_cleaned.csv & truckingfeb_cleaned.csv)
 * ke Surat Jalan JSON sesuai kerangka yang diexpektasi
 * 
 * CSV Columns:
 * Nama Cust, Tanggal, No PO, No Inv, No., Kode Item, Nama Item, Jml, Satuan, Harga, Pot., Total, PPN, Total Akhir, No FP, Ket
 * 
 * Expected Surat Jalan JSON:
 * {
 *   id, dnNo, doNo, customerName, customerAddress, driverId, driverName, driverCode,
 *   vehicleId, vehicleNo, routeId, routeName, items[], scheduledDate, scheduledTime,
 *   status, notes, created
 * }
 */

const fs = require('fs');
const path = require('path');

// Simple CSV parser tanpa dependency
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }
  
  return records;
}

// Read both CSV files
const file1 = path.join(__dirname, 'master/trucking/truckingmaster_cleaned.csv');
const file2 = path.join(__dirname, 'master/trucking/truckingfeb_cleaned.csv');
const outputFile = path.join(__dirname, 'master/trucking/trucking_suratjalan_from_csv.json');

console.log('📖 Reading CSV files...');

let allRecords = [];

// Read file 1
try {
  const data1 = fs.readFileSync(file1, 'utf8');
  const records1 = parseCSV(data1);
  console.log(`✅ File 1: ${records1.length} records`);
  allRecords = allRecords.concat(records1);
} catch (error) {
  console.error(`❌ Error reading file 1: ${error.message}`);
}

// Read file 2
try {
  const data2 = fs.readFileSync(file2, 'utf8');
  const records2 = parseCSV(data2);
  console.log(`✅ File 2: ${records2.length} records`);
  allRecords = allRecords.concat(records2);
} catch (error) {
  console.error(`❌ Error reading file 2: ${error.message}`);
}

console.log(`✅ Total records: ${allRecords.length}`);

// Group by invoice number (No Inv) to create Surat Jalan
const groupedByInvoice = {};

allRecords.forEach((record) => {
  const invoiceNo = record['No Inv'] || 'UNKNOWN';
  if (!groupedByInvoice[invoiceNo]) {
    groupedByInvoice[invoiceNo] = [];
  }
  groupedByInvoice[invoiceNo].push(record);
});

console.log(`📊 Grouped into ${Object.keys(groupedByInvoice).length} invoices`);

// Convert to Surat Jalan format
const suratJalanList = Object.entries(groupedByInvoice).map(([invoiceNo, records], idx) => {
  const firstRecord = records[0];
  
  // Parse tanggal
  let tanggal = firstRecord['Tanggal'] || new Date().toISOString();
  // Handle Excel date format (number)
  if (!isNaN(tanggal)) {
    const excelDate = parseInt(tanggal);
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    tanggal = date.toISOString();
  } else if (tanggal.includes('/')) {
    // Handle DD/MM/YY format
    const parts = tanggal.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]) + 2000;
      const date = new Date(year, month, day);
      tanggal = date.toISOString();
    }
  }

  // Build items array
  const items = records.map((record) => ({
    product: record['Nama Item'] || 'JASA ANGKUTAN',
    qty: parseInt(record['Jml'] || 1),
    unit: record['Satuan'] || 'LOT',
    description: record['Ket'] || '',
  }));

  // Build Surat Jalan object
  const suratJalan = {
    id: `sj_${Date.now()}_${idx}`,
    no: idx + 1,
    dnNo: `DN-${invoiceNo}`,
    doNo: firstRecord['No PO'] || invoiceNo,
    customerName: firstRecord['Nama Cust'] || 'UNKNOWN',
    customerAddress: '', // Tidak ada di CSV
    driverId: '', // Tidak ada di CSV
    driverName: '', // Tidak ada di CSV
    driverCode: '', // Tidak ada di CSV
    vehicleId: '', // Tidak ada di CSV
    vehicleNo: '', // Tidak ada di CSV
    routeId: '', // Tidak ada di CSV
    routeName: '', // Tidak ada di CSV
    items: items,
    scheduledDate: tanggal,
    scheduledTime: '08:00', // Default time
    status: 'Open',
    notes: `Invoice: ${invoiceNo}`,
    created: new Date().toISOString(),
    timestamp: Date.now(),
  };

  return suratJalan;
});

// Write to file
fs.writeFileSync(outputFile, JSON.stringify(suratJalanList, null, 2), 'utf8');
console.log(`\n✅ Surat Jalan JSON saved to: ${outputFile}`);
console.log(`📊 Total Surat Jalan created: ${suratJalanList.length}`);

// Show sample
if (suratJalanList.length > 0) {
  console.log(`\n🔍 Sample Surat Jalan (first one):`);
  const sample = suratJalanList[0];
  console.log(`   dnNo: ${sample.dnNo}`);
  console.log(`   customerName: ${sample.customerName}`);
  console.log(`   items: ${sample.items.length}`);
  console.log(`   status: ${sample.status}`);
}
