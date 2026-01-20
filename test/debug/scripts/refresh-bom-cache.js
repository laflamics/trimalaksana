// Force refresh BOM cache by updating timestamps
const fs = require('fs');
const path = require('path');

console.log('🔄 Force refreshing BOM cache...\n');

// Update BOM file timestamp to trigger storage event
const bomPath = path.join(__dirname, '../data/localStorage/bom.json');

try {
  const bomWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
  const bomData = bomWrapper.value || [];
  
  console.log(`📊 Current BOM entries: ${bomData.length}`);
  
  // Add/update timestamp on a sample entry to trigger change detection
  if (bomData.length > 0) {
    const firstEntry = bomData[0];
    firstEntry.lastUpdated = new Date().toISOString();
    console.log(`📝 Updated timestamp for entry: ${firstEntry.product_id}`);
  }
  
  // Also add a dummy entry and remove it to force storage event
  const dummyEntry = {
    id: `temp-${Date.now()}`,
    product_id: 'TEMP_REFRESH',
    material_id: 'REFRESH_TRIGGER',
    ratio: 1,
    created: new Date().toISOString()
  };
  
  bomData.push(dummyEntry);
  
  // Write back to file
  fs.writeFileSync(bomPath, JSON.stringify({ value: bomData }, null, 2));
  console.log('✅ Temporary entry added');
  
  // Wait a moment then remove it
  setTimeout(() => {
    const updatedWrapper = JSON.parse(fs.readFileSync(bomPath, 'utf8'));
    const updatedData = updatedWrapper.value || [];
    const filteredData = updatedData.filter(entry => entry.id !== dummyEntry.id);
    
    fs.writeFileSync(bomPath, JSON.stringify({ value: filteredData }, null, 2));
    console.log('✅ Temporary entry removed');
    console.log('✅ BOM cache refresh triggered!');
    console.log('\n💡 Now refresh your browser to see BOM indicators');
  }, 100);
  
} catch (error) {
  console.error('❌ Error refreshing BOM cache:', error.message);
}