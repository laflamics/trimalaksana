/**
 * Import Materials to PostgreSQL
 * 
 * Reads materials.json and imports to PostgreSQL via API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function importMaterialsToPostgres() {
  console.log('📥 Importing Materials to PostgreSQL\n');

  try {
    // Read materials.json
    const materialsPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/materials.json';
    console.log(`📖 Reading: ${materialsPath}`);
    
    const fileContent = fs.readFileSync(materialsPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    const materials = data.value || data;
    console.log(`✅ Loaded ${materials.length} materials\n`);

    // API endpoint
    const apiUrl = process.env.API_URL || 'http://localhost:8080';
    const storageKey = 'materials'; // Packaging materials key

    console.log(`🔗 API URL: ${apiUrl}`);
    console.log(`📝 Storage Key: ${storageKey}\n`);

    // Send to API
    console.log('📤 Sending to PostgreSQL...');
    const response = await axios.post(
      `${apiUrl}/api/storage/${storageKey}`,
      { value: materials },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    if (response.data.success) {
      console.log(`✅ Successfully imported ${materials.length} materials to PostgreSQL`);
      console.log(`   Key: ${storageKey}`);
      console.log(`   Timestamp: ${new Date(response.data.data.timestamp * 1000).toISOString()}`);
      console.log('\n✨ Import complete!');
    } else {
      console.error('❌ API returned error:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

importMaterialsToPostgres();
