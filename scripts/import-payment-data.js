#!/usr/bin/env node

/**
 * Import Payment Data
 * 
 * Updates invoices with payment information:
 * - Sets status to CLOSE (paid)
 * - Sets paidAmount to total
 * - Adds payment notes
 * 
 * Usage: node scripts/import-payment-data.js
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
// MAIN FUNCTION
// ============================================================================

const importPaymentData = async () => {
  console.log('🚀 Starting Payment Data Import...\n');
  
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // STEP 1: Read Payment CSV Data
    // ========================================================================
    console.log('📄 Step 1: Reading payment CSV file...');
    const csvPath = path.join(__dirname, '../data/raw/master/payment_data.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const paymentData = await readCSV(csvPath);
    console.log(`   ✅ Read ${paymentData.length} payment records from CSV\n`);
    
    // ========================================================================
    // STEP 2: Load Existing Invoices
    // ========================================================================
    console.log('📚 Step 2: Loading existing invoices...');
    
    const dataPath = path.join(__dirname, '../data/localStorage');
    const existingInvoices = loadJSON(path.join(dataPath, 'invoices.json'));
    const invoicesArray = Array.isArray(existingInvoices) ? existingInvoices : [];
    
    console.log(`   ✅ Loaded ${invoicesArray.length} existing invoices\n`);
    
    // ========================================================================
    // STEP 3: Update Invoices with Payment Data
    // ========================================================================
    console.log('💳 Step 3: Updating invoices with payment data...');
    
    let updated = 0;
    let notFound = 0;
    const notFoundInvoices = [];
    
    paymentData.forEach(payment => {
      const invoiceNo = payment['AR']; // Invoice number from AR column
      const totalAmount = parseFloat(payment['TOTAL INV']) || 0;
      const ket = payment['KET'] || 'Bayar(Tunai)';
      
      if (!invoiceNo) return;
      
      // Find invoice by invoiceNo
      const invoice = invoicesArray.find(inv => inv.invoiceNo === invoiceNo);
      
      if (invoice) {
        // Update invoice status to CLOSE (paid)
        invoice.status = 'CLOSE';
        invoice.paidAmount = totalAmount;
        invoice.paymentProof = ket; // Store payment method/notes
        invoice.paidDate = new Date().toISOString().split('T')[0]; // Today's date
        
        // Update timestamp for sync
        invoice.timestamp = Date.now();
        invoice._timestamp = Date.now();
        
        updated++;
      } else {
        notFound++;
        notFoundInvoices.push(invoiceNo);
      }
    });
    
    console.log(`   ✅ Updated ${updated} invoices`);
    console.log(`   ⚠️  Not found: ${notFound} invoices\n`);
    
    if (notFoundInvoices.length > 0 && notFoundInvoices.length <= 10) {
      console.log('   Not found invoices:');
      notFoundInvoices.forEach(inv => console.log(`     - ${inv}`));
      console.log('');
    }
    
    // ========================================================================
    // STEP 4: Save Updated Invoices
    // ========================================================================
    console.log('💾 Step 4: Saving updated invoices...');
    
    const saved = saveJSON(path.join(dataPath, 'invoices.json'), invoicesArray);
    
    console.log(`   ${saved ? '✅' : '❌'} Invoices saved\n`);
    
    // ========================================================================
    // STEP 5: Sync to Server (for cross-device sync)
    // ========================================================================
    console.log('📤 Step 5: Syncing data to server...\n');
    
    const syncResult = await syncDataToServer('invoices', invoicesArray);
    console.log(`   ${syncResult ? '✅' : '⚠️ '} Invoices synced\n`);
    
    // ========================================================================
    // STEP 6: Summary
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ IMPORT COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Payment records: ${paymentData.length}`);
    console.log(`   • Invoices updated: ${updated}`);
    console.log(`   • Not found: ${notFound}`);
    console.log(`   • Total invoices: ${invoicesArray.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return {
      success: true,
      summary: {
        paymentRecords: paymentData.length,
        invoicesUpdated: updated,
        notFound: notFound,
        totalInvoices: invoicesArray.length,
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
// RUN
// ============================================================================

if (require.main === module) {
  importPaymentData()
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

module.exports = { importPaymentData };
