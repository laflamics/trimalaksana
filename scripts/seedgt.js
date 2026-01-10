const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '../data');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

// Helper function to generate ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper to load existing data
async function loadExistingData(key) {
  try {
    // Try to load from data/ root first (gt_*.json files)
    const rootPath = path.join(DATA_DIR, `${key}.json`);
    if (await fileExists(rootPath)) {
      const content = await fs.readFile(rootPath, 'utf8');
      return JSON.parse(content);
    }
    // Try to load from local JSON file (with gt_ prefix in localStorage/general-trading)
    const jsonPath = path.join(DATA_DIR, 'localStorage', `general-trading`, `${key}.json`);
    if (await fileExists(jsonPath)) {
      const content = await fs.readFile(jsonPath, 'utf8');
      return JSON.parse(content);
    }
    // Fallback: try without general-trading folder
    const jsonPath2 = path.join(DATA_DIR, 'localStorage', `${key}.json`);
    if (await fileExists(jsonPath2)) {
      const content = await fs.readFile(jsonPath2, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Ignore
  }
  return null;
}

// Save to storage (local or server) with gt_ prefix
async function saveToStorage(key, data) {
  const gtKey = `gt_${key}`;
  
  try {
    // Try to save to server first
    // IMPORTANT: Include timestamp to ensure this data is always newer than existing server data
    const currentTimestamp = Date.now();
    try {
      await axios.post(`${SERVER_URL}/api/storage/${gtKey}`, { 
        value: data,
        timestamp: currentTimestamp,
        _timestamp: currentTimestamp,
      }, {
        timeout: 5000,
      });
      console.log(`✓ Saved ${gtKey} to server (${data.length} records) with timestamp ${currentTimestamp}`);
      return;
    } catch (serverError) {
      // If server not available, fallback to local
      if (serverError.code === 'ECONNREFUSED' || serverError.code === 'ERR_NETWORK') {
        console.log(`Server not available, saving ${gtKey} to local file...`);
      } else {
        throw serverError;
      }
    }
  } catch (error) {
    console.error(`Error saving ${gtKey} to server:`, error.message);
  }
  
  // Fallback to local JSON file - save to multiple locations to ensure consistency
  try {
    // Save to data/localStorage/general-trading/gt_products.json (primary location)
    // IMPORTANT: Save with wrapper format {value, timestamp} for compatibility with storage service
    const localStorageDir = path.join(DATA_DIR, 'localStorage', 'general-trading');
    await fs.mkdir(localStorageDir, { recursive: true });
    const localPath = path.join(localStorageDir, `${gtKey}.json`);
    const currentTimestamp = Date.now();
    const wrappedData = {
      value: data,
      timestamp: currentTimestamp,
      _timestamp: currentTimestamp,
    };
    await fs.writeFile(localPath, JSON.stringify(wrappedData, null, 2));
    console.log(`✓ Saved ${gtKey} to local file (${data.length} records) with timestamp ${currentTimestamp}`);
    
    // Also save to data/gt_products.json (without gt_ prefix, for backward compatibility)
    // This is where loadExistingData checks first - save as direct array (no wrapper)
    if (key === 'products') {
      const rootPath = path.join(DATA_DIR, 'gt_products.json');
      await fs.writeFile(rootPath, JSON.stringify(data, null, 2));
      console.log(`✓ Also saved to ${rootPath} for compatibility`);
    }
  } catch (localError) {
    console.error(`Error saving ${gtKey} to local file:`, localError.message);
  }
}

// Seed Products from master_item_produk_GT.xlsx
async function seedGTProducts() {
  console.log('Seeding GT Products from master_item_produk_GT.xlsx...');
  const filePath = path.join(DATA_DIR, 'master_item_produk_GT.xlsx');
  
  if (!await fileExists(filePath)) {
    console.log('master_item_produk_GT.xlsx not found, skipping...');
    return [];
  }

  // Load existing products to check duplicates
  let existingProducts = [];
  try {
    const existingData = await loadExistingData('gt_products');
    existingProducts = Array.isArray(existingData) ? existingData : [];
    console.log(`Found ${existingProducts.length} existing GT products`);
  } catch (error) {
    console.log('No existing GT products found, starting fresh');
  }

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const sheet = workbook.Sheets[sheetNames[0]]; // Use first sheet
  
  // Read as array to find header row
  const rows = XLSX.utils.sheet_to_json(sheet, { 
    header: 1,
    defval: ''
  });
  
  // Find header row - try multiple patterns
  let headerRowIndex = -1;
  let headerMap = {};
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowStr = row.join('|').toLowerCase();
      // Check for various header patterns
      const hasCode = rowStr.includes('code') || rowStr.includes('kode');
      const hasName = rowStr.includes('name') || rowStr.includes('nama') || rowStr.includes('item');
      
      if (hasCode && hasName) {
        headerRowIndex = i;
        // Map column indices - try multiple patterns
        headerMap = {
          kode: row.findIndex(c => c && (
            c.toString().toLowerCase().includes('code') || 
            c.toString().toLowerCase().includes('kode') || 
            c.toString().toLowerCase().includes('id')
          )),
          nama: row.findIndex(c => c && (
            c.toString().toLowerCase().includes('name') || 
            c.toString().toLowerCase().includes('nama') ||
            c.toString().toLowerCase().includes('item')
          )),
          satuan: row.findIndex(c => c && (
            c.toString().toLowerCase().includes('satuan') || 
            c.toString().toLowerCase().includes('unit')
          )),
          harga: row.findIndex(c => c && (
            c.toString().toLowerCase().includes('harga') || 
            c.toString().toLowerCase().includes('price')
          )),
          hargaSales: row.findIndex(c => c && (
            c.toString().toLowerCase().includes('harga sales') || 
            c.toString().toLowerCase().includes('sales price')
          )),
          kategori: row.findIndex(c => c && (
            c.toString().toLowerCase().includes('kategori') || 
            c.toString().toLowerCase().includes('category')
          )),
        };
        break;
      }
    }
  }
  
  if (headerRowIndex >= 0) {
    console.log('Found header at row:', headerRowIndex + 1);
    
    const existingCodes = new Set(
      existingProducts.map(p => 
        (p.product_id || p.kode || '').toString().trim().toUpperCase()
      ).filter(Boolean)
    );
    
    const products = rows
      .slice(headerRowIndex + 1)
      .filter(row => {
        if (!Array.isArray(row)) return false;
        const kode = (row[headerMap.kode] || '').toString().trim();
        const nama = (row[headerMap.nama] || '').toString().trim();
        return kode || nama;
      })
      .map((row, index) => {
        const kode = (row[headerMap.kode] || '').toString().trim();
        const nama = (row[headerMap.nama] || '').toString().trim();
        const satuan = (row[headerMap.satuan] || 'PCS').toString().trim();
        const harga = parseFloat((row[headerMap.harga] || 0).toString().replace(/[^\d.-]/g, '')) || 0;
        const hargaSales = parseFloat((row[headerMap.hargaSales] || row[headerMap.harga] || 0).toString().replace(/[^\d.-]/g, '')) || harga;
        const kategori = (row[headerMap.kategori] || '').toString().trim();
        
        const productId = kode || `GT-PRD-${index + 1}`;
        
        // Skip if already exists
        if (existingCodes.has(productId.toUpperCase())) {
          return null;
        }
        
        return {
          id: generateId(),
          product_id: productId,
          kode: productId,
          nama: nama,
          satuan: satuan || 'PCS',
          harga: harga,
          hargaSales: hargaSales || harga,
          hargaFg: hargaSales || harga,
          kategori: kategori,
          created: new Date().toISOString(),
        };
      })
      .filter(p => p && (p.nama || p.kode));
    
    console.log(`Loaded ${products.length} GT product records`);
    return products;
  } else {
    // Fallback: try default JSON parsing with various column name patterns
    console.log('Using fallback parsing...');
    const jsonRows = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Found ${jsonRows.length} rows in Excel`);
    if (jsonRows.length > 0) {
      console.log('First row keys:', Object.keys(jsonRows[0]));
    }
    
    const existingCodes = new Set(
      existingProducts.map(p => 
        (p.product_id || p.kode || '').toString().trim().toUpperCase()
      ).filter(Boolean)
    );
    
    const products = jsonRows
      .filter(row => {
        // Try multiple column name patterns
        const kode = (
          row['Code 1'] || row['CODE 1'] || row['Code'] || row['CODE'] ||
          row['Kode'] || row['KODE'] || 
          row['__EMPTY'] || ''
        ).toString().trim();
        const nama = (
          row['Item Name'] || row['ITEM NAME'] || row['Item'] || row['ITEM'] ||
          row['Nama'] || row['NAMA'] || row['Name'] || row['NAME'] ||
          row['__EMPTY_1'] || ''
        ).toString().trim();
        return kode || nama;
      })
      .map((row, index) => {
        // Try multiple column name patterns
        const kode = (
          row['Code 1'] || row['CODE 1'] || row['Code'] || row['CODE'] ||
          row['Kode'] || row['KODE'] || 
          row['__EMPTY'] || `GT-PRD-${index + 1}`
        ).toString().trim();
        const nama = (
          row['Item Name'] || row['ITEM NAME'] || row['Item'] || row['ITEM'] ||
          row['Nama'] || row['NAMA'] || row['Name'] || row['NAME'] ||
          row['__EMPTY_1'] || ''
        ).toString().trim();
        const satuan = (
          row['Satuan'] || row['SATUAN'] || row['Unit'] || row['UNIT'] ||
          row['__EMPTY_2'] || 'PCS'
        ).toString().trim();
        const harga = parseFloat((
          row['Harga'] || row['HARGA'] || row['Price'] || row['PRICE'] ||
          row['__EMPTY_3'] || 0
        ).toString().replace(/[^\d.-]/g, '')) || 0;
        const hargaSales = parseFloat((
          row['Harga Sales'] || row['HARGA SALES'] || row['Sales Price'] || row['SALES PRICE'] ||
          row['__EMPTY_4'] || harga
        ).toString().replace(/[^\d.-]/g, '')) || harga;
        const kategori = (
          row['Kategori'] || row['KATEGORI'] || row['Category'] || row['CATEGORY'] ||
          row['__EMPTY_5'] || ''
        ).toString().trim();
        
        // Skip if already exists
        if (kode && existingCodes.has(kode.toUpperCase())) {
          return null;
        }
        
        return {
          id: generateId(),
          product_id: kode,
          kode: kode,
          nama: nama,
          satuan: satuan || 'PCS',
          harga: harga,
          hargaSales: hargaSales || harga,
          hargaFg: hargaSales || harga,
          kategori: kategori,
          created: new Date().toISOString(),
        };
      })
      .filter(p => p && (p.nama || p.kode));
    
    console.log(`Loaded ${products.length} GT product records`);
    return products;
  }
}

// Seed Customers from gt_customers.json or customers.json (filter kategori "Customer")
async function seedGTCustomers() {
  console.log('Seeding GT Customers...');
  
  // Try gt_customers.json first (GT specific file in data/ root)
  let filePath = path.join(DATA_DIR, 'gt_customers.json');
  let useGtFile = await fileExists(filePath);
  
  // Fallback to customers.json if gt_customers.json doesn't exist
  if (!useGtFile) {
    filePath = path.join(DATA_DIR, 'customers.json');
    if (!await fileExists(filePath)) {
      console.log('gt_customers.json and customers.json not found, skipping...');
      return [];
    }
  }

  const content = await fs.readFile(filePath, 'utf8');
  const allCustomers = JSON.parse(content);
  
  // If using gt_customers.json, use directly (no filter needed)
  // If using customers.json, filter only customers (kategori === "Customer")
  const customers = useGtFile 
    ? allCustomers 
    : allCustomers.filter(c => {
        const kategori = (c.kategori || '').toString().toLowerCase();
        return kategori.includes('customer') && !kategori.includes('supplier');
      });
  
  // Map to GT format - REPLACE all, don't filter duplicates
  const gtCustomers = customers.map((c, index) => ({
    id: c.id || generateId(),
    no: c.no || index + 1,
    kode: c.kode || `GT-CUST-${index + 1}`,
    nama: c.nama || '',
    kontak: c.kontak || '',
    picTitle: c.picTitle || '',
    npwp: c.npwp || '',
    email: c.email || '',
    telepon: c.telepon || '',
    alamat: c.alamat || '',
    kategori: c.kategori || 'Customer',
    created: c.created || new Date().toISOString(),
  }));
  
  console.log(`Loaded ${gtCustomers.length} GT customer records (REPLACING existing)`);
  return gtCustomers;
}

// Seed Suppliers from Excel, gt_suppliers.json or suppliers.json (filter kategori "Supplier")
async function seedGTSuppliers() {
  console.log('Seeding GT Suppliers...');
  
  // First, try to convert Excel file if exists (already converted in seedGTCustomers, but check again)
  const excelFile = path.join(DATA_DIR, 'Data Supplier dan Customer GT.xlsx');
  if (await fileExists(excelFile)) {
    try {
      const { convertExcelToJSON } = require('./convert-gt-customer-supplier');
      await convertExcelToJSON();
      console.log('✓ Converted Excel to JSON');
    } catch (error) {
      console.log('⚠️ Error converting Excel, continuing with JSON files...', error.message);
    }
  }
  
  // Try gt_suppliers.json first (GT specific file in data/ root)
  let filePath = path.join(DATA_DIR, 'gt_suppliers.json');
  let useGtFile = await fileExists(filePath);
  
  // Fallback to suppliers.json if gt_suppliers.json doesn't exist
  if (!useGtFile) {
    filePath = path.join(DATA_DIR, 'suppliers.json');
    if (!await fileExists(filePath)) {
      console.log('gt_suppliers.json and suppliers.json not found, skipping...');
      return [];
    }
  }

  const content = await fs.readFile(filePath, 'utf8');
  const allSuppliers = JSON.parse(content);
  
  // If using gt_suppliers.json, use directly (no filter needed)
  // If using suppliers.json, filter only suppliers (kategori === "Supplier")
  const suppliers = useGtFile 
    ? allSuppliers 
    : allSuppliers.filter(s => {
        const kategori = (s.kategori || '').toString().toLowerCase();
        return kategori.includes('supplier');
      });
  
  // Map to GT format - REPLACE all, don't filter duplicates
  const gtSuppliers = suppliers.map((s, index) => ({
    id: s.id || generateId(),
    no: s.no || index + 1,
    kode: s.kode || `GT-SUP-${index + 1}`,
    nama: s.nama || '',
    kontak: s.kontak || '',
    npwp: s.npwp || '',
    email: s.email || '',
    telepon: s.telepon || '',
    alamat: s.alamat || '',
    kategori: s.kategori || 'Supplier',
    created: s.created || new Date().toISOString(),
  }));
  
  console.log(`Loaded ${gtSuppliers.length} GT supplier records (REPLACING existing)`);
  return gtSuppliers;
}

// Seed Stock Opname from CSV
async function seedGTStockOpname() {
  console.log('Seeding GT Stock Opname from stock_opname_STOCK_GENERAL_(GT).csv...');
  const csvPath = path.join(DATA_DIR, 'stock_opname_STOCK_GENERAL_(GT).csv');
  
  if (!await fileExists(csvPath)) {
    console.log('stock_opname_STOCK_GENERAL_(GT).csv not found, skipping...');
    return { products: [], inventory: [], categories: [] };
  }

  // Load existing data
  const existingProductsRaw = await loadExistingData('gt_products');
  const existingProducts = Array.isArray(existingProductsRaw) ? existingProductsRaw : [];
  
  const existingInventoryRaw = await loadExistingData('gt_inventory');
  let existingInventory = [];
  if (existingInventoryRaw) {
    // Handle both array and object with value property
    if (Array.isArray(existingInventoryRaw)) {
      existingInventory = existingInventoryRaw;
    } else if (existingInventoryRaw.value && Array.isArray(existingInventoryRaw.value)) {
      existingInventory = existingInventoryRaw.value;
    }
  }
  
  const existingCategoriesRaw = await loadExistingData('gt_productCategories');
  const existingCategories = Array.isArray(existingCategoriesRaw) ? existingCategoriesRaw : [];

  const existingProductCodes = new Set(
    existingProducts.map(p => (p.product_id || p.kode || '').toString().trim().toUpperCase()).filter(Boolean)
  );
  const existingInventoryCodes = new Set(
    existingInventory.map(i => (i.codeItem || '').toString().trim().toUpperCase()).filter(Boolean)
  );
  const existingCategoryNames = new Set(
    existingCategories.map(c => (c.nama || c.name || '').toString().trim().toUpperCase()).filter(Boolean)
  );

  // Read CSV
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.log('CSV file is empty or has no data rows');
    return { products: [], inventory: [], categories: [] };
  }

  // Parse header - use proper CSV parsing
  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const header = parseCSVLine(lines[0]);
  const kodeIndex = header.findIndex(h => h.toLowerCase().includes('kode item') || (h.toLowerCase().includes('kode') && !h.toLowerCase().includes('nama')));
  const namaIndex = header.findIndex(h => h.toLowerCase().includes('nama item') || (h.toLowerCase().includes('nama') && h.toLowerCase().includes('item')));
  const jenisIndex = header.findIndex(h => h.toLowerCase().includes('jenis'));
  const stokIndex = header.findIndex(h => h.toLowerCase().includes('stok'));
  const satuanIndex = header.findIndex(h => h.toLowerCase().includes('satuan'));
  const hBeliIndex = header.findIndex(h => h.toLowerCase().includes('h. beli') || h.toLowerCase().includes('harga beli'));
  const hargaJualIndex = header.findIndex(h => h.toLowerCase().includes('harga jual'));

  console.log(`Found columns: Kode=${kodeIndex}, Nama=${namaIndex}, Jenis=${jenisIndex}, Stok=${stokIndex}, Satuan=${satuanIndex}, H.Beli=${hBeliIndex}, H.Jual=${hargaJualIndex}`);

  const newProducts = [];
  const updatedProducts = []; // Products to update
  const newInventory = []; // Inventory to update or create
  const updatedInventory = []; // Track updated inventory items
  const categorySet = new Set();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV line using same function
    const values = parseCSVLine(line);

    const kode = (values[kodeIndex] || '').toString().trim();
    const nama = (values[namaIndex] || '').toString().trim();
    const jenis = (values[jenisIndex] || '').toString().trim();
    const stok = parseFloat((values[stokIndex] || '0').toString().replace(/[^\d.-]/g, '')) || 0;
    const satuan = (values[satuanIndex] || 'PCS').toString().trim();
    
    // Get raw values before parsing to check if they exist
    const hBeliRaw = values[hBeliIndex] !== undefined ? (values[hBeliIndex] || '').toString().trim() : '';
    const hargaJualRaw = values[hargaJualIndex] !== undefined ? (values[hargaJualIndex] || '').toString().trim() : '';
    
    // Parse harga beli and harga jual
    // Remove all non-numeric characters except digits, dots, and minus signs
    const hBeliCleaned = hBeliRaw ? hBeliRaw.replace(/[^\d.-]/g, '') : '';
    const hargaJualCleaned = hargaJualRaw ? hargaJualRaw.replace(/[^\d.-]/g, '') : '';
    const hBeli = hBeliCleaned ? parseFloat(hBeliCleaned) : NaN;
    const hargaJual = hargaJualCleaned ? parseFloat(hargaJualCleaned) : NaN;

    if (!kode && !nama) continue;

    // Collect kategori/jenis
    if (jenis) {
      categorySet.add(jenis);
    }

    // Check if product exists
    const existingProduct = existingProducts.find(p => 
      (p.product_id || p.kode || '').toString().trim().toUpperCase() === kode.toUpperCase()
    );

    if (existingProduct) {
      // Update existing product with harga beli, harga jual, and kategori
      // Always use CSV values if available (even if 0), only fallback to existing if CSV value is missing or invalid
      const hargaBeliFromCSV = !isNaN(hBeli) ? hBeli : (existingProduct.harga || 0);
      const hargaJualFromCSV = !isNaN(hargaJual) ? hargaJual : (existingProduct.hargaSales || existingProduct.hargaFg || hargaBeliFromCSV || 0);
      
      // Use current timestamp to ensure this update is always newer than server data
      const updateTimestamp = new Date().toISOString();
      updatedProducts.push({
        ...existingProduct,
        nama: nama || existingProduct.nama || kode,
        satuan: satuan || existingProduct.satuan || 'PCS',
        kategori: jenis || existingProduct.kategori || '',
        harga: hargaBeliFromCSV, // Harga beli from CSV
        hargaSales: hargaJualFromCSV, // Harga jual from CSV
        hargaFg: hargaJualFromCSV, // Alias untuk hargaSales
        lastUpdate: updateTimestamp,
        userUpdate: 'System',
        // Add explicit timestamp for sync conflict resolution
        timestamp: Date.now(),
        _timestamp: Date.now(),
      });
    } else if (kode && !existingProductCodes.has(kode.toUpperCase())) {
      // Add new product if not exists
      // Use CSV values if valid, otherwise 0
      const hargaBeliFinal = !isNaN(hBeli) ? hBeli : 0;
      const hargaJualFinal = !isNaN(hargaJual) ? hargaJual : (!isNaN(hBeli) ? hBeli : 0);
      
      // Use current timestamp to ensure this update is always newer than server data
      const createTimestamp = new Date().toISOString();
      const createTimestampMs = Date.now();
      newProducts.push({
        id: generateId(),
        product_id: kode,
        kode: kode,
        nama: nama || kode,
        satuan: satuan || 'PCS',
        kategori: jenis || '',
        harga: hargaBeliFinal, // Harga beli from CSV
        hargaSales: hargaJualFinal, // Harga jual from CSV
        hargaFg: hargaJualFinal,
        stockAman: 0,
        stockMinimum: 0,
        lastUpdate: createTimestamp,
        userUpdate: 'System',
        created: createTimestamp,
        // Add explicit timestamp for sync conflict resolution
        timestamp: createTimestampMs,
        _timestamp: createTimestampMs,
      });
      existingProductCodes.add(kode.toUpperCase());
    }

    // Update or create inventory - update ALL inventory with price and kategori from CSV
    if (kode) {
      const existingInventoryItem = existingInventory.find(i => 
        (i.codeItem || '').toString().trim().toUpperCase() === kode.toUpperCase()
      );
      
      if (existingInventoryItem) {
        // Update existing inventory with price and kategori from CSV
        // Preserve stock data (stockPremonth, receive, outgoing, return)
        // Ambil harga beli dari CSV jika ada (termasuk 0), jika tidak ada ambil dari product master, jika tidak ada baru pakai existing
        const hargaBeliFromCSV = !isNaN(hBeli) ? hBeli : null;
        const hargaBeliFromProduct = existingProduct ? (existingProduct.harga || existingProduct.hargaBeli || 0) : 0;
        // Prioritas: CSV (termasuk 0) > Product Master > Existing
        const finalHargaBeli = hargaBeliFromCSV !== null ? hargaBeliFromCSV : (hargaBeliFromProduct > 0 ? hargaBeliFromProduct : (existingInventoryItem.hargaBeli || 0));
        
        const updatedInvItem = {
          ...existingInventoryItem,
          description: nama || existingInventoryItem.description || kode,
          kategori: jenis || existingInventoryItem.kategori || 'Product',
          satuan: satuan || existingInventoryItem.satuan || 'PCS',
          hargaBeli: finalHargaBeli, // Harga beli from CSV, fallback to product master, then existing
          price: hargaJual || hBeli || existingInventoryItem.price || 0, // Harga jual from CSV, fallback to harga beli
          // Update stockPremonth if stok > 0 (from CSV stock opname)
          stockPremonth: stok > 0 ? stok : existingInventoryItem.stockPremonth || 0,
          // Recalculate nextStock
          nextStock: (stok > 0 ? stok : existingInventoryItem.stockPremonth || 0) + 
                     (existingInventoryItem.receive || 0) - 
                     (existingInventoryItem.outgoing || 0) + 
                     (existingInventoryItem.return || 0),
          lastUpdate: new Date().toISOString(),
        };
        updatedInventory.push(updatedInvItem);
        existingInventoryCodes.add(kode.toUpperCase());
      } else if (!existingInventoryCodes.has(kode.toUpperCase())) {
        // Create new inventory (even if stok = 0, to have price and kategori data)
        // Ambil harga beli dari CSV jika ada (termasuk 0), jika tidak ada ambil dari product master
        const hargaBeliFromCSV = !isNaN(hBeli) ? hBeli : null;
        const hargaBeliFromProduct = existingProduct ? (existingProduct.harga || existingProduct.hargaBeli || 0) : 0;
        // Prioritas: CSV (termasuk 0) > Product Master
        const finalHargaBeli = hargaBeliFromCSV !== null ? hargaBeliFromCSV : hargaBeliFromProduct;
        
        newInventory.push({
          id: generateId(),
          supplierName: '', // Will be filled from product or supplier
          codeItem: kode,
          description: nama || kode,
          kategori: jenis || 'Product',
          satuan: satuan || 'PCS',
          hargaBeli: finalHargaBeli, // Harga beli from CSV, fallback to product master
          price: hargaJual || hBeli || 0, // Harga jual from CSV, fallback to harga beli
          stockPremonth: stok || 0, // Stock from opname (can be 0)
          receive: 0,
          outgoing: 0,
          return: 0,
          nextStock: stok || 0, // stockPremonth + receive - outgoing + return
          lastUpdate: new Date().toISOString(),
          processedGRNs: [],
          processedDeliveries: [],
        });
        existingInventoryCodes.add(kode.toUpperCase());
      }
    }
  }

  // Create category list
  const newCategories = Array.from(categorySet)
    .filter(cat => cat && !existingCategoryNames.has(cat.toUpperCase()))
    .map(cat => ({
      id: generateId(),
      nama: cat,
      name: cat, // For compatibility
      created: new Date().toISOString(),
    }));

  console.log(`Loaded ${newProducts.length} new products, ${updatedProducts.length} updated products, ${newInventory.length} new inventory items, ${updatedInventory.length} updated inventory items, ${newCategories.length} categories`);
  
  return { products: newProducts, updatedProducts: updatedProducts, inventory: newInventory, updatedInventory: updatedInventory, categories: newCategories };
}

// Main seed function for GT
async function seedGT() {
  console.log('Starting GT seed process...\n');

  try {
    // Seed GT data
    const products = await seedGTProducts();
    const customers = await seedGTCustomers();
    const suppliers = await seedGTSuppliers();
    
    // Seed Stock Opname
    const stockOpname = await seedGTStockOpname();

    // Save to storage with gt_ prefix
    if (products.length > 0 || stockOpname.products.length > 0 || stockOpname.updatedProducts.length > 0) {
      // Load existing products ONCE
      const existingProducts = await loadExistingData('gt_products') || [];
      
      // Create a comprehensive map of ALL products from CSV (both updated and new)
      const allCSVProductsMap = new Map();
      
      // Add updated products (products that existed and were updated)
      stockOpname.updatedProducts.forEach(updated => {
        const key = (updated.product_id || updated.kode || '').toString().trim().toUpperCase();
        allCSVProductsMap.set(key, updated);
      });
      
      // Add new products from stockOpname (products from CSV that didn't exist before)
      // IMPORTANT: These might actually exist in file but weren't detected as existing during seedGTStockOpname
      // So we need to include them in the map to update existing products
      stockOpname.products.forEach(p => {
        const key = (p.product_id || p.kode || '').toString().trim().toUpperCase();
        // Always add to map, even if key exists (CSV is source of truth)
        allCSVProductsMap.set(key, p);
      });
      
      // Add products from master_item_produk_GT.xlsx
      products.forEach(p => {
        const key = (p.product_id || p.kode || '').toString().trim().toUpperCase();
        if (!allCSVProductsMap.has(key)) {
          allCSVProductsMap.set(key, p);
        }
      });
      
      // Merge: Update existing products with CSV data, or keep existing if not in CSV
      const currentTimestamp = Date.now();
      const currentTimestampISO = new Date().toISOString();
      const mergedProducts = existingProducts.map(p => {
        const key = (p.product_id || p.kode || '').toString().trim().toUpperCase();
        if (allCSVProductsMap.has(key)) {
          // Product exists in CSV - use CSV data (this is the source of truth)
          const csvProduct = allCSVProductsMap.get(key);
          // Preserve id and no from existing, but update everything else from CSV
          // IMPORTANT: Update timestamp to current time to ensure this data is always newer than server
          const merged = {
            ...csvProduct,
            id: p.id, // Keep existing id
            no: p.no, // Keep existing no (will be renumbered later)
            lastUpdate: currentTimestampISO, // Always use current timestamp
            timestamp: currentTimestamp, // Explicit timestamp for sync
            _timestamp: currentTimestamp, // Backup timestamp field
          };
          return merged;
        }
        // Product not in CSV - keep existing
        return p;
      });
      
      // Add truly new products (not in existing file)
      const existingCodes = new Set(
        existingProducts.map(p => (p.product_id || p.kode || '').toString().trim().toUpperCase())
      );
      const newProductsToAdd = Array.from(allCSVProductsMap.values()).filter(p => {
        const key = (p.product_id || p.kode || '').toString().trim().toUpperCase();
        return !existingCodes.has(key);
      });
      
      const finalProducts = [...mergedProducts, ...newProductsToAdd];
      // Renumber all products
      const renumberedProducts = finalProducts.map((p, idx) => ({ ...p, no: idx + 1 }));
      await saveToStorage('products', renumberedProducts);
    }
    
    if (customers.length > 0) {
      // REPLACE all customers - use data from JSON as source of truth
      await saveToStorage('customers', customers);
      console.log(`✓ Saved ${customers.length} GT customers (REPLACED existing data)`);
    }
    
    if (suppliers.length > 0) {
      // REPLACE all suppliers - use data from JSON as source of truth
      await saveToStorage('suppliers', suppliers);
      console.log(`✓ Saved ${suppliers.length} GT suppliers (REPLACED existing data)`);
    }

    // Save inventory - update existing and add new
    // ALWAYS save inventory from CSV, even if existing inventory is empty (after clear)
    if (stockOpname.inventory.length > 0 || stockOpname.updatedInventory.length > 0) {
      const existingInventoryRaw = await loadExistingData('gt_inventory');
      let existingInventory = [];
      if (existingInventoryRaw) {
        // Handle both array and object with value property
        if (Array.isArray(existingInventoryRaw)) {
          existingInventory = existingInventoryRaw;
        } else if (existingInventoryRaw.value && Array.isArray(existingInventoryRaw.value)) {
          existingInventory = existingInventoryRaw.value;
        }
      }
      
      // Create map of updated inventory
      const updatedInventoryMap = new Map();
      stockOpname.updatedInventory.forEach(updated => {
        const key = (updated.codeItem || '').toString().trim().toUpperCase();
        updatedInventoryMap.set(key, updated);
      });
      
      // Update existing inventory with CSV data
      const existingInventoryUpdated = existingInventory.map(inv => {
        const key = (inv.codeItem || '').toString().trim().toUpperCase();
        return updatedInventoryMap.has(key) ? updatedInventoryMap.get(key) : inv;
      });
      
      // Add new inventory (filter duplicates)
      const existingCodes = new Set(
        existingInventoryUpdated.map(inv => (inv.codeItem || '').toString().trim().toUpperCase())
      );
      const newInventoryToAdd = stockOpname.inventory.filter(inv => {
        const key = (inv.codeItem || '').toString().trim().toUpperCase();
        return !existingCodes.has(key);
      });
      
      const mergedInventory = [...existingInventoryUpdated, ...newInventoryToAdd];
      
      // Debug: Log before saving
      console.log(`[DEBUG] Saving inventory: ${mergedInventory.length} items (${newInventoryToAdd.length} new, ${stockOpname.updatedInventory.length} updated)`);
      
      // Ensure we have data to save
      if (mergedInventory.length > 0) {
        await saveToStorage('inventory', mergedInventory);
        console.log(`✓ Inventory saved: ${mergedInventory.length} records`);
      } else {
        console.warn('⚠ Warning: mergedInventory is empty, skipping save');
      }
    } else {
      console.warn('⚠ Warning: No inventory data from CSV to save');
    }

    // Save categories
    if (stockOpname.categories.length > 0) {
      const existingCategoriesRaw = await loadExistingData('gt_productCategories');
      const existingCategories = Array.isArray(existingCategoriesRaw) ? existingCategoriesRaw : [];
      const mergedCategories = [...existingCategories, ...stockOpname.categories];
      await saveToStorage('productCategories', mergedCategories);
    }

    console.log('\n✓ GT Seed completed successfully!');
    console.log(`  - Products: ${products.length + stockOpname.products.length} new records, ${stockOpname.updatedProducts.length} updated records`);
    console.log(`  - Customers: ${customers.length} records (REPLACED)`);
    console.log(`  - Suppliers: ${suppliers.length} records (REPLACED)`);
    console.log(`  - Inventory: ${stockOpname.inventory.length} new records, ${stockOpname.updatedInventory.length} updated records`);
    console.log(`  - Categories: ${stockOpname.categories.length} new records`);
  } catch (error) {
    console.error('GT Seed error:', error);
    process.exit(1);
  }
}

// Run seed
if (require.main === module) {
  seedGT();
}

module.exports = { seedGT, seedGTProducts, seedGTCustomers, seedGTSuppliers };

