const fs = require('fs');
const path = require('path');

// File paths
const csvFile = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/MERGED_SALES_PACKAGING.csv';
const customerMasterFile = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/Customers_2026-02-07.csv';
const productMasterFile = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/Products_2026-02-07.csv';
const outputDir = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/import-output';

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
  // Extract DO (Delivery Order) number from Ket column
  // Format: "DO : 12361-020226" or "DO NO. : 12358-020226"
  const match = ket.match(/DO\s*(?:NO\.)?\s*:\s*(\S+)/i);
  return match ? match[1].trim() : null;
}

function extractInvoiceNo(invNo) {
  return invNo && invNo.trim() ? invNo.trim() : null;
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const cleaned = amountStr.toString().replace(/\s/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

function normalizeCustomerName(name) {
  if (!name) return '';
  return name.trim().toUpperCase();
}

try {
  console.log('Reading customer master file...');
  const customerMasterContent = fs.readFileSync(customerMasterFile, 'utf-8');
  const customerMasterRecords = parseCSV(customerMasterContent);
  
  const customerLookup = new Map();
  customerMasterRecords.forEach(record => {
    const nama = record['Nama'] || '';
    const kode = record['Kode'] || '';
    if (nama) {
      const normalized = normalizeCustomerName(nama);
      customerLookup.set(normalized, {
        id: `cust-${kode}`,
        kode: kode,
        nama: nama,
        kontak: record['Kontak'] || '',
        telepon: record['Telepon'] || '',
        alamat: record['Alamat'] || '',
        email: record['Email'] || '',
      });
    }
  });
  console.log(`✓ Loaded ${customerLookup.size} customers from master`);

  console.log('Reading product master file...');
  const productMasterContent = fs.readFileSync(productMasterFile, 'utf-8');
  const productMasterRecords = parseCSV(productMasterContent);
  
  const productLookup = new Map();
  productMasterRecords.forEach(record => {
    const kode = record['KODE (SKU/ID)'] || '';
    const nama = record['Nama'] || '';
    if (kode) {
      productLookup.set(kode.trim(), {
        id: `prod-${kode}`,
        kode: kode.trim(),
        nama: nama,
        satuan: record['Satuan'] || 'PCS',
        hargaFg: parseAmount(record['Harga FG'] || '0'),
        hargaSales: parseAmount(record['Price Satuan'] || '0'),
        kategori: record['Kategori'] || 'Product',
        customer: record['Customer'] || '',
        stockAman: parseAmount(record['Stock Aman'] || '0'),
        stockMinimum: parseAmount(record['Stock Minimum'] || '0'),
      });
    }
  });
  console.log(`✓ Loaded ${productLookup.size} products from master`);

  console.log('\nReading CSV file...');
  const content = fs.readFileSync(csvFile, 'utf-8');
  const records = parseCSV(content);
  console.log(`✓ Total records: ${records.length}`);

  const soMap = new Map();
  const dlvMap = new Map();
  const invMap = new Map();
  const customerMap = new Map();
  const productMap = new Map();

  let matchedProducts = 0;
  let newProducts = 0;

  records.forEach((record, idx) => {
    const soNo = record['SO NO'] || '';
    const invNo = extractInvoiceNo(record['No Inv'] || '');
    const dlvNo = extractDLVFromKet(record['Ket'] || '');
    const noFp = record['No FP'] || '';
    const customerName = record['Nama Cust'] || '';
    const productKode = record['Kode Item'] || '';
    const productName = record['Nama Item'] || '';
    const qty = parseAmount(record['Jml'] || '0');
    const unit = record['Satuan'] || 'PCS';
    const price = parseAmount(record['Harga'] || '0');
    const total = parseAmount(record['Total'] || '0');
    const ppn = parseAmount(record['PPN'] || '0');
    const totalAkhir = parseAmount(record['Total Akhir'] || '0');
    const tanggal = record['Tanggal'] || '';

    if (!soNo || !customerName) return;

    // Match or create customer
    const normalizedName = normalizeCustomerName(customerName);
    let customerData = customerLookup.get(normalizedName);
    
    if (!customerData) {
      if (!customerMap.has(customerName)) {
        customerData = {
          id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          kode: customerName.substring(0, 3).toUpperCase(),
          nama: customerName,
          kontak: '',
          telepon: '',
          alamat: '',
          email: '',
        };
        customerMap.set(customerName, customerData);
      } else {
        customerData = customerMap.get(customerName);
      }
    } else {
      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, customerData);
      }
    }

    // Match or create product
    let productData = productLookup.get(productKode);
    
    if (!productData) {
      if (!productMap.has(productKode)) {
        productData = {
          id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          kode: productKode,
          nama: productName,
          satuan: unit,
          hargaFg: price,
          hargaSales: price,
          kategori: 'Packaging',
          stockAman: 0,
          created: new Date().toISOString(),
        };
        productMap.set(productKode, productData);
        newProducts++;
      } else {
        productData = productMap.get(productKode);
      }
    } else {
      matchedProducts++;
      if (!productMap.has(productKode)) {
        productMap.set(productKode, productData);
      }
    }

    // Create/update SO
    if (!soMap.has(soNo)) {
      // Check if this is January data (month === 1)
      const date = parseDate(tanggal);
      const isJanuary = new Date(date).getMonth() === 0; // 0 = January
      
      soMap.set(soNo, {
        id: `so-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        soNo: soNo,
        customer: customerData.nama,
        customerKode: customerData.kode,
        paymentTerms: 'TOP',
        topDays: 30,
        status: 'OPEN',
        created: parseDate(tanggal),
        items: [],
        globalSpecNote: '',
        discountPercent: 0,
        // Add these fields only for January data
        ...(isJanuary && {
          confirmed: false,
          confirmedAt: parseDate(tanggal),
          confirmedBy: 'system-import',
          ppicNotified: false,
          ppicNotifiedAt: null,
          ppicNotifiedBy: null,
        }),
      });
    }

    const soItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: productData.kode,
      productKode: productData.kode,
      productName: productData.nama,
      qty: qty,
      unit: unit,
      price: price,
      total: total,
      specNote: '',
      discountPercent: 0,
    };
    soMap.get(soNo).items.push(soItem);

    // Create/update DLV
    if (dlvNo) {
      if (!dlvMap.has(dlvNo)) {
        dlvMap.set(dlvNo, {
          id: `dlv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sjNo: dlvNo,
          soNo: soNo,
          customer: customerData.nama,
          customerAddress: customerData.alamat || '',
          customerPIC: customerData.kontak || '',
          customerPhone: customerData.telepon || '',
          status: 'CLOSE',
          items: [],
          deliveryDate: parseDate(tanggal),
          driver: '',
          vehicleNo: '',
          specNote: '',
        });
      }

      const dlvItem = {
        product: productData.nama,
        productCode: productData.kode,
        qty: qty,
        unit: unit,
        soNo: soNo,
      };
      dlvMap.get(dlvNo).items.push(dlvItem);
    }

    // Create/update Invoice
    if (invNo) {
      if (!invMap.has(invNo)) {
        invMap.set(invNo, {
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          invoiceNo: invNo,
          soNo: soNo,
          dlvNo: dlvNo || '',
          noFp: noFp || '', // Nomor Faktur Pajak
          keterangan: record['Ket'] || '', // Keterangan dari CSV
          customer: customerData.nama,
          status: 'OPEN',
          created: parseDate(tanggal),
          items: [],
          subtotal: 0,
          ppn: 0,
          total: 0,
          paymentStatus: 'OPEN',
        });
      } else {
        const inv = invMap.get(invNo);
        if (!inv.dlvNo && dlvNo) {
          inv.dlvNo = dlvNo;
        }
        if (!inv.noFp && noFp) {
          inv.noFp = noFp;
        }
        if (!inv.keterangan && record['Ket']) {
          inv.keterangan = record['Ket'];
        }
      }

      const invItem = {
        productKode: productData.kode,
        productName: productData.nama,
        qty: qty,
        unit: unit,
        price: price,
        total: total,
        ppn: ppn,
        totalAkhir: totalAkhir,
      };
      invMap.get(invNo).items.push(invItem);
      
      const inv = invMap.get(invNo);
      inv.subtotal += total;
      inv.ppn += ppn;
      inv.total += totalAkhir;
    }
  });

  const customers = Array.from(customerMap.values());
  const products = Array.from(productMap.values());
  const salesOrders = Array.from(soMap.values());
  const deliveryNotes = Array.from(dlvMap.values());
  let invoices = Array.from(invMap.values());

  // Add bom object to each invoice for PDF generation
  invoices = invoices.map(inv => ({
    ...inv,
    bom: {
      subtotal: inv.subtotal || 0,
      discount: 0,
      discountPercent: 0,
      tax: inv.ppn || 0, // Use ppn as tax
      taxPercent: inv.subtotal > 0 ? ((inv.ppn || 0) / inv.subtotal) * 100 : 0,
      biayaLain: 0,
      total: inv.total || 0,
    }
  }));

  console.log(`\n✓ Parsed data:`);
  console.log(`  - Customers: ${customers.length}`);
  console.log(`  - Products: ${products.length}`);
  console.log(`  - Sales Orders: ${salesOrders.length}`);
  console.log(`  - Delivery Notes: ${deliveryNotes.length}`);
  console.log(`  - Invoices: ${invoices.length}`);

  fs.writeFileSync(path.join(outputDir, 'customers.json'), JSON.stringify(customers, null, 2));
  fs.writeFileSync(path.join(outputDir, 'products.json'), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(outputDir, 'salesOrders.json'), JSON.stringify(salesOrders, null, 2));
  fs.writeFileSync(path.join(outputDir, 'deliveryNotes.json'), JSON.stringify(deliveryNotes, null, 2));
  fs.writeFileSync(path.join(outputDir, 'invoices.json'), JSON.stringify(invoices, null, 2));

  console.log(`\n✓ Output files saved to: ${outputDir}`);

  console.log(`\n📊 Summary:`);
  console.log(`  Total SO items: ${salesOrders.reduce((sum, so) => sum + so.items.length, 0)}`);
  console.log(`  Total DLV items: ${deliveryNotes.reduce((sum, dlv) => sum + dlv.items.length, 0)}`);
  console.log(`  Total Invoice items: ${invoices.reduce((sum, inv) => sum + inv.items.length, 0)}`);
  
  const newCustomers = customers.filter(c => c.id.startsWith('cust-') && c.id.includes('-')).length;
  const matchedCustomers = customers.length - newCustomers;
  console.log(`\n👥 Customer Breakdown:`);
  console.log(`  - Matched from master: ${matchedCustomers}`);
  console.log(`  - New customers created: ${newCustomers}`);

  console.log(`\n📦 Product Breakdown:`);
  console.log(`  - Matched from master: ${matchedProducts}`);
  console.log(`  - New products created: ${newProducts}`);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
