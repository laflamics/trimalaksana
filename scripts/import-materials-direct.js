/**
 * Import Materials directly to PostgreSQL
 * 
 * Reads materials.json and inserts directly to PostgreSQL
 * No API required
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function importMaterialsToPostgres() {
  console.log('📥 Importing Materials to PostgreSQL\n');

  // Database config
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'trimalaksana',
  };

  console.log(`🔗 Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const pool = new Pool(dbConfig);

  try {
    // Read materials.json
    const materialsPath = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/materials.json';
    console.log(`📖 Reading: ${materialsPath}`);
    
    if (!fs.existsSync(materialsPath)) {
      throw new Error(`File not found: ${materialsPath}`);
    }

    const fileContent = fs.readFileSync(materialsPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    const materials = data.value || data;
    console.log(`✅ Loaded ${materials.length} materials\n`);

    // Connect to database
    const client = await pool.connect();

    try {
      // Insert into storage_data table
      console.log('📤 Inserting into PostgreSQL...');
      
      const query = `
        INSERT INTO storage_data (key, value, updated_at, deleted_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, NULL)
        ON CONFLICT (key) DO UPDATE SET
          value = $2,
          updated_at = CURRENT_TIMESTAMP,
          deleted_at = NULL
        RETURNING key, jsonb_array_length(value) as count;
      `;

      const result = await client.query(query, ['materials', JSON.stringify(materials)]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log(`✅ Successfully imported ${row.count} materials to PostgreSQL`);
        console.log(`   Key: ${row.key}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        console.log('\n✨ Import complete!');
      }
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importMaterialsToPostgres();
