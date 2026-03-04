#!/usr/bin/env node

/**
 * Clear PPIC Notifications
 * 
 * Clears all PPIC notifications and marks all SOs as ppicNotified
 * since they've already reached invoice stage
 * 
 * Usage: node scripts/clear-ppic-notifications.js
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
  console.log('🗑️  Clear PPIC Notifications');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const dataPath = path.join(__dirname, '../data/localStorage');
    
    // Step 1: Load sales orders
    console.log('📂 Step 1: Loading sales orders...');
    const salesOrders = loadJSON(path.join(dataPath, 'salesOrders.json'));
    console.log(`   ✅ Loaded ${salesOrders.length} sales orders\n`);
    
    // Step 2: Mark all SOs as ppicNotified
    console.log('✍️  Step 2: Marking all SOs as ppicNotified...\n');
    
    const now = new Date().toISOString();
    const updatedSalesOrders = salesOrders.map((so) => ({
      ...so,
      ppicNotified: true,
      ppicNotifiedAt: so.ppicNotifiedAt || now,
      ppicNotifiedBy: so.ppicNotifiedBy || 'SYSTEM'
    }));
    
    console.log(`   ✅ Marked ${updatedSalesOrders.length} SOs as ppicNotified\n`);
    
    // Step 3: Clear all notification databases
    console.log('🗑️  Step 3: Clearing notification databases...\n');
    
    const notificationKeys = [
      'productionNotifications',
      'deliveryNotifications',
      'invoiceNotifications',
      'financeNotifications'
    ];
    
    const cleared = {};
    for (const key of notificationKeys) {
      cleared[key] = saveJSON(path.join(dataPath, `${key}.json`), []);
      console.log(`   ${cleared[key] ? '✅' : '❌'} ${key} cleared`);
    }
    
    console.log();
    
    // Step 4: Save updated sales orders
    console.log('💾 Step 4: Saving updated sales orders...');
    const saved = saveJSON(path.join(dataPath, 'salesOrders.json'), updatedSalesOrders);
    console.log(`   ${saved ? '✅' : '❌'} Sales orders saved\n`);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s\n`);
    
    console.log('📊 Summary:');
    console.log(`   • Sales orders marked as ppicNotified: ${updatedSalesOrders.length}`);
    console.log(`   • Notification databases cleared: ${Object.values(cleared).filter(v => v).length}/${notificationKeys.length}\n`);
    
    console.log('✨ All PPIC notifications have been cleared!\n');
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();
