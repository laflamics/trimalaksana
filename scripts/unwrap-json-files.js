#!/usr/bin/env node

/**
 * Unwrap JSON files that are wrapped in {"value": [...]} structure
 * Converts them to plain arrays for import
 */

const fs = require('fs');
const path = require('path');

const files = [
  'public/import-output/purchaseOrders.json',
  'public/import-output/payments.json'
];

files.forEach(filePath => {
  try {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${fullPath}`);
      return;
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Check if wrapped in {"value": [...]}
    if (data.value && Array.isArray(data.value)) {
      console.log(`📦 Unwrapping ${filePath}...`);
      console.log(`   Found ${data.value.length} items`);
      
      // Write unwrapped array
      fs.writeFileSync(fullPath, JSON.stringify(data.value, null, 2));
      console.log(`✅ Successfully unwrapped ${filePath}`);
    } else if (Array.isArray(data)) {
      console.log(`✓ ${filePath} is already a plain array (${data.length} items)`);
    } else {
      console.log(`⚠️  ${filePath} has unexpected structure`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n✅ Done! Files are ready for import.');
