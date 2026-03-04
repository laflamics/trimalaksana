/**
 * Import Surat Jalan data to PostgreSQL
 * Usage: node scripts/import-surat-jalan-to-postgres.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://server-tljp.tail75a421.ts.net:9999';
const DATA_FILE = path.join(__dirname, 'master/trucking/trucking_suratJalan.json');

async function importSuratJalanData() {
  try {
    console.log('[Import] 📖 Reading Surat Jalan data from:', DATA_FILE);
    
    // Read JSON file
    if (!fs.existsSync(DATA_FILE)) {
      console.error('[Import] ❌ File not found:', DATA_FILE);
      process.exit(1);
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const suratJalanData = JSON.parse(rawData);

    if (!Array.isArray(suratJalanData)) {
      console.error('[Import] ❌ Data is not an array');
      process.exit(1);
    }

    console.log(`[Import] ✅ Loaded ${suratJalanData.length} Surat Jalan records`);

    // Wrap data in value field for PostgreSQL storage
    const wrappedData = {
      value: suratJalanData,
    };

    // Send to server
    console.log('[Import] 📤 Uploading to server...');
    
    const response = await axios.post(
      `${SERVER_URL}/api/storage/trucking_suratJalan`,
      wrappedData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('[Import] ✅ Upload successful');
    console.log('[Import] Response:', response.data);

    // Verify import
    console.log('[Import] 🔍 Verifying import...');
    
    const verifyResponse = await axios.get(
      `${SERVER_URL}/api/storage/trucking_suratJalan`,
      { timeout: 30000 }
    );

    const importedCount = Array.isArray(verifyResponse.data) 
      ? verifyResponse.data.length 
      : (verifyResponse.data?.value ? verifyResponse.data.value.length : 0);

    console.log(`[Import] ✅ Verification complete: ${importedCount} records in database`);
    console.log('[Import] ✨ Import completed successfully!');

  } catch (error) {
    console.error('[Import] ❌ Error:', error.message);
    if (error.response) {
      console.error('[Import] Response status:', error.response.status);
      console.error('[Import] Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run import
importSuratJalanData();
