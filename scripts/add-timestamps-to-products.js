#!/usr/bin/env node

/**
 * Add timestamps to products for proper sync tracking
 * This ensures products can be properly synced and merged
 */

const fs = require('fs');
const path = require('path');

console.log('⏰ [ADD TIMESTAMPS TO PRODUCTS]\n');

const paths = [
  path.join(__dirname, '../data/localStorage/Packaging/products.json'),
  path.join(__dirname, '../docker/data/localStorage/packaging/products.json'),
];

let updated = 0;
const now = new Date().toISOString();

paths.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping (not found): ${filePath}`);
    return;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const products = data.value || data;
    
    if (!Array.isArray(products)) {
      console.log(`⏭️  Skipping (not array): ${filePath}`);
      return;
    }
    
    let needsUpdate = false;
    const updatedProducts = products.map(p => {
      if (!p.created) {
        needsUpdate = true;
        return {
          ...p,
          created: now,
          updated: now,
          _timestamp: Date.now()
        };
      }
      return p;
    });
    
    if (needsUpdate) {
      const output = {
        value: updatedProducts,
        timestamp: Date.now(),
        _timestamp: Date.now()
      };
      
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
      console.log(`✓ Updated: ${filePath}`);
      console.log(`  Added timestamps to ${updatedProducts.filter(p => p.created === now).length} products`);
      updated++;
    } else {
      console.log(`✓ Already has timestamps: ${filePath}`);
    }
  } catch (e) {
    console.log(`✗ Error processing ${filePath}: ${e.message}`);
  }
});

console.log(`\n✅ Complete - Updated ${updated} files\n`);
