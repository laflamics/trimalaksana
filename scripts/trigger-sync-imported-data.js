#!/usr/bin/env node

/**
 * Trigger Sync for Imported Data
 * 
 * This script updates the timestamps of imported data to trigger
 * automatic sync to the server and other devices.
 * 
 * Usage: node scripts/trigger-sync-imported-data.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load JSON file
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${filePath}`);
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
    
    return [];
  } catch (error) {
    console.error(`   ❌ Error loading ${filePath}:`, error.message);
    return [];
  }
};

/**
 * Save JSON file
 */
const saveJSON = (filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
    return false;
  }
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

const triggerSyncImportedData = async () => {
  console.log('🚀 Starting Trigger Sync for Imported Data...\n');
  
  const startTime = Date.now();
  const currentTimestamp = Date.now();
  
  try {
    // ========================================================================
    // STEP 1: Load Data
    // ========================================================================
    console.log('📦 Step 1: Loading imported data...');
    
    const dataPath = path.join(__dirname, '../data/localStorage');
    
    const salesOrders = loadJSON(path.join(dataPath, 'salesOrders.json'));
    const deliveries = loadJSON(path.join(dataPath, 'delivery.json'));
    const invoices = loadJSON(path.join(dataPath, 'invoices.json'));
    const taxRecords = loadJSON(path.join(dataPath, 'taxRecords.json'));
    
    console.log(`   ✅ Loaded ${salesOrders.length} Sales Orders`);
    console.log(`   ✅ Loaded ${deliveries.length} Deliveries`);
    console.log(`   ✅ Loaded ${invoices.length} Invoices`);
    console.log(`   ✅ Loaded ${taxRecords.length} Tax Records\n`);
    
    // ========================================================================
    // STEP 2: Update Timestamps to Trigger Sync
    // ========================================================================
    console.log('⏱️  Step 2: Updating timestamps to trigger sync...\n');
    
    // Update Sales Orders
    console.log('   📝 Updating Sales Orders...');
    const updatedSOs = salesOrders.map(so => ({
      ...so,
      timestamp: currentTimestamp,
      _timestamp: currentTimestamp,
      lastUpdate: new Date().toISOString()
    }));
    const soSaved = saveJSON(path.join(dataPath, 'salesOrders.json'), updatedSOs);
    console.log(`   ${soSaved ? '✅' : '❌'} Sales Orders updated\n`);
    
    // Update Deliveries
    console.log('   📝 Updating Deliveries...');
    const updatedDeliveries = deliveries.map(d => ({
      ...d,
      timestamp: currentTimestamp,
      _timestamp: currentTimestamp,
      lastUpdate: new Date().toISOString()
    }));
    const dlvSaved = saveJSON(path.join(dataPath, 'delivery.json'), updatedDeliveries);
    console.log(`   ${dlvSaved ? '✅' : '❌'} Deliveries updated\n`);
    
    // Update Invoices
    console.log('   📝 Updating Invoices...');
    const updatedInvoices = invoices.map(inv => ({
      ...inv,
      timestamp: currentTimestamp,
      _timestamp: currentTimestamp,
      lastUpdate: new Date().toISOString()
    }));
    const invSaved = saveJSON(path.join(dataPath, 'invoices.json'), updatedInvoices);
    console.log(`   ${invSaved ? '✅' : '❌'} Invoices updated\n`);
    
    // Update Tax Records
    console.log('   📝 Updating Tax Records...');
    const updatedTaxRecords = taxRecords.map(t => ({
      ...t,
      timestamp: currentTimestamp,
      _timestamp: currentTimestamp,
      lastUpdate: new Date().toISOString()
    }));
    const taxSaved = saveJSON(path.join(dataPath, 'taxRecords.json'), updatedTaxRecords);
    console.log(`   ${taxSaved ? '✅' : '❌'} Tax Records updated\n`);
    
    // ========================================================================
    // STEP 3: Summary
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SYNC TRIGGER COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('');
    console.log('📊 Updated Records:');
    console.log(`   • Sales Orders:   ${updatedSOs.length}`);
    console.log(`   • Deliveries:     ${updatedDeliveries.length}`);
    console.log(`   • Invoices:       ${updatedInvoices.length}`);
    console.log(`   • Tax Records:    ${updatedTaxRecords.length}`);
    console.log('');
    console.log('ℹ️  Next Steps:');
    console.log('   1. The app will automatically sync this data to the server');
    console.log('   2. Open the app on other devices');
    console.log('   3. Pull to refresh or restart the app');
    console.log('   4. Data should appear on all devices within 1-2 minutes');
    console.log('');
    console.log('💡 Tip: If data still doesn\'t sync:');
    console.log('   - Check that the server is running');
    console.log('   - Check network connectivity');
    console.log('   - Restart the app on all devices');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return {
      success: true,
      summary: {
        salesOrders: updatedSOs.length,
        deliveries: updatedDeliveries.length,
        invoices: updatedInvoices.length,
        taxRecords: updatedTaxRecords.length
      },
      duration: duration
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
  triggerSyncImportedData()
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

module.exports = { triggerSyncImportedData };
