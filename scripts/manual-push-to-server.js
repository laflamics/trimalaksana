#!/usr/bin/env node

/**
 * Manual Push to Server
 * 
 * Directly push data from CSV to server without saving locally first
 * This bypasses the app's file reset issue
 * 
 * Usage: node scripts/manual-push-to-server.js
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVER_URL = process.env.SERVER_URL || 'https://server-tljp.tail75a421.ts.net';
const TIMEOUT = 30000;

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
 * Parse CSV date
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
    return new Date().toISOString();
  }
};

/**
 * Extract delivery numbers from Ket field
 */
const extractDeliveryNos = (ketField) => {
  if (!ketField) return [];
  const deliveryNos = [];
  const dlvMatches = ketField.matchAll(/DLV-\d+/gi);
  for (const match of dlvMatches) {
    deliveryNos.push(match[0]);
  }
  if (deliveryNos.length === 0) {
    const doMatch = ketField.match(/DO\s*:\s*([A-Z0-9-]+)/i);
    if (doMatch) {
      deliveryNos.push(doMatch[1]);
    }
  }
  return [...new Set(deliveryNos)];
};

/**
 * Parse number
 */
const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/\s/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Read CSV
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
 * Load JSON
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && 'value' in parsed && Array.isArray(parsed.value)) {
      return parsed.value;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Push data to server via HTTPS
 */
const pushToServer = (key, data) => {
  return new Promise((resolve) => {
    try {
      const url = new URL(`/api/storage/${key}`, SERVER_URL);
      const postData = JSON.stringify({ [key]: data });
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: TIMEOUT,
        rejectUnauthorized: false // Allow self-signed certs
      };
      
      const req = https.request(url, options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            console.log(`   ⚠️  Server returned ${res.statusCode}`);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`   ⚠️  Error: ${error.message}`);
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.write(postData);
      req.end();
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
      resolve(false);
    }
  });
};

// ============================================================================
// MAIN
// ============================================================================

const main = async () => {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 Manual Push to Server');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📡 Server: ${SERVER_URL}\n`);
  
  try {
    // Step 1: Read CSV
    console.log('📄 Step 1: Reading CSV...');
    const csvPath = path.join(__dirname, '../data/raw/master/packaging_master.csv');
    const csvData = await readCSV(csvPath);
    console.log(`   ✅ Read ${csvData.length} rows\n`);
    
    // Step 2: Load master data
    console.log('📚 Step 2: Loading master data...');
    const dataPath = path.join(__dirname, '../data/localStorage');
    const customers = loadJSON(path.join(dataPath, 'customers.json'));
    const products = loadJSON(path.join(dataPath, 'products.json'));
    console.log(`   ✅ Loaded ${customers.length} customers`);
    console.log(`   ✅ Loaded ${products.length} products\n`);
    
    // Step 3: Group data
    console.log('🔄 Step 3: Grouping data...');
    const groupedByPO = {};
    const groupedByInv = {};
    
    for (const row of csvData) {
      const po = row['No PO'];
      const inv = row['No Inv'];
      
      if (!groupedByPO[po]) groupedByPO[po] = [];
      if (!groupedByInv[inv]) groupedByInv[inv] = [];
      
      groupedByPO[po].push(row);
      groupedByInv[inv].push(row);
    }
    
    console.log(`   ✅ Grouped into ${Object.keys(groupedByPO).length} SOs`);
    console.log(`   ✅ Grouped into ${Object.keys(groupedByInv).length} Invoices\n`);
    
    // Step 4: Create SOs
    console.log('📝 Step 4: Creating Sales Orders...');
    const newSOs = [];
    for (const [po, rows] of Object.entries(groupedByPO)) {
      const newSO = {
        id: generateId('so'),
        soNo: po,
        customer: rows[0]['Nama Cust'],
        paymentTerms: 'TOP',
        topDays: 30,
        status: 'CLOSE',
        created: parseCSVDate(rows[0]['Tanggal']),
        confirmed: true,
        confirmedAt: parseCSVDate(rows[0]['Tanggal']),
        items: rows.map((row, idx) => ({
          id: generateId('item'),
          productId: row['Kode Item'],
          productKode: row['Kode Item'],
          productName: row['Nama Item'],
          qty: parseNumber(row['Jml']),
          unit: row['Satuan'] || 'PCS',
          price: parseNumber(row['Harga']),
          total: parseNumber(row['Total'])
        })),
        timestamp: Date.now(),
        _timestamp: Date.now(),
        isHistoricalData: true,
        importedAt: new Date().toISOString(),
        importSource: 'packaging_master.csv'
      };
      newSOs.push(newSO);
    }
    console.log(`   ✅ Created ${newSOs.length} SOs\n`);
    
    // Step 5: Create Deliveries
    console.log('🚚 Step 5: Creating Deliveries...');
    const newDeliveries = [];
    const deliverySet = new Set();
    
    for (const row of csvData) {
      const deliveryNos = extractDeliveryNos(row['Ket']);
      for (const dlvNo of deliveryNos) {
        if (!deliverySet.has(dlvNo)) {
          deliverySet.add(dlvNo);
          const newDlv = {
            id: generateId('dlv'),
            sjNo: dlvNo,
            deliveryNo: dlvNo,
            soNo: row['No PO'],
            customer: row['Nama Cust'],
            deliveryDate: parseCSVDate(row['Tanggal']),
            status: 'CLOSE',
            items: [{
              productId: row['Kode Item'],
              productKode: row['Kode Item'],
              product: row['Kode Item'],
              productName: row['Nama Item'],
              qty: parseNumber(row['Jml']),
              unit: row['Satuan'] || 'PCS'
            }],
            timestamp: Date.now(),
            _timestamp: Date.now(),
            isHistoricalData: true,
            importedAt: new Date().toISOString()
          };
          newDeliveries.push(newDlv);
        }
      }
    }
    console.log(`   ✅ Created ${newDeliveries.length} Deliveries\n`);
    
    // Step 6: Create Invoices
    console.log('🧾 Step 6: Creating Invoices...');
    const newInvoices = [];
    for (const [inv, rows] of Object.entries(groupedByInv)) {
      const subtotal = rows.reduce((sum, row) => sum + parseNumber(row['Total']), 0);
      const tax = rows.reduce((sum, row) => sum + parseNumber(row[' PPN ']), 0);
      const discount = rows.reduce((sum, row) => sum + parseNumber(row[' Pot.  ']), 0);
      const grandTotal = rows.reduce((sum, row) => sum + parseNumber(row[' Total Akhir ']), 0);
      
      const newInv = {
        id: generateId('inv'),
        invoiceNo: inv,
        invoiceDate: parseCSVDate(rows[0]['Tanggal']),
        soNo: rows[0]['No PO'],
        customer: rows[0]['Nama Cust'],
        paymentTerms: 'TOP',
        topDays: 30,
        status: 'OPEN',
        total: grandTotal,
        paidAmount: 0,
        deliveryNos: [...new Set(rows.flatMap(row => extractDeliveryNos(row['Ket'])))],
        notes: rows[0]['Ket'] || '',
        lines: rows.map(row => ({
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
        timestamp: Date.now(),
        _timestamp: Date.now(),
        isHistoricalData: true,
        importedAt: new Date().toISOString()
      };
      newInvoices.push(newInv);
    }
    console.log(`   ✅ Created ${newInvoices.length} Invoices\n`);
    
    // Step 7: Push to server
    console.log('📤 Step 7: Pushing to server...\n');
    
    const pushResults = {
      salesOrders: await pushToServer('salesOrders', newSOs),
      delivery: await pushToServer('delivery', newDeliveries),
      invoices: await pushToServer('invoices', newInvoices)
    };
    
    console.log(`   ${pushResults.salesOrders ? '✅' : '⚠️ '} Sales Orders pushed`);
    console.log(`   ${pushResults.delivery ? '✅' : '⚠️ '} Deliveries pushed`);
    console.log(`   ${pushResults.invoices ? '✅' : '⚠️ '} Invoices pushed\n`);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ PUSH COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s\n`);
    
    console.log('📊 Summary:');
    console.log(`   • Sales Orders: ${newSOs.length}`);
    console.log(`   • Deliveries: ${newDeliveries.length}`);
    console.log(`   • Invoices: ${newInvoices.length}`);
    console.log(`   • Total: ${newSOs.length + newDeliveries.length + newInvoices.length}\n`);
    
    if (pushResults.salesOrders && pushResults.delivery && pushResults.invoices) {
      console.log('✨ All data pushed successfully to server!\n');
    } else {
      console.log('⚠️  Some data failed to push. Check server connectivity.\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();
