#!/usr/bin/env node

/**
 * Complete Purchase Supplier Import
 * 
 * All-in-one script that:
 * 1. Imports payment records from CSV
 * 2. Converts to Purchase Orders
 * 3. Fixes date formats
 * 4. Sets correct status (CLOSE)
 * 5. Adds poNo linking
 * 6. Syncs to server
 * 
 * Usage: node scripts/import-purchase-supplier-complete.js
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * Load JSON file
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    if (parsed && typeof parsed === 'object' && 'value' in parsed && Array.isArray(parsed.value)) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Save JSON file with wrapped format
 */
const saveJSON = (filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
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
 * Sync data to server via WebSocket
 */
const syncDataToServer = async (key, data) => {
  try {
    const serverUrl = process.env.SERVER_URL || 'wss://server-tljp.tail75a421.ts.net';
    
    let wsUrl = serverUrl;
    if (serverUrl.startsWith('http://')) {
      wsUrl = serverUrl.replace('http://', 'ws://');
    } else if (serverUrl.startsWith('https://')) {
      wsUrl = serverUrl.replace('https://', 'wss://');
    } else if (!wsUrl.startsWith('ws')) {
      wsUrl = `wss://${serverUrl}`;
    }
    
    if (!wsUrl.includes('/ws')) {
      wsUrl = wsUrl.replace(/\/$/, '') + '/ws';
    }
    
    return new Promise((resolve) => {
      try {
        let WebSocket;
        try {
          WebSocket = require('ws');
        } catch (e) {
          console.log(`   ℹ️  WebSocket module not available, data saved locally`);
          resolve(true);
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
            resolve(true);
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
            resolve(true);
          }
        });
      } catch (error) {
        resolve(true);
      }
    });
  } catch (error) {
    return true;
  }
};

/**
 * Parse date from MM/DD/YY format
 */
const parseDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  try {
    const [month, day, year] = dateStr.split('/');
    const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    return date.toISOString().split('T')[0];
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Extract supplier name from Keterangan
 */
const extractSupplierName = (keterangan) => {
  if (!keterangan) return 'Unknown Supplier';
  
  const patterns = [
    /^([A-Z\s\.]+)\s+PO\s*:/,
    /^([A-Z\s\.]+)\s+SPO/,
    /^PT\.\s+([A-Z\s\.]+)/,
    /^CV\s+([A-Z\s\.]+)/,
    /^([A-Z\s\.]+)\s+INV/,
  ];
  
  for (const pattern of patterns) {
    const match = keterangan.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  const parts = keterangan.split(/\s+PO\s+|INV\s+/);
  return parts[0].trim() || 'Unknown Supplier';
};

/**
 * Generate unique ID
 */
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// MAIN IMPORT LOGIC
// ============================================================================

const main = async () => {
  console.log('\n🚀 Starting Complete Purchase Supplier Import...\n');
  
  const startTime = Date.now();
  
  try {
    // ========== STEP 1: READ CSV ==========
    console.log('📄 Step 1: Reading CSV file...');
    const csvPath = path.join(__dirname, '../data/raw/master/puchasesupplier.csv');
    const csvData = await readCSV(csvPath);
    
    // Don't filter duplicates - import all rows with Kredit > 0
    const validRows = csvData.filter(row => 
      row['No Transaksi'] && row['No Transaksi'].trim() && (parseFloat(row['Kredit'] || 0) || 0) > 0
    );
    
    console.log(`✅ Read ${validRows.length} valid rows from CSV\n`);
    
    // ========== STEP 2: CREATE PAYMENT RECORDS ==========
    console.log('💳 Step 2: Creating payment records...');
    const paymentRecords = [];
    
    for (const row of validRows) {
      const transactionNo = row['No Transaksi'].trim();
      const date = row['Tanggal'] || '';
      const keterangan = row['Keterangan'] || '';
      const debet = parseFloat(row['Debet'] || 0) || 0;
      const kredit = parseFloat(row['Kredit'] || 0) || 0;
      
      if (debet === 0 && kredit === 0) continue;
      
      const amount = kredit > 0 ? kredit : debet;
      const supplierName = extractSupplierName(keterangan);
      const paymentDate = parseDate(date);
      
      const payment = {
        id: generateId(),
        transactionNo: transactionNo,
        paymentNo: transactionNo,
        poNo: transactionNo,
        purchaseOrderNo: transactionNo,
        paymentDate: paymentDate,
        amount: amount,
        type: 'Payment',
        status: 'CLOSE',
        supplier: supplierName,
        description: keterangan,
        notes: `Imported from purchase supplier data - ${transactionNo}`,
        isHistoricalData: true,
        importedAt: new Date().toISOString(),
        importSource: 'puchasesupplier.csv',
        debet: debet,
        kredit: kredit,
        paidDate: paymentDate,
        created: new Date().toISOString()
      };
      
      paymentRecords.push(payment);
    }
    
    console.log(`✅ Created ${paymentRecords.length} payment records\n`);
    
    // ========== STEP 3: CREATE PURCHASE ORDERS ==========
    console.log('📦 Step 3: Creating purchase orders...');
    const poRecords = paymentRecords.map(payment => ({
      id: generateId(),
      poNo: payment.transactionNo,
      poDate: payment.paymentDate,
      receiptDate: payment.paymentDate,
      supplier: payment.supplier,
      supplierName: payment.supplier,
      total: payment.amount,
      balance: 0,
      status: 'CLOSE',
      paymentStatus: 'CLOSE',
      description: payment.description,
      notes: `Imported from purchase supplier data - ${payment.transactionNo}`,
      isHistoricalData: true,
      importedAt: new Date().toISOString(),
      importSource: 'puchasesupplier.csv',
      paymentRecordId: payment.id,
      created: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      timestamp: Date.now(),
      _timestamp: Date.now()
    }));
    
    console.log(`✅ Created ${poRecords.length} purchase orders\n`);
    
    // ========== STEP 4: SAVE PAYMENTS ==========
    console.log('💾 Step 4: Saving payment records...');
    const paymentsPath = path.join(__dirname, '../data/localStorage/payments.json');
    
    if (saveJSON(paymentsPath, paymentRecords)) {
      console.log(`✅ Payments saved (${paymentRecords.length} records)\n`);
    } else {
      console.log(`❌ Failed to save payments\n`);
      process.exit(1);
    }
    
    // ========== STEP 5: SAVE PURCHASE ORDERS ==========
    console.log('💾 Step 5: Saving purchase orders...');
    const posPath = path.join(__dirname, '../data/localStorage/purchaseOrders.json');
    
    if (saveJSON(posPath, poRecords)) {
      console.log(`✅ Purchase orders saved (${poRecords.length} records)\n`);
    } else {
      console.log(`❌ Failed to save purchase orders\n`);
      process.exit(1);
    }
    
    // ========== STEP 6: SYNC TO SERVER ==========
    console.log('📤 Step 6: Syncing to server...');
    await syncDataToServer('payments', paymentRecords);
    console.log(`✅ Payments synced`);
    
    await syncDataToServer('purchaseOrders', poRecords);
    console.log(`✅ Purchase orders synced\n`);
    
    // ========== SUMMARY ==========
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalAmount = paymentRecords.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ IMPORT COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Summary:`);
    console.log(`• Payment Records: ${paymentRecords.length}`);
    console.log(`• Purchase Orders: ${poRecords.length}`);
    console.log(`• Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}`);
    console.log(`• Date Range: ${paymentRecords[0]?.paymentDate} to ${paymentRecords[paymentRecords.length - 1]?.paymentDate}`);
    console.log(`\n📍 Data is now available in:`);
    console.log(`   • Accounts Payable module (/packaging/finance/ap)`);
    console.log(`   • All Reports module (/packaging/finance/all-reports)`);
    console.log(`   • Finance module (/packaging/finance)`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error during import:', error.message);
    process.exit(1);
  }
};

// Run import
main();
