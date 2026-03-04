#!/usr/bin/env node

/**
 * Import remaining packaging data (delivery notes and invoices)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const serverUrl = 'http://100.81.50.37:9999';

const imports = [
  {
    file: 'public/import-output/deliveryNotes.json',
    key: 'packaging/pkg_delivery',
    label: 'Delivery Notes'
  },
  {
    file: 'public/import-output/invoices.json',
    key: 'packaging/pkg_invoices',
    label: 'Invoices'
  }
];

async function importData() {
  let successCount = 0;
  let failCount = 0;

  for (const importConfig of imports) {
    try {
      const fullPath = path.resolve(importConfig.file);
      
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ File not found: ${fullPath}`);
        failCount++;
        continue;
      }

      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(fileContent);

      if (!Array.isArray(data)) {
        console.error(`❌ ${importConfig.label}: JSON must be an array`);
        failCount++;
        continue;
      }

      console.log(`\n📥 Importing ${importConfig.label}...`);
      console.log(`   File: ${importConfig.file}`);
      console.log(`   Items: ${data.length}`);
      console.log(`   Key: ${importConfig.key}`);

      const response = await axios.post(
        `${serverUrl}/api/storage/${encodeURIComponent(importConfig.key)}`,
        { value: data },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        console.log(`✅ Successfully imported ${data.length} ${importConfig.label}`);
        successCount++;
      } else {
        console.error(`❌ Import failed:`, response.data.error);
        failCount++;
      }
    } catch (error) {
      console.error(`❌ Error importing ${importConfig.label}:`, error.message);
      if (error.response?.data) {
        console.error('   Server response:', error.response.data);
      }
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Import Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`${'='.repeat(50)}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

importData();
