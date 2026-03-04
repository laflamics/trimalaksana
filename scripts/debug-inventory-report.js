/**
 * Debug script to check inventory data and test report generation
 */

const fs = require('fs');
const path = require('path');

// Simulate storage service
const mockStorageService = {
  async get(key) {
    console.log(`[DEBUG] Fetching key: ${key}`);
    
    // Try to read from local files first
    const localPath = path.join(__dirname, `master/${key}.json`);
    if (fs.existsSync(localPath)) {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      console.log(`[DEBUG] Found local file: ${localPath}, items: ${Array.isArray(data) ? data.length : 'N/A'}`);
      return data;
    }
    
    console.log(`[DEBUG] No local file found for: ${key}`);
    return null;
  }
};

async function debugInventoryReport() {
  console.log('='.repeat(60));
  console.log('INVENTORY REPORT DEBUG');
  console.log('='.repeat(60));
  
  try {
    // Fetch inventory data
    console.log('\n📦 Fetching inventory data...');
    const inventoryRaw = await mockStorageService.get('inventory');
    
    if (!inventoryRaw) {
      console.log('❌ No inventory data found!');
      console.log('\nTrying to find inventory files...');
      
      // List all files in master directory
      const masterDir = path.join(__dirname, 'master');
      if (fs.existsSync(masterDir)) {
        const files = fs.readdirSync(masterDir);
        console.log('Files in master directory:');
        files.forEach(file => {
          const filePath = path.join(masterDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  - ${file} (${stats.size} bytes)`);
        });
      }
      return;
    }
    
    const inventoryData = Array.isArray(inventoryRaw) ? inventoryRaw : inventoryRaw.data || [];
    console.log(`✅ Found ${inventoryData.length} inventory items`);
    
    if (inventoryData.length > 0) {
      console.log('\n📊 Sample inventory item:');
      console.log(JSON.stringify(inventoryData[0], null, 2));
      
      // Check field names
      console.log('\n🔍 Field names in first item:');
      Object.keys(inventoryData[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof inventoryData[0][key]}`);
      });
      
      // Fetch products data
      console.log('\n📦 Fetching products data...');
      const productsRaw = await mockStorageService.get('products');
      const productsData = Array.isArray(productsRaw) ? productsRaw : productsRaw?.data || [];
      console.log(`✅ Found ${productsData.length} products`);
      
      // Build product map
      const productMap = new Map();
      productsData.forEach(prod => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });
      
      // Enrich first item
      console.log('\n🔄 Enriching first inventory item...');
      const inv = inventoryData[0];
      const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
      const product = productMap.get(productKey);
      
      const enriched = {
        no: inv.no || '',
        kode: inv.codeItem || inv.item_code || '',
        nama: inv.description || product?.nama || product?.name || '',
        kategori: inv.kategori || product?.kategori || product?.category || '',
        stok: Number(inv.nextStock || inv.stock || 0),
        hargaBeli: Number(inv.price || product?.cost || product?.harga_beli || 0),
        nilaiStok: Number(inv.nextStock || inv.stock || 0) * Number(inv.price || product?.cost || product?.harga_beli || 0),
        minStock: Number(inv.minStock || product?.minStock || 0),
        maxStock: Number(inv.maxStock || product?.maxStock || 0),
      };
      
      console.log('Enriched item:');
      console.log(JSON.stringify(enriched, null, 2));
      
      // Summary
      console.log('\n📈 Summary:');
      console.log(`  Total items: ${inventoryData.length}`);
      console.log(`  Items with code: ${inventoryData.filter(i => i.codeItem || i.item_code).length}`);
      console.log(`  Items with stock > 0: ${inventoryData.filter(i => (i.nextStock || i.stock || 0) > 0).length}`);
      console.log(`  Total stock value: Rp ${inventoryData.reduce((sum, i) => sum + ((i.nextStock || i.stock || 0) * (i.price || 0)), 0).toLocaleString('id-ID')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
}

debugInventoryReport();
