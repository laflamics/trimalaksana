const fs = require('fs');
const path = require('path');

// File paths
const csvFile = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/MERGED_SALES_PACKAGING.csv';
const outputDir = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/import-output';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

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

    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    // Format: 1/9/2026 9:42
    const parts = dateStr.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1] ? parts[1].split(':') : ['0', '0'];
    
    const month = parseInt(dateParts[0], 10);
    const day = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    
    const date = new Date(year, month - 1, day, hour, minute, 0);
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

function extractDLVFromKet(ket) {
  if (!ket) return null;
  const match = ket.match(/DLV-\d+/);
  return match ? match[0] : null;
}

function extractInvoiceNo(invNo) {
  return invNo && invNo.trim() ? invNo.trim() : null;
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  // Remove spaces, commas, and convert to number
  const cleaned = amountStr.toString().replace(/\s/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

try {
  console.log('Reading CSV file...');
  const content = fs.readFileSync(csvFile, 'utf-8');
  const records = parseCSV(content);
  console.log(`Total records: ${records.length}`);

  // Data structures
  const soMap = new Map(); // soNo -> SO data
  const dlvMap = new Map(); // sjNo -> DLV data
  const invMap = new Map(); // invNo -> Invoice data
  const customerMap = new Map(); // customerName -> customer data
  const productMap = new Map(); // productKode -> product data

  // Process each record
  records.forEach((record, idx) => {
    const soNo = record['SO NO'] || record['No PO'] || record['No.PO'] || '';
    const invNo = extractInvoiceNo(record['No Inv'] || record['No.Inv'] || '');
    const dlvNo = extractDLVFromKet(record['Ket'] || '');
    const customerName = record['Nama Cust'] || record['Nama.Cust'] || '';
    const productKode = record['Kode Item'] || record['Kode.Item'] || '';
    const productName = record['Nama Item'] || record['Nama.Item'] || '';
    const qty = parseAmount(record['Jml'] || record['Jml.'] || '0');
    const unit = record['Satuan'] || 'PCS';
    const price = parseAmount(record['Harga'] || record['Harga.'] || '0');
    const total = parseAmount(record['Total'] || record['Total.'] || '0');
    const ppn = parseAmount(record['PPN'] || record[' PPN '] || '0');
    const totalAkhir = parseAmount(record['Total Akhir'] || record[' Total Akhir '] || '0');
    const tanggal = record['Tanggal'] || '';

    if (!soNo || !customerName) {
      console.warn(`Row ${idx + 2}: Missing SO No or Customer Name, skipping`);
      return;
    }

    // Create/update customer
    if (!customerMap.has(customerName)) {
      customerMap.set(customerName, {
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kode: customerName.substring(0, 3).toUpperCase(),
        nama: customerName,
        alamat: '',
        telepon: '',
        hp: '',
        kontak: '',
        created: new Date().toISOString(),
      });
    }

    // Create/update product
    if (productKode && !productMap.has(productKode)) {
      productMap.set(productKode, {
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kode: productKode,
        nama: productName,
        satuan: unit,
        hargaFg: price,
        hargaSales: price,
        kategori: 'Packaging',
        stockAman: 0,
        created: new Date().toISOString(),
      });
    }

    // Create/update SO
    if (!soMap.has(soNo)) {
      soMap.set(soNo, {
        id: `so-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        soNo: soNo,
        customer: customerName,
        customerKode: customerMap.get(customerName)?.kode || '',
        paymentTerms: 'TOP',
        topDays: 30,
        status: 'OPEN',
        created: parseDate(tanggal),
        items: [],
        globalSpecNote: '',
        discountPercent: 0,
      });
    }

    // Add item to SO
    const soItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: productKode,
      productKode: productKode,
      productName: productName,
      qty: qty,
      unit: unit,
      price: price,
      total: total,
      specNote: '',
      discountPercent: 0,
    };
    soMap.get(soNo).items.push(soItem);

    // Create/update DLV if DLV No exists
    if (dlvNo) {
      if (!dlvMap.has(dlvNo)) {
        dlvMap.set(dlvNo, {
          id: `dlv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sjNo: dlvNo,
          soNo: soNo,
          customer: customerName,
          customerAddress: '',
          customerPIC: '',
          customerPhone: '',
          status: 'CLOSE', // DLV always CLOSE
          items: [],
          deliveryDate: parseDate(tanggal),
          driver: '',
          vehicleNo: '',
          specNote: '',
        });
      }

      // Add item to DLV
      const dlvItem = {
        product: productName,
        productCode: productKode,
        qty: qty,
        unit: unit,
        soNo: soNo,
      };
      dlvMap.get(dlvNo).items.push(dlvItem);
    }

    // Create/update Invoice if Invoice No exists
    if (invNo) {
      if (!invMap.has(invNo)) {
        invMap.set(invNo, {
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          invoiceNo: invNo,
          soNo: soNo,
          dlvNo: dlvNo || '', // DLV number dari Ket
          customer: customerName,
          status: 'OPEN',
          created: parseDate(tanggal),
          items: [],
          subtotal: 0,
          ppn: 0,
          total: 0,
          paymentStatus: 'OPEN',
        });
      } else {
        // Update dlvNo jika belum ada (ambil dari record pertama yang punya DLV)
        const inv = invMap.get(invNo);
        if (!inv.dlvNo && dlvNo) {
          inv.dlvNo = dlvNo;
        }
      }

      // Add item to Invoice
      const invItem = {
        productKode: productKode,
        productName: productName,
        qty: qty,
        unit: unit,
        price: price,
        total: total,
        ppn: ppn,
        totalAkhir: totalAkhir,
      };
      invMap.get(invNo).items.push(invItem);
      
      // Update invoice totals
      const inv = invMap.get(invNo);
      inv.subtotal += total;
      inv.ppn += ppn;
      inv.total += totalAkhir;
    }
  });

  // Convert maps to arrays
  const customers = Array.from(customerMap.values());
  const products = Array.from(productMap.values());
  const salesOrders = Array.from(soMap.values());
  const deliveryNotes = Array.from(dlvMap.values());
  const invoices = Array.from(invMap.values());

  console.log(`\n✓ Parsed data:`);
  console.log(`  - Customers: ${customers.length}`);
  console.log(`  - Products: ${products.length}`);
  console.log(`  - Sales Orders: ${salesOrders.length}`);
  console.log(`  - Delivery Notes: ${deliveryNotes.length}`);
  console.log(`  - Invoices: ${invoices.length}`);

  // Save to JSON files
  fs.writeFileSync(path.join(outputDir, 'customers.json'), JSON.stringify(customers, null, 2));
  fs.writeFileSync(path.join(outputDir, 'products.json'), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(outputDir, 'salesOrders.json'), JSON.stringify(salesOrders, null, 2));
  fs.writeFileSync(path.join(outputDir, 'deliveryNotes.json'), JSON.stringify(deliveryNotes, null, 2));
  fs.writeFileSync(path.join(outputDir, 'invoices.json'), JSON.stringify(invoices, null, 2));

  console.log(`\n✓ Output files saved to: ${outputDir}`);
  console.log(`  - customers.json`);
  console.log(`  - products.json`);
  console.log(`  - salesOrders.json`);
  console.log(`  - deliveryNotes.json`);
  console.log(`  - invoices.json`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`  Total SO items: ${salesOrders.reduce((sum, so) => sum + so.items.length, 0)}`);
  console.log(`  Total DLV items: ${deliveryNotes.reduce((sum, dlv) => sum + dlv.items.length, 0)}`);
  console.log(`  Total Invoice items: ${invoices.reduce((sum, inv) => sum + inv.items.length, 0)}`);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
