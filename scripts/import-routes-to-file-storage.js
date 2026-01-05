const fs = require('fs');
const path = require('path');

// Path files
const importFile = path.join(__dirname, '../data/trucking-routes-ready.json');
const storageFile = path.join(__dirname, '../data/localStorage/trucking/trucking_routes.json');

console.log('📖 Reading import data from:', importFile);
const importedRoutes = JSON.parse(fs.readFileSync(importFile, 'utf8'));

console.log(`✅ Found ${importedRoutes.length} routes to import`);

// Baca existing routes dari storage
let existingRoutes = [];
if (fs.existsSync(storageFile)) {
  console.log('📖 Reading existing routes from:', storageFile);
  const existingData = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
  
  // Extract value dari wrapper format
  if (existingData && typeof existingData === 'object' && 'value' in existingData) {
    existingRoutes = Array.isArray(existingData.value) ? existingData.value : [];
  } else if (Array.isArray(existingData)) {
    existingRoutes = existingData;
  } else {
    existingRoutes = [];
  }
  
  console.log(`✅ Found ${existingRoutes.length} existing routes`);
} else {
  console.log('ℹ️ No existing routes file found, creating new one');
}

// Merge routes (skip duplicates berdasarkan routeCode)
const existingRouteCodes = new Set(existingRoutes.map(r => r.routeCode));
const uniqueNewRoutes = importedRoutes.filter(r => !existingRouteCodes.has(r.routeCode));

console.log(`\n📊 Merge Summary:`);
console.log(`   - Existing routes: ${existingRoutes.length}`);
console.log(`   - New routes to add: ${uniqueNewRoutes.length}`);
console.log(`   - Duplicates skipped: ${importedRoutes.length - uniqueNewRoutes.length}`);

// Update no untuk existing routes
const maxNo = existingRoutes.length > 0 
  ? Math.max(...existingRoutes.map(r => r.no || 0))
  : 0;

// Update no untuk new routes
const updatedNewRoutes = uniqueNewRoutes.map((route, index) => ({
  ...route,
  no: maxNo + index + 1,
}));

// Merge semua routes
const allRoutes = [...existingRoutes, ...updatedNewRoutes];

// Update no untuk semua routes (re-number)
const finalRoutes = allRoutes.map((route, index) => ({
  ...route,
  no: index + 1,
}));

// Format untuk storage (wrapper format)
// Gunakan timestamp yang lebih baru untuk prevent server overwrite
// Set timestamp jauh di masa depan untuk ensure local data lebih baru dari server
const now = Date.now() + 86400000; // +1 day untuk ensure lebih baru dari server
const storageData = {
  value: finalRoutes,
  timestamp: now,
  _timestamp: now,
  synced: false, // Mark as not synced untuk force push ke server
};

// Pastikan folder ada
const storageDir = path.dirname(storageFile);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
  console.log(`✅ Created directory: ${storageDir}`);
}

// Simpan ke storage dengan force write
try {
  fs.writeFileSync(storageFile, JSON.stringify(storageData, null, 2), 'utf8');
  console.log(`✅ File written successfully`);
  
  // Verify file was written
  const stats = fs.statSync(storageFile);
  const fileContent = fs.readFileSync(storageFile, 'utf8');
  const parsed = JSON.parse(fileContent);
  console.log(`✅ Verification: File size ${stats.size} bytes, ${parsed.value ? parsed.value.length : 0} routes`);
} catch (error) {
  console.error(`❌ Error writing file:`, error);
  throw error;
}

console.log(`\n🎉 Successfully imported ${uniqueNewRoutes.length} routes!`);
console.log(`📄 Total routes in storage: ${finalRoutes.length}`);
console.log(`💾 Saved to: ${storageFile}`);

// Summary by customer
const summary = {};
finalRoutes.forEach(route => {
  const customer = route._customer || (route.notes && route.notes.match(/Customer: ([^\n]+)/) ? route.notes.match(/Customer: ([^\n]+)/)[1] : null) || 'Unknown';
  summary[customer] = (summary[customer] || 0) + 1;
});

console.log(`\n📊 Routes by Customer:`);
Object.entries(summary).forEach(([customer, count]) => {
  console.log(`   - ${customer}: ${count} routes`);
});

