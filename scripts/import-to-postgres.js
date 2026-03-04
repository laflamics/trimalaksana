/**
 * Import Sales Orders, Delivery Notes, Invoices, and Products to PostgreSQL
 * 
 * Reads JSON files from import-output and imports to PostgreSQL via API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function importToPostgres() {
  console.log('📥 Importing Data to PostgreSQL\n');

  try {
    const outputDir = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/import-output';
    const apiUrl = process.env.API_URL || 'http://localhost:8080';

    // Define imports: file -> storage key
    const imports = [
      {
        file: 'products.json',
        key: 'general-trading/gt_products',
        label: 'Products',
      },
      {
        file: 'salesOrders.json',
        key: 'general-trading/gt_salesOrders',
        label: 'Sales Orders',
      },
      {
        file: 'deliveryNotes.json',
        key: 'general-trading/gt_delivery',
        label: 'Delivery Notes',
      },
      {
        file: 'invoices.json',
        key: 'general-trading/gt_invoices',
        label: 'Invoices',
      },
    ];

    console.log(`🔗 API URL: ${apiUrl}\n`);

    let totalImported = 0;

    // Import each file
    for (const importConfig of imports) {
      const filePath = path.join(outputDir, importConfig.file);
      
      console.log(`📖 Reading: ${importConfig.label} (${importConfig.file})`);
      
      if (!fs.existsSync(filePath)) {
        console.error(`   ❌ File not found: ${filePath}`);
        continue;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      const items = Array.isArray(data) ? data : (data.value || []);
      console.log(`   ✅ Loaded ${items.length} items`);

      // Send to API
      console.log(`   📤 Sending to PostgreSQL (key: ${importConfig.key})...`);
      
      try {
        const response = await axios.post(
          `${apiUrl}/api/storage/${importConfig.key}`,
          { value: items },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
          }
        );

        if (response.data.success) {
          console.log(`   ✅ Successfully imported ${items.length} ${importConfig.label}`);
          console.log(`      Timestamp: ${new Date(response.data.data.timestamp * 1000).toISOString()}`);
          totalImported += items.length;
        } else {
          console.error(`   ❌ API returned error: ${response.data.error}`);
        }
      } catch (error) {
        console.error(`   ❌ Error importing ${importConfig.label}:`, error.message);
        if (error.response) {
          console.error(`      Response: ${JSON.stringify(error.response.data)}`);
        }
      }

      console.log('');
    }

    console.log(`\n✨ Import complete!`);
    console.log(`📊 Total items imported: ${totalImported}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importToPostgres();
