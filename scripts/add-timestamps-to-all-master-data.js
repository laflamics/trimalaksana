#!/usr/bin/env node

/**
 * Add timestamps to all master data for proper sync tracking
 * This ensures all data can be properly synced and merged
 */

const fs = require('fs');
const path = require('path');

console.log('⏰ [ADD TIMESTAMPS TO ALL MASTER DATA]\n');

const masterDataKeys = [
  'products', 'materials', 'customers', 'suppliers', 'bom',
  'inventory', 'accounts', 'staff'
];

const basePaths = [
  path.join(__dirname, '../data/localStorage/Packaging'),
  path.join(__dirname, '../docker/data/localStorage/packaging'),
];

let totalUpdated = 0;
const now = new Date().toISOString();

basePaths.forEach(basePath => {
  console.log(`\n📁 Processing: ${basePath}`);
  console.log('=' .repeat(60));
  
  masterDataKeys.forEach(key => {
    const filePath = path.join(basePath, `${key}.json`);
    
    if (!fs.existsSync(filePath)) {
      return; // Skip if not found
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items = data.value || data;
      
      if (!Array.isArray(items)) {
        console.log(`  ⏭️  ${key}: not an array`);
        return;
      }
      
      let needsUpdate = false;
      const itemsWithoutTimestamp = items.filter(item => !item.created).length;
      
      if (itemsWithoutTimestamp === 0) {
        console.log(`  ✓ ${key}: all ${items.length} items have timestamps`);
        return;
      }
      
      const updatedItems = items.map(item => {
        if (!item.created) {
          needsUpdate = true;
          return {
            ...item,
            created: now,
            updated: now,
            _timestamp: Date.now()
          };
        }
        return item;
      });
      
      if (needsUpdate) {
        const output = {
          value: updatedItems,
          timestamp: Date.now(),
          _timestamp: Date.now()
        };
        
        fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
        console.log(`  ✓ ${key}: added timestamps to ${itemsWithoutTimestamp}/${items.length} items`);
        totalUpdated++;
      }
    } catch (e) {
      console.log(`  ✗ ${key}: ${e.message}`);
    }
  });
});

console.log(`\n${'=' .repeat(60)}`);
console.log(`✅ Complete - Updated ${totalUpdated} files\n`);
