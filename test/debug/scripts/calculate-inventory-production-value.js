const fs = require('fs');
const path = require('path');

// Helper untuk format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Helper untuk extract value dari storage format
function extractStorageValue(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.value && Array.isArray(data.value)) return data.value;
  return [];
}

// Baca file inventory
const inventoryPath = path.join(__dirname, '..', 'data', 'localStorage', 'inventory.json');
const productionPath = path.join(__dirname, '..', 'data', 'localStorage', 'production.json');

console.log('🔍 Membaca data inventory dan produksi...\n');

// Baca inventory
let inventoryData = [];
if (fs.existsSync(inventoryPath)) {
  const rawData = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  inventoryData = extractStorageValue(rawData);
  console.log(`✅ Inventory: ${inventoryData.length} items ditemukan`);
} else {
  console.log('⚠️  File inventory.json tidak ditemukan');
}

// Baca production
let productionData = [];
if (fs.existsSync(productionPath)) {
  const rawData = JSON.parse(fs.readFileSync(productionPath, 'utf-8'));
  productionData = extractStorageValue(rawData);
  console.log(`✅ Production: ${productionData.length} records ditemukan`);
} else {
  console.log('⚠️  File production.json tidak ditemukan');
}

// Hitung total nilai inventory - GROUP BY codeItem untuk avoid duplikasi
console.log('\n📊 MENGHITUNG TOTAL NILAI INVENTORY MATERIAL...\n');

// Group by codeItem (unique) - ambil yang terbaru berdasarkan lastUpdate
const inventoryMap = new Map();

inventoryData.forEach((item) => {
  const codeItem = (item.codeItem || '').toString().trim().toUpperCase();
  if (!codeItem) return; // Skip jika tidak ada codeItem
  
  const existing = inventoryMap.get(codeItem);
  
  // Jika belum ada atau item ini lebih baru, simpan
  if (!existing || (item.lastUpdate && existing.lastUpdate && 
      new Date(item.lastUpdate) > new Date(existing.lastUpdate))) {
    inventoryMap.set(codeItem, item);
  }
});

// Convert map ke array (unique items)
const uniqueInventory = Array.from(inventoryMap.values());

console.log(`📊 Total items: ${inventoryData.length} → Unique items: ${uniqueInventory.length} (setelah remove duplikasi)\n`);

let totalInventoryValue = 0;
let materialInventoryValue = 0;
let productInventoryValue = 0;
let materialCount = 0;
let productCount = 0;

// Kategorisasi berdasarkan kategori (sesuai dengan aplikasi)
const isProduct = (item) => {
  const kategori = (item.kategori || '').toString().trim().toLowerCase();
  if (!kategori) return false;
  return kategori === 'product' || 
         kategori === 'produk' ||
         kategori.includes('product') || 
         kategori.includes('finished') || 
         kategori.includes('fg') ||
         kategori.includes('finished goods');
};

uniqueInventory.forEach((item, index) => {
  const stock = item.nextStock || item.stock || item.qty || item.quantity || 0;
  const price = item.price || item.unitPrice || item.hargaBeli || 0;
  const value = stock * price;
  
  if (isProduct(item)) {
    productInventoryValue += value;
    productCount++;
  } else {
    materialInventoryValue += value;
    materialCount++;
  }
  
  totalInventoryValue += value;
  
  // Log item dengan nilai tinggi (optional) - hanya sekali per item
  if (value > 10000000 && index < 30) { // Limit output untuk menghindari spam
    console.log(`  💰 ${item.codeItem || item.id}: ${formatCurrency(value)} (Stock: ${stock} x Price: ${formatCurrency(price)})`);
  }
});

// Hitung total nilai produksi (jika ada data harga)
console.log('\n📊 MENGHITUNG TOTAL NILAI PRODUKSI...\n');

let totalProductionValue = 0;
let productionCount = 0;

// Untuk produksi, kita perlu cek apakah ada data harga
// Biasanya produksi tidak menyimpan nilai langsung, tapi kita bisa hitung dari producedQty
productionData.forEach((item) => {
  const producedQty = item.producedQty || item.progress || 0;
  // Jika tidak ada price di production, kita skip atau cari dari inventory
  const productId = item.productId || item.product_id;
  
  if (productId && producedQty > 0) {
    // Cari harga dari inventory berdasarkan productId (gunakan unique inventory)
    const inventoryItem = uniqueInventory.find(inv => 
      (inv.codeItem || '').toString().trim().toUpperCase() === productId.toString().trim().toUpperCase() || 
      inv.id === productId ||
      inv.productId === productId
    );
    
    if (inventoryItem) {
      const price = inventoryItem.price || inventoryItem.unitPrice || 0;
      const value = producedQty * price;
      totalProductionValue += value;
      productionCount++;
    }
  }
});

// Tampilkan hasil
console.log('\n' + '='.repeat(60));
console.log('📈 RINGKASAN TOTAL NILAI');
console.log('='.repeat(60));
console.log(`\n📦 INVENTORY MATERIAL:`);
console.log(`   Jumlah Item: ${materialCount}`);
console.log(`   Total Nilai: ${formatCurrency(materialInventoryValue)}`);
console.log(`\n📦 INVENTORY PRODUK:`);
console.log(`   Jumlah Item: ${productCount}`);
console.log(`   Total Nilai: ${formatCurrency(productInventoryValue)}`);
console.log(`\n💰 TOTAL INVENTORY (Material + Produk):`);
console.log(`   Total Item (Unique): ${uniqueInventory.length}`);
console.log(`   Total Nilai: ${formatCurrency(totalInventoryValue)}`);
console.log(`\n🏭 PRODUKSI:`);
console.log(`   Jumlah Record: ${productionCount}`);
console.log(`   Total Nilai (berdasarkan harga inventory): ${formatCurrency(totalProductionValue)}`);
console.log(`\n🎯 GRAND TOTAL (Inventory + Produksi):`);
console.log(`   Total Nilai: ${formatCurrency(totalInventoryValue + totalProductionValue)}`);
console.log('\n' + '='.repeat(60));

