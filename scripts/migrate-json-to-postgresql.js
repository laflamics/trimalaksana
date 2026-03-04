#!/usr/bin/env node

/**
 * Migration Script: JSON Files → PostgreSQL
 * 
 * Imports all data from JSON files to PostgreSQL database
 * Handles all three modules: Packaging, General Trading, Trucking
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'trimalaksana',
  password: process.env.DB_PASSWORD || 'trimalaksana123',
  database: process.env.DB_NAME || 'trimalaksana_db',
};

const DATA_DIR = path.join(__dirname, '../data/localStorage');

// Initialize database pool
const pool = new Pool(DB_CONFIG);

// Mapping of JSON keys to database tables
const KEY_TO_TABLE_MAPPING = {
  // Packaging
  'products': { table: 'packaging_products', type: 'products' },
  'customers': { table: 'packaging_customers', type: 'customers' },
  'suppliers': { table: 'packaging_suppliers', type: 'suppliers' },
  'salesOrders': { table: 'packaging_sales_orders', type: 'sales_orders' },
  'invoices': { table: 'packaging_invoices', type: 'invoices' },
  'delivery': { table: 'packaging_delivery_notes', type: 'delivery_notes' },
  'journalEntries': { table: 'packaging_journal_entries', type: 'journal_entries' },
  
  // General Trading
  'gt_products': { table: 'gt_products', type: 'gt_products' },
  'gt_customers': { table: 'gt_customers', type: 'gt_customers' },
  
  // Trucking
  'trucking_shipments': { table: 'trucking_shipments', type: 'trucking_shipments' },
};

// Data transformers
const TRANSFORMERS = {
  products: (item) => ({
    kode: item.code || item.kode || '',
    nama: item.name || item.nama || '',
    deskripsi: item.description || item.deskripsi || '',
    kategori: item.category || item.kategori || '',
    satuan: item.unit || item.satuan || '',
    harga: parseFloat(item.price || item.harga || 0),
    stok: parseInt(item.stock || item.stok || 0),
    pad_code: item.padCode || item.pad_code || '',
  }),
  
  customers: (item) => ({
    kode: item.code || item.kode || '',
    nama: item.name || item.nama || '',
    email: item.email || '',
    telepon: item.phone || item.telepon || '',
    alamat: item.address || item.alamat || '',
    kota: item.city || item.kota || '',
    provinsi: item.province || item.provinsi || '',
    kode_pos: item.postalCode || item.kode_pos || '',
    negara: item.country || item.negara || 'Indonesia',
    npwp: item.taxId || item.npwp || '',
  }),
  
  suppliers: (item) => ({
    kode: item.code || item.kode || '',
    nama: item.name || item.nama || '',
    email: item.email || '',
    telepon: item.phone || item.telepon || '',
    alamat: item.address || item.alamat || '',
    kota: item.city || item.kota || '',
    provinsi: item.province || item.provinsi || '',
  }),
  
  sales_orders: (item) => ({
    so_no: item.soNo || item.so_no || '',
    customer_id: null, // Will be linked later
    tgl_order: item.orderDate || item.tgl_order || new Date().toISOString().split('T')[0],
    tgl_kirim: item.deliveryDate || item.tgl_kirim || null,
    status: item.status || 'DRAFT',
    total: parseFloat(item.total || 0),
    catatan: item.notes || item.catatan || '',
  }),
  
  invoices: (item) => ({
    no_invoice: item.invoiceNo || item.no_invoice || '',
    so_id: null, // Will be linked later
    customer_id: null, // Will be linked later
    tgl_invoice: item.invoiceDate || item.tgl_invoice || new Date().toISOString().split('T')[0],
    tgl_jatuh_tempo: item.dueDate || item.tgl_jatuh_tempo || null,
    total: parseFloat(item.total || item.bom?.total || 0),
    pajak: parseFloat(item.tax || item.pajak || 0),
    status: item.status || 'DRAFT',
    tgl_bayar: item.paidAt || null,
  }),
  
  delivery_notes: (item) => ({
    no_sj: item.sjNo || item.no_sj || '',
    so_id: null, // Will be linked later
    customer_id: null, // Will be linked later
    tgl_kirim: item.deliveryDate || item.tgl_kirim || new Date().toISOString().split('T')[0],
    driver: item.driver || '',
    no_kendaraan: item.vehicleNo || item.no_kendaraan || '',
    status: item.status || 'DRAFT',
    signed_document_id: item.fileId || null,
  }),
  
  journal_entries: (item) => ({
    tgl_entry: item.entryDate || item.tgl_entry || new Date().toISOString().split('T')[0],
    referensi: item.reference || item.referensi || '',
    kode_akun: item.account || item.kode_akun || '',
    nama_akun: item.accountName || item.nama_akun || '',
    debit: parseFloat(item.debit || 0),
    kredit: parseFloat(item.credit || item.kredit || 0),
    deskripsi: item.description || item.deskripsi || '',
  }),
  
  gt_products: (item) => ({
    kode: item.code || item.kode || '',
    nama: item.name || item.nama || '',
    kategori: item.category || item.kategori || '',
    satuan: item.unit || item.satuan || '',
    harga: parseFloat(item.price || item.harga || 0),
    stok: parseInt(item.stock || item.stok || 0),
  }),
  
  gt_customers: (item) => ({
    kode: item.code || item.kode || '',
    nama: item.name || item.nama || '',
    email: item.email || '',
    telepon: item.phone || item.telepon || '',
  }),
  
  trucking_shipments: (item) => ({
    no_shipment: item.shipmentNo || item.no_shipment || '',
    asal: item.origin || item.asal || '',
    tujuan: item.destination || item.tujuan || '',
    status: item.status || 'DRAFT',
  }),
};

// Main migration function
async function migrate() {
  console.log('\n========================================');
  console.log('🚀 Starting JSON → PostgreSQL Migration');
  console.log('========================================\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful\n');

    // Read all JSON files
    console.log('📂 Reading JSON files from:', DATA_DIR);
    const files = await readJsonFiles(DATA_DIR);
    console.log(`✅ Found ${Object.keys(files).length} JSON files\n`);

    // Migrate each file
    let totalRecords = 0;
    for (const [key, data] of Object.entries(files)) {
      const mapping = KEY_TO_TABLE_MAPPING[key];
      if (!mapping) {
        console.log(`⏭️  Skipping ${key} (no mapping)`);
        continue;
      }

      const count = await migrateData(key, data, mapping);
      totalRecords += count;
    }

    console.log('\n========================================');
    console.log(`✅ Migration completed!`);
    console.log(`📊 Total records migrated: ${totalRecords}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Read all JSON files recursively
async function readJsonFiles(dir, prefix = '') {
  const files = {};
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively read subdirectories
        const subFiles = await readJsonFiles(fullPath, `${prefix}${entry.name}/`);
        Object.assign(files, subFiles);
      } else if (entry.name.endsWith('.json')) {
        const key = entry.name.replace('.json', '');
        const fullKey = prefix ? `${prefix}${key}` : key;
        
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          let data = JSON.parse(content);
          
          // Handle wrapped data
          if (data && typeof data === 'object' && data.value !== undefined) {
            data = data.value;
          }
          
          files[key] = Array.isArray(data) ? data : [data];
        } catch (error) {
          console.warn(`⚠️  Error reading ${fullPath}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

// Migrate data for a specific key
async function migrateData(key, data, mapping) {
  const { table, type } = mapping;
  const transformer = TRANSFORMERS[type];
  
  if (!transformer) {
    console.log(`⏭️  Skipping ${key} (no transformer)`);
    return 0;
  }

  console.log(`\n📥 Migrating ${key} → ${table}`);
  
  if (!Array.isArray(data)) {
    data = [data];
  }

  let successCount = 0;
  let errorCount = 0;

  for (const item of data) {
    try {
      const transformed = transformer(item);
      
      // Build INSERT query
      const columns = Object.keys(transformed);
      const values = Object.values(transformed);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      await pool.query(query, values);
      successCount++;
    } catch (error) {
      errorCount++;
      console.warn(`  ⚠️  Error inserting record:`, error.message);
    }
  }

  console.log(`  ✅ ${successCount} records inserted`);
  if (errorCount > 0) {
    console.log(`  ⚠️  ${errorCount} records failed`);
  }

  return successCount;
}

// Run migration
migrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
