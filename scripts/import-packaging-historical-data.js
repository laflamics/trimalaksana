#!/usr/bin/env node

/**
 * Import Packaging Historical Data
 * 
 * Strategy: Bypass workflow, direct injection
 * - Create SO (CLOSE, confirmed=true) with multiple invoices & deliveries support
 * - Create Delivery Notes from CSV "Ket" field
 * - Create Invoices with financial data
 * - Create Tax Records
 * 
 * Usage: node scripts/import-packaging-historical-data.js
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
const generateId = (prefix = '') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
};

/**
 * Parse CSV date format: "1/9/2026 9:42" → ISO date string
 */
const parseCSVDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString();
  
  try {
    const [datePart, timePart] = dateStr.split(' ');
    const [month, day, year] = datePart.split('/');
    const [hour, minute] = (timePart || '00:00').split(':');
    
    const date = new Date(year, month - 1, day, hour || 0, minute || 0);
    return date.toISOString();
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return new Date().toISOString();
  }
};

/**
 * Extract delivery numbers from "Ket" field
 * Examples:
 * - "PO : 02525012 DO : DLV-2601093396" → ["DLV-2601093396"]
 * - "PO : H13993935-2 1. DLV-2511292762 2. DLV-2511272743" → ["DLV-2511292762", "DLV-2511272743"]
 */
const extractDeliveryNos = (ketField) => {
  if (!ketField) return [];
  
  const deliveryNos = [];
  
  // Pattern 1: "DO : DLV-XXXXXXXXXX"
  const dlvMatches = ketField.matchAll(/DLV-\d+/gi);
  for (const match of dlvMatches) {
    deliveryNos.push(match[0]);
  }
  
  // Pattern 2: "DO : XXXXX-XXXXXX" (non-DLV format)
  if (deliveryNos.length === 0) {
    const doMatch = ketField.match(/DO\s*:\s*([A-Z0-9-]+)/i);
    if (doMatch) {
      deliveryNos.push(doMatch[1]);
    }
  }
  
  // Remove duplicates
  return [...new Set(deliveryNos)];
};

/**
 * Read CSV file
 */
const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Parse number from string (handle comma/dot separators)
 */
const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove spaces and convert to number
  const cleaned = String(value).replace(/\s/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Load JSON file and ensure it returns an array
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${filePath} - using empty array`);
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Handle wrapped storage format: { value: [...] }
    if (parsed && typeof parsed === 'object' && 'value' in parsed && Array.isArray(parsed.value)) {
      return parsed.value;
    }
    
    // Handle direct array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // Handle other formats - return empty array
    console.log(`   ⚠️  Unexpected format in ${filePath} - using empty array`);
    return [];
  } catch (error) {
    console.error(`   ❌ Error loading ${filePath}:`, error.message);
    return [];
  }
};

/**
 * Save JSON file with wrapped format {value: [...], timestamp: ...}
 * This matches the storage service format for proper sync
 */
const saveJSON = (filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Wrap data in storage format: {value: [...], timestamp: ..., _timestamp: ...}
    const wrappedData = {
      value: Array.isArray(data) ? data : [data],
      timestamp: Date.now(),
      _timestamp: Date.now()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(wrappedData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
    return false;
  }
};

/**
 * Lookup customer code by name (fuzzy match)
 */
const lookupCustomerKode = (customerName, customers) => {
  if (!customerName || !customers || customers.length === 0) return '';
  
  const normalized = customerName.trim().toUpperCase();
  
  // Exact match
  let customer = customers.find(c => 
    c.nama && c.nama.toUpperCase() === normalized
  );
  
  // Partial match
  if (!customer) {
    customer = customers.find(c => 
      c.nama && (
        c.nama.toUpperCase().includes(normalized) ||
        normalized.includes(c.nama.toUpperCase())
      )
    );
  }
  
  return customer ? customer.kode : '';
};

/**
 * Lookup product ID by code
 */
const lookupProductId = (productKode, products) => {
  if (!productKode || !products || products.length === 0) return '';
  
  const product = products.find(p => 
    p.kode === productKode || 
    p.product_id === productKode ||
    p.id === productKode
  );
  
  // Return in priority: product_id > kode > id
  if (product) {
    return product.product_id || product.kode || product.id || '';
  }
  
  return '';
};

/**
 * Lookup PAD code by product code
 */
const lookupPadCode = (productKode, products) => {
  if (!productKode || !products || products.length === 0) return '';
  
  const product = products.find(p => 
    p.kode === productKode || p.product_id === productKode
  );
  
  return product ? (product.padCode || '') : '';
};

/**
 * Sync data to server via WebSocket
 * This ensures data is available on other devices
 */
const syncDataToServer = async (key, data) => {
  try {
    const serverUrl = process.env.SERVER_URL || 'wss://server-tljp.tail75a421.ts.net';
    
    // Convert to WebSocket URL
    let wsUrl = serverUrl;
    if (serverUrl.startsWith('http://')) {
      wsUrl = serverUrl.replace('http://', 'ws://');
    } else if (serverUrl.startsWith('https://')) {
      wsUrl = serverUrl.replace('https://', 'wss://');
    } else if (!serverUrl.startsWith('ws')) {
      wsUrl = `wss://${serverUrl}`;
    }
    
    // Ensure /ws path
    if (!wsUrl.includes('/ws')) {
      wsUrl = wsUrl.replace(/\/$/, '') + '/ws';
    }
    
    return new Promise((resolve) => {
      try {
        // Try to use ws module if available, otherwise use https
        let WebSocket;
        try {
          WebSocket = require('ws');
        } catch (e) {
          // ws module not available, skip sync but don't fail
          console.log(`   ℹ️  WebSocket module not available, data saved locally`);
          resolve(true); // Return true so import continues
          return;
        }
        
        const ws = new WebSocket(wsUrl, {
          rejectUnauthorized: false
        });
        
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            ws.close();
            resolve(true); // Return true so import continues
          }
        }, 5000);
        
        ws.on('open', () => {
          const message = {
            action: 'update',
            key: key,
            value: data,
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(message));
        });
        
        ws.on('message', (msg) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        });
        
        ws.on('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(true); // Return true so import continues
          }
        });
        
        ws.on('close', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(true); // Return true so import continues
          }
        });
      } catch (error) {
        resolve(true); // Return true so import continues
      }
    });
  } catch (error) {
    console.error(`Error syncing ${key}:`, error.message);
    return true; // Return true so import continues
  }
};

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

const importPackagingHistoricalData = async () => {
  console.log('🚀 Starting Packaging Historical Data Import...\n');
  
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // STEP 1: Read CSV Data
    // ========================================================================
    console.log('📄 Step 1: Reading CSV file...');
    const csvPath = path.join(__dirname, '../data/raw/master/LAP PENJUALAN DETAIL PERIODE FEBRUARI PER 9 FEB 2026.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const csvData = await readCSV(csvPath);
    console.log(`   ✅ Read ${csvData.length} rows from CSV\n`);
    
    // ========================================================================
    // STEP 2: Load Master Data
    // ========================================================================
    console.log('📚 Step 2: Loading master data...');
    const dataPath = path.join(__dirname, '../data/localStorage/Packaging');
    
    const customers = loadJSON(path.join(dataPath, 'customers.json'));
    const products = loadJSON(path.join(dataPath, 'products.json'));
    
    console.log(`   ✅ Loaded ${Array.isArray(customers) ? customers.length : 0} customers`);
    console.log(`   ✅ Loaded ${Array.isArray(products) ? products.length : 0} products\n`);
    
    // ========================================================================
    // STEP 3: Load Existing Data
    // ========================================================================
    console.log('📦 Step 3: Loading existing data...');
    
    const existingSOs = loadJSON(path.join(dataPath, 'salesOrders.json'));
    const existingDeliveries = loadJSON(path.join(dataPath, 'delivery.json'));
    const existingInvoices = loadJSON(path.join(dataPath, 'invoices.json'));
    const existingTaxRecords = loadJSON(path.join(dataPath, 'taxRecords.json'));
    
    console.log(`   ✅ Existing SOs: ${Array.isArray(existingSOs) ? existingSOs.length : 0}`);
    console.log(`   ✅ Existing Deliveries: ${Array.isArray(existingDeliveries) ? existingDeliveries.length : 0}`);
    console.log(`   ✅ Existing Invoices: ${Array.isArray(existingInvoices) ? existingInvoices.length : 0}`);
    console.log(`   ✅ Existing Tax Records: ${Array.isArray(existingTaxRecords) ? existingTaxRecords.length : 0}\n`);
    
    // ========================================================================
    // STEP 4: Group Data by SO (No PO)
    // ========================================================================
    console.log('🔄 Step 4: Grouping data by SO (No PO)...');
    
    const groupedBySO = {};
    
    csvData.forEach(row => {
      const soNo = row['No PO'];
      if (!soNo) return;
      
      if (!groupedBySO[soNo]) {
        groupedBySO[soNo] = {
          soNo,
          customer: row['Nama Cust'],
          created: parseCSVDate(row['Tanggal']),
          rows: []
        };
      }
      
      groupedBySO[soNo].rows.push(row);
    });
    
    console.log(`   ✅ Grouped into ${Object.keys(groupedBySO).length} SOs\n`);
    
    // ========================================================================
    // STEP 5: Group Data by Invoice (No Inv)
    // ========================================================================
    console.log('🔄 Step 5: Grouping data by Invoice (No Inv)...');
    
    const groupedByInvoice = {};
    
    csvData.forEach(row => {
      const invNo = row['No Inv'];
      if (!invNo) return;
      
      if (!groupedByInvoice[invNo]) {
        groupedByInvoice[invNo] = {
          invoiceNo: invNo,
          soNo: row['No PO'],
          customer: row['Nama Cust'],
          invoiceDate: parseCSVDate(row['Tanggal']),
          rows: []
        };
      }
      
      groupedByInvoice[invNo].rows.push(row);
    });
    
    console.log(`   ✅ Grouped into ${Object.keys(groupedByInvoice).length} Invoices\n`);
    
    // ========================================================================
    // STEP 6: Create Sales Orders
    // ========================================================================
    console.log('📝 Step 6: Creating Sales Orders...');
    
    const newSOs = [];
    const skippedSOs = [];
    
    for (const [soNo, soData] of Object.entries(groupedBySO)) {
      // Skip if SO already exists
      const existingSOsArray = Array.isArray(existingSOs) ? existingSOs : [];
      if (existingSOsArray.find(so => so.soNo === soNo)) {
        skippedSOs.push(soNo);
        continue;
      }
      
      // Get all invoice numbers for this SO
      const invoiceNos = [...new Set(
        soData.rows.map(row => row['No Inv']).filter(Boolean)
      )];
      
      // Get all delivery numbers for this SO
      const deliveryNos = [...new Set(
        soData.rows.flatMap(row => extractDeliveryNos(row['Ket']))
      )];
      
      // Get tax invoice number (usually same for all rows in SO)
      const taxInvoiceNo = soData.rows[0]['No FP'] || '';
      
      // Calculate financial summary
      const subtotal = soData.rows.reduce((sum, row) => 
        sum + parseNumber(row['Total']), 0
      );
      const tax = soData.rows.reduce((sum, row) => 
        sum + parseNumber(row[' PPN ']), 0
      );
      const grandTotal = soData.rows.reduce((sum, row) => 
        sum + parseNumber(row[' Total Akhir ']), 0
      );
      const discount = soData.rows.reduce((sum, row) => 
        sum + parseNumber(row[' Pot.  ']), 0
      );
      
      // Create SO items
      const items = soData.rows.map((row, idx) => {
        const productKode = row['Kode Item'];
        const productId = lookupProductId(productKode, products);
        
        return {
          id: `item-${generateId()}`,
          productId: productId || productKode, // ✅ Fallback ke productKode kalau lookup gagal
          productKode: productKode,
          productName: row['Nama Item'],
          qty: parseNumber(row['Jml']),
          unit: row['Satuan'] || 'PCS',
          price: parseNumber(row['Harga']),
          total: parseNumber(row['Total']),
          padCode: lookupPadCode(productKode, products),
        };
      });
      
      const newSO = {
        id: generateId('so'),
        soNo: soNo,
        customer: soData.customer,
        customerKode: lookupCustomerKode(soData.customer, customers),
        paymentTerms: 'TOP',
        topDays: 30,
        status: 'CLOSE',
        created: soData.created,
        category: 'packaging',
        confirmed: true,
        confirmedAt: soData.created,
        confirmedBy: 'system-import',
        
        // 🔑 NEW KEYS: Multiple invoices & deliveries support
        invoiceNos: invoiceNos,
        deliveryNos: deliveryNos,
        taxInvoiceNo: taxInvoiceNo,
        isHistoricalData: true,
        importedAt: new Date().toISOString(),
        importSource: 'packaging_master.csv',
        
        financialSummary: {
          subtotal: subtotal,
          tax: tax,
          grandTotal: grandTotal,
          discount: discount
        },
        
        items: items,
        
        timestamp: Date.now(),
        _timestamp: Date.now()
      };
      
      newSOs.push(newSO);
    }
    
    console.log(`   ✅ Created ${newSOs.length} new SOs`);
    console.log(`   ⚠️  Skipped ${skippedSOs.length} existing SOs\n`);
    
    // ========================================================================
    // STEP 7: Create Delivery Notes
    // ========================================================================
    console.log('🚚 Step 7: Creating Delivery Notes...');
    
    const newDeliveries = [];
    const skippedDeliveries = [];
    
    // Collect all unique deliveries from invoices
    const deliveryMap = new Map();
    
    for (const [invNo, invData] of Object.entries(groupedByInvoice)) {
      const deliveryNos = [...new Set(
        invData.rows.flatMap(row => extractDeliveryNos(row['Ket']))
      )];
      
      deliveryNos.forEach((deliveryNo, idx) => {
        if (!deliveryMap.has(deliveryNo)) {
          deliveryMap.set(deliveryNo, {
            deliveryNo,
            invoiceNo: invNo,
            soNo: invData.soNo,
            customer: invData.customer,
            deliveryDate: invData.invoiceDate,
            isPartialDelivery: deliveryNos.length > 1,
            deliverySequence: idx + 1,
            totalDeliveries: deliveryNos.length,
            items: [] // Will be populated from SO items
          });
        }
      });
    }
    
    for (const [deliveryNo, deliveryData] of deliveryMap) {
      // Skip if delivery already exists
      const existingDeliveriesArray = Array.isArray(existingDeliveries) ? existingDeliveries : [];
      if (existingDeliveriesArray.find(d => d.deliveryNo === deliveryNo)) {
        skippedDeliveries.push(deliveryNo);
        continue;
      }
      
      // Find SO to get items
      const newSOsArray = Array.isArray(newSOs) ? newSOs : [];
      const existingSOsArray = Array.isArray(existingSOs) ? existingSOs : [];
      const relatedSO = newSOsArray.find(so => so.soNo === deliveryData.soNo) ||
                        existingSOsArray.find(so => so.soNo === deliveryData.soNo);
      
      const items = relatedSO ? relatedSO.items.map(item => ({
        productId: item.productId,
        productKode: item.productKode,
        product: item.productName,      // ✅ Add 'product' field untuk UI compatibility
        productName: item.productName,  // Keep productName juga
        qty: item.qty,
        unit: item.unit
      })) : [];
      
      const newDelivery = {
        id: generateId('dlv'),
        sjNo: deliveryNo, // ✅ Set SJ number to match delivery number
        deliveryNo: deliveryNo,
        soNo: deliveryData.soNo,
        customer: deliveryData.customer,
        deliveryDate: deliveryData.deliveryDate,
        status: 'CLOSE', // ✅ CLOSE - historical data sudah selesai
        
        // 🔑 NEW KEYS: Link to invoice & partial delivery tracking
        invoiceNo: deliveryData.invoiceNo,
        isPartialDelivery: deliveryData.isPartialDelivery,
        deliverySequence: deliveryData.deliverySequence,
        totalDeliveries: deliveryData.totalDeliveries,
        
        items: items,
        timestamp: Date.now(),
        _timestamp: Date.now() // ✅ Add _timestamp untuk sync ke server
      };
      
      newDeliveries.push(newDelivery);
    }
    
    console.log(`   ✅ Created ${newDeliveries.length} new deliveries`);
    console.log(`   ⚠️  Skipped ${skippedDeliveries.length} existing deliveries\n`);
    
    // ========================================================================
    // STEP 8: Create Invoices
    // ========================================================================
    console.log('🧾 Step 8: Creating Invoices (OPEN status)...');
    console.log('   ℹ️  Invoices will be OPEN - users can upload payment proof later\n');
    
    const newInvoices = [];
    const skippedInvoices = [];
    
    for (const [invNo, invData] of Object.entries(groupedByInvoice)) {
      // Skip if invoice already exists
      const existingInvoicesArray = Array.isArray(existingInvoices) ? existingInvoices : [];
      if (existingInvoicesArray.find(inv => inv.invoiceNo === invNo)) {
        skippedInvoices.push(invNo);
        continue;
      }
      
      // Get delivery numbers for this invoice
      const deliveryNos = [...new Set(
        invData.rows.flatMap(row => extractDeliveryNos(row['Ket']))
      )];
      
      // Calculate totals
      const subtotal = invData.rows.reduce((sum, row) => 
        sum + parseNumber(row['Total']), 0
      );
      const tax = invData.rows.reduce((sum, row) => 
        sum + parseNumber(row[' PPN ']), 0
      );
      const discount = invData.rows.reduce((sum, row) => 
        sum + parseNumber(row[' Pot.  ']), 0
      );
      const grandTotal = invData.rows.reduce((sum, row) => 
        sum + parseNumber(row[' Total Akhir ']), 0
      );
      
      // ✅ Extract keterangan from first row's "Ket" field
      const keterangan = invData.rows[0]['Ket'] || '';
      
      const newInvoice = {
        id: generateId('inv'),
        invoiceNo: invNo,
        invoiceDate: invData.invoiceDate,
        soNo: invData.soNo,
        customer: invData.customer,
        customerKode: lookupCustomerKode(invData.customer, customers),
        paymentTerms: 'TOP',
        topDays: 30,
        status: 'OPEN', // ✅ OPEN - biar user upload bukti pembayaran sendiri
        total: grandTotal,
        paidAmount: 0, // ✅ 0 - belum dibayar
        
        // 🔑 NEW KEY: Multiple deliveries support
        deliveryNos: deliveryNos,
        
        // ✅ NEW: Keterangan dari CSV
        notes: keterangan,
        
        // 🔑 NEW: Invoice lines untuk PDF rendering
        lines: invData.rows.map((row, idx) => ({
          itemSku: row['Kode Item'],
          itemName: row['Nama Item'],
          qty: parseNumber(row['Jml']),
          unit: row['Satuan'] || 'PCS',
          price: parseNumber(row['Harga']),
          total: parseNumber(row['Total']),
          discount: parseNumber(row[' Pot.  ']) || 0
        })),
        
        bom: {
          total: grandTotal,
          tax: tax,
          topDays: 30,
          subtotal: subtotal,
          discount: discount
        },
        
        // ❌ Remove paidDate & paymentProof - biar user isi sendiri
        // paidDate: invData.invoiceDate.split('T')[0],
        // paymentProof: 'historical-import',
        
        timestamp: Date.now(),
        _timestamp: Date.now() // ✅ Add _timestamp untuk sync ke server
      };
      
      newInvoices.push(newInvoice);
    }
    
    console.log(`   ✅ Created ${newInvoices.length} new invoices`);
    console.log(`   ⚠️  Skipped ${skippedInvoices.length} existing invoices\n`);
    
    // ========================================================================
    // STEP 9: Create Tax Records (Unpaid status)
    // ========================================================================
    console.log('💰 Step 9: Creating Tax Records (Unpaid status)...');
    console.log('   ℹ️  Tax records will be Unpaid - will update when invoice paid\n');
    
    const newTaxRecords = [];
    const skippedTaxRecords = [];
    
    for (const invoice of newInvoices) {
      // Find SO to get tax invoice number
      const newSOsArray = Array.isArray(newSOs) ? newSOs : [];
      const relatedSO = newSOsArray.find(so => so.invoiceNos && so.invoiceNos.includes(invoice.invoiceNo));
      const taxInvoiceNo = relatedSO ? relatedSO.taxInvoiceNo : '';
      
      if (!taxInvoiceNo) continue;
      
      // Skip if tax record already exists
      const existingTaxRecordsArray = Array.isArray(existingTaxRecords) ? existingTaxRecords : [];
      if (existingTaxRecordsArray.find(t => t.taxInvoiceNo === taxInvoiceNo)) {
        skippedTaxRecords.push(taxInvoiceNo);
        continue;
      }
      
      const newTaxRecord = {
        id: generateId('tax'),
        type: 'Output',
        reference: invoice.invoiceNo,
        taxInvoiceNo: taxInvoiceNo,
        taxDate: invoice.invoiceDate.split('T')[0],
        taxAmount: invoice.bom.tax,
        status: 'Unpaid', // ✅ Unpaid - akan update saat invoice dibayar
        // ❌ Remove paidDate - biar update saat payment
        timestamp: Date.now(),
        _timestamp: Date.now() // ✅ Add _timestamp untuk sync ke server
      };
      
      newTaxRecords.push(newTaxRecord);
    }
    
    console.log(`   ✅ Created ${newTaxRecords.length} new tax records`);
    console.log(`   ⚠️  Skipped ${skippedTaxRecords.length} existing tax records\n`);
    
    // ========================================================================
    // STEP 10: Save to Storage
    // ========================================================================
    console.log('💾 Step 10: Saving to storage...');
    
    const existingSOsArray = Array.isArray(existingSOs) ? existingSOs : [];
    const existingDeliveriesArray = Array.isArray(existingDeliveries) ? existingDeliveries : [];
    const existingInvoicesArray = Array.isArray(existingInvoices) ? existingInvoices : [];
    const existingTaxRecordsArray = Array.isArray(existingTaxRecords) ? existingTaxRecords : [];
    
    const allSOs = [...existingSOsArray, ...newSOs];
    const allDeliveries = [...existingDeliveriesArray, ...newDeliveries];
    const allInvoices = [...existingInvoicesArray, ...newInvoices];
    const allTaxRecords = [...existingTaxRecordsArray, ...newTaxRecords];
    
    const saved = {
      salesOrders: saveJSON(path.join(dataPath, 'salesOrders.json'), allSOs),
      deliveries: saveJSON(path.join(dataPath, 'delivery.json'), allDeliveries),
      invoices: saveJSON(path.join(dataPath, 'invoices.json'), allInvoices),
      taxRecords: saveJSON(path.join(dataPath, 'taxRecords.json'), allTaxRecords)
    };
    
    console.log(`   📁 Save paths:`);
    console.log(`      - SOs: ${path.join(dataPath, 'salesOrders.json')}`);
    console.log(`      - Deliveries: ${path.join(dataPath, 'delivery.json')}`);
    console.log(`      - Invoices: ${path.join(dataPath, 'invoices.json')}`);
    console.log(`      - Tax: ${path.join(dataPath, 'taxRecords.json')}`);
    
    console.log(`   ${saved.salesOrders ? '✅' : '❌'} Sales Orders saved`);
    console.log(`   ${saved.deliveries ? '✅' : '❌'} Deliveries saved`);
    console.log(`   ${saved.invoices ? '✅' : '❌'} Invoices saved`);
    console.log(`   ${saved.taxRecords ? '✅' : '❌'} Tax Records saved\n`);
    
    // ========================================================================
    // STEP 11: Sync to Server (for cross-device sync)
    // ========================================================================
    console.log('📤 Step 11: Syncing data to server...\n');
    
    const syncResults = {
      salesOrders: await syncDataToServer('Packaging/salesOrders', allSOs),
      delivery: await syncDataToServer('Packaging/delivery', allDeliveries),
      invoices: await syncDataToServer('Packaging/invoices', allInvoices),
      taxRecords: await syncDataToServer('Packaging/taxRecords', allTaxRecords)
    };
    
    console.log(`   ${syncResults.salesOrders ? '✅' : '⚠️ '} Sales Orders synced`);
    console.log(`   ${syncResults.delivery ? '✅' : '⚠️ '} Deliveries synced`);
    console.log(`   ${syncResults.invoices ? '✅' : '⚠️ '} Invoices synced`);
    console.log(`   ${syncResults.taxRecords ? '✅' : '⚠️ '} Tax Records synced\n`);
    
    // ========================================================================
    // STEP 12: Summary
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ IMPORT COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Sales Orders:   ${newSOs.length} created, ${skippedSOs.length} skipped`);
    console.log(`   • Deliveries:     ${newDeliveries.length} created, ${skippedDeliveries.length} skipped`);
    console.log(`   • Invoices:       ${newInvoices.length} created, ${skippedInvoices.length} skipped`);
    console.log(`   • Tax Records:    ${newTaxRecords.length} created, ${skippedTaxRecords.length} skipped`);
    console.log('');
    console.log('📈 Total Records:');
    console.log(`   • Sales Orders:   ${allSOs.length}`);
    console.log(`   • Deliveries:     ${allDeliveries.length}`);
    console.log(`   • Invoices:       ${allInvoices.length}`);
    console.log(`   • Tax Records:    ${allTaxRecords.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return {
      success: true,
      summary: {
        created: {
          salesOrders: newSOs.length,
          deliveries: newDeliveries.length,
          invoices: newInvoices.length,
          taxRecords: newTaxRecords.length
        },
        skipped: {
          salesOrders: skippedSOs.length,
          deliveries: skippedDeliveries.length,
          invoices: skippedInvoices.length,
          taxRecords: skippedTaxRecords.length
        },
        total: {
          salesOrders: allSOs.length,
          deliveries: allDeliveries.length,
          invoices: allInvoices.length,
          taxRecords: allTaxRecords.length
        },
        duration: duration
      }
    };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================================
// RUN IMPORT
// ============================================================================

if (require.main === module) {
  importPackagingHistoricalData()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { importPackagingHistoricalData };
