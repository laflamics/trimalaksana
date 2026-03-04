#!/usr/bin/env node

/**
 * Add Missing Products from CSV to Master Products
 * 
 * This script reads the packaging_master.csv and adds any missing products
 * to the products master list.
 * 
 * Usage: node scripts/add-missing-products.js
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
const generateId = (prefix = '') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
};

/**
 * Load JSON file and ensure it returns an array
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${filePath} - using empty array`);
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Handle wrapped storage format: { value: [...] }
    if (parsed && typeof parsed === 'object' && 'value' in parsed && Array.isArray(parsed.value)) {
      return parsed.value;
    }
    
    // Handle direct array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    console.log(`   ⚠️  Unexpected format in ${filePath} - using empty array`);
    return [];
  } catch (error) {
    console.error(`   ❌ Error loading ${filePath}:`, error.message);
    return [];
  }
};

/**
 * Save JSON file
/**
 * Save JSON file with wrapped format {value: [...], timestamp: ...}
 * This matches the storage service format for proper sync
 */
const saveJSON = (filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Wrap data in storage format: {value: [...], timestamp: ..., _timestamp: ...}
    const wrappedData = {
      value: Array.isArray(data) ? data : [data],
      timestamp: Date.now(),
      _timestamp: Date.now()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(wrappedData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
    return false;
  }
};

/**
 * Read CSV file
 */
const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

const addMissingProducts = async () => {
  console.log('🚀 Starting Add Missing Products...\n');
  
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // STEP 1: Read CSV Data
    // ========================================================================
    console.log('📄 Step 1: Reading CSV file...');
    const csvPath = path.join(__dirname, '../data/raw/master/packaging_master.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const csvData = await readCSV(csvPath);
    console.log(`   ✅ Read ${csvData.length} rows from CSV\n`);
    
    // ========================================================================
    // STEP 2: Extract Unique Products from CSV
    // ========================================================================
    console.log('📦 Step 2: Extracting unique products from CSV...');
    
    const csvProductMap = {};
    
    csvData.forEach(row => {
      const code = row['Kode Item'];
      const name = row['Nama Item'];
      
      if (code && name && !csvProductMap[code]) {
        csvProductMap[code] = {
          kode: code,
          nama: name,
          product_id: code, // Use code as product_id
          sku: code,
          codeItem: code
        };
      }
    });
    
    console.log(`   ✅ Found ${Object.keys(csvProductMap).length} unique products in CSV\n`);
    
    // ========================================================================
    // STEP 3: Load Existing Products
    // ========================================================================
    console.log('📚 Step 3: Loading existing products...');
    
    const dataPath = path.join(__dirname, '../data/localStorage');
    const existingProducts = loadJSON(path.join(dataPath, 'products.json'));
    
    console.log(`   ✅ Loaded ${Array.isArray(existingProducts) ? existingProducts.length : 0} existing products\n`);
    
    // ========================================================================
    // STEP 4: Find Missing Products
    // ========================================================================
    console.log('🔍 Step 4: Finding missing products...');
    
    const existingProductsArray = Array.isArray(existingProducts) ? existingProducts : [];
    const missingProducts = [];
    
    for (const [code, csvProduct] of Object.entries(csvProductMap)) {
      const exists = existingProductsArray.find(p => 
        p.kode === code || 
        p.product_id === code ||
        p.sku === code ||
        p.codeItem === code
      );
      
      if (!exists) {
        missingProducts.push({
          id: generateId('prod'),
          kode: code,
          product_id: code,
          sku: code,
          codeItem: code,
          nama: csvProduct.nama,
          description: csvProduct.nama,
          name: csvProduct.nama,
          category: 'packaging',
          unit: 'PCS',
          isHistoricalData: true,
          importedAt: new Date().toISOString(),
          importSource: 'packaging_master.csv',
          timestamp: Date.now(),
          _timestamp: Date.now()
        });
      }
    }
    
    console.log(`   ✅ Found ${missingProducts.length} missing products\n`);
    
    if (missingProducts.length > 0) {
      console.log('📋 Missing products:');
      missingProducts.slice(0, 10).forEach(p => {
        console.log(`   - ${p.kode}: ${p.nama}`);
      });
      if (missingProducts.length > 10) {
        console.log(`   ... and ${missingProducts.length - 10} more`);
      }
      console.log('');
    }
    
    // ========================================================================
    // STEP 5: Add Missing Products
    // ========================================================================
    console.log('➕ Step 5: Adding missing products...');
    
    const allProducts = [...existingProductsArray, ...missingProducts];
    
    const saved = saveJSON(path.join(dataPath, 'products.json'), allProducts);
    
    console.log(`   ${saved ? '✅' : '❌'} Products saved\n`);
    
    // ========================================================================
    // STEP 6: Summary
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • CSV Products:      ${Object.keys(csvProductMap).length}`);
    console.log(`   • Existing Products: ${existingProductsArray.length}`);
    console.log(`   • Missing Products:  ${missingProducts.length}`);
    console.log(`   • Total Products:    ${allProducts.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return {
      success: true,
      summary: {
        csvProducts: Object.keys(csvProductMap).length,
        existingProducts: existingProductsArray.length,
        missingProducts: missingProducts.length,
        totalProducts: allProducts.length,
        duration: duration
      }
    };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  addMissingProducts()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { addMissingProducts };
