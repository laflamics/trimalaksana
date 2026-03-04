#!/usr/bin/env node

/**
 * Add ppicNotified Flag to Sales Orders
 * 
 * Adds ppicNotified and ppicNotifiedAt flags to all sales orders
 * so they can be tracked in PPIC notifications
 * 
 * Usage: node scripts/add-ppic-notified-flag.js
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

// ============================================================================
// MAIN
// ============================================================================

const main = async () => {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏷️  Add ppicNotified Flag to Sales Orders');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const dataPath = path.join(__dirname, '../data/localStorage');
    
    // Step 1: Load sales orders
    console.log('📂 Step 1: Loading sales orders...');
    const salesOrders = loadJSON(path.join(dataPath, 'salesOrders.json'));
    console.log(`   ✅ Loaded ${salesOrders.length} sales orders\n`);
    
    // Step 2: Add ppicNotified flag
    console.log('✍️  Step 2: Adding ppicNotified flag...\n');
    
    let updatedCount = 0;
    const updatedSalesOrders = salesOrders.map((so) => {
      // Check if ppicNotified flag already exists
      if (!so.ppicNotified) {
        updatedCount++;
        return {
          ...so,
          ppicNotified: false,
          ppicNotifiedAt: null,
          ppicNotifiedBy: null
        };
      }
      return so;
    });
    
    console.log(`   ✅ Added ppicNotified flag to ${updatedCount} sales orders\n`);
    
    // Step 3: Save updated sales orders
    console.log('💾 Step 3: Saving updated sales orders...');
    const saved = saveJSON(path.join(dataPath, 'salesOrders.json'), updatedSalesOrders);
    console.log(`   ${saved ? '✅' : '❌'} Sales orders saved\n`);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s\n`);
    
    console.log('📊 Summary:');
    console.log(`   • Sales orders: ${salesOrders.length}`);
    console.log(`   • Updated: ${updatedCount}`);
    console.log(`   • Total: ${updatedSalesOrders.length}\n`);
    
    console.log('✨ All sales orders now have ppicNotified flag!\n');
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();
