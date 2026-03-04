#!/usr/bin/env node

/**
 * Clear localStorage quota untuk fix "exceeded quota" error
 * Hapus data besar yang ga perlu, keep yang penting
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'localStorage');

// Keys yang bisa di-clear (data besar yang bisa di-rebuild dari server)
const keysToClean = [
  'products.json',           // Besar, bisa di-fetch dari server
  'delivery.json',           // Besar, bisa di-fetch dari server
  'salesOrders.json',        // Besar, bisa di-fetch dari server
  'inventory.json',          // Besar, bisa di-fetch dari server
  'purchaseOrders.json',     // Besar, bisa di-fetch dari server
  'activityLogs.json',       // Besar, bisa di-fetch dari server
];

// Subdirectories
const subdirs = [
  'general-trading',
  'trucking',
  'Packaging'
];

console.log('🧹 Clearing localStorage quota...\n');

let totalFreed = 0;
let filesCleared = 0;

// Clear root localStorage files
for (const file of keysToClean) {
  const filePath = path.join(DATA_DIR, file);
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      // Replace dengan empty array
      fs.writeFileSync(filePath, '[]', 'utf8');
      
      totalFreed += stats.size;
      filesCleared++;
      
      console.log(`✅ Cleared ${file} (freed ${sizeMB}MB)`);
    } catch (error) {
      console.log(`⚠️ Failed to clear ${file}: ${error.message}`);
    }
  }
}

// Clear subdirectory files
for (const subdir of subdirs) {
  const subdirPath = path.join(DATA_DIR, subdir);
  if (fs.existsSync(subdirPath)) {
    try {
      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(subdirPath, file);
          try {
            const stats = fs.statSync(filePath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            
            // Replace dengan empty array
            fs.writeFileSync(filePath, '[]', 'utf8');
            
            totalFreed += stats.size;
            filesCleared++;
            
            console.log(`✅ Cleared ${subdir}/${file} (freed ${sizeMB}MB)`);
          } catch (error) {
            console.log(`⚠️ Failed to clear ${subdir}/${file}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Failed to read ${subdir}: ${error.message}`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Files cleared: ${filesCleared}`);
console.log(`📊 Space freed: ${(totalFreed / 1024 / 1024).toFixed(2)}MB`);
console.log('\n✅ localStorage quota cleared!');
console.log('💡 Data akan di-fetch dari server saat app di-reload');
