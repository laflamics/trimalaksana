
// Check Business Context and Storage
console.log('🔍 Checking business context and storage...');

// 1. Check current business context
const selectedBusiness = localStorage.getItem('selectedBusiness');
console.log('Selected Business:', selectedBusiness || 'packaging (default)');

// 2. Simulate getStorageKey function (from storage service)
const getStorageKey = (key) => {
  const business = selectedBusiness || 'packaging';
  if (business === 'packaging') {
    return key; // "bom"
  }
  return business + '/' + key; // "general-trading/bom" or "trucking/bom"
};

const bomStorageKey = getStorageKey('bom');
console.log('BOM Storage Key:', bomStorageKey);

// 3. Check what's actually in localStorage for this key
const bomData = localStorage.getItem(bomStorageKey);
console.log('BOM Data Found:', bomData ? 'Yes' : 'No');

if (bomData) {
  try {
    const parsed = JSON.parse(bomData);
    const items = parsed.value || parsed;
    console.log('BOM Items Count:', Array.isArray(items) ? items.length : 'Invalid structure');
    
    if (Array.isArray(items) && items.length > 0) {
      console.log('First BOM item:', items[0]);
      
      // Create bomProductIdsSet like React does
      const bomProductIdsSet = new Set();
      items.forEach(b => {
        if (b) {
          const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
          if (bomProductId) {
            bomProductIdsSet.add(bomProductId);
          }
        }
      });
      
      console.log('BOM Product IDs Set Size:', bomProductIdsSet.size);
      console.log('BOM Product IDs (first 10):', Array.from(bomProductIdsSet).slice(0, 10));
      
      // Test problem products
      const problemProducts = ['krt04173', 'krt02722', 'krt04072'];
      console.log('\nTesting problem products:');
      problemProducts.forEach(id => {
        const found = bomProductIdsSet.has(id);
        console.log(`• ${id.toUpperCase()}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
      });
      
      // If size is 139, there's definitely an issue
      if (bomProductIdsSet.size > 100) {
        console.log('\n⚠️ BOM set size is too large! Investigating...');
        
        // Check for invalid entries
        const allIds = Array.from(bomProductIdsSet);
        const invalidIds = allIds.filter(id => !/^[a-z]{3}\d{5}$/.test(id));
        if (invalidIds.length > 0) {
          console.log('Invalid product IDs:', invalidIds.slice(0, 10));
        }
        
        // Check for very long IDs
        const longIds = allIds.filter(id => id.length > 10);
        if (longIds.length > 0) {
          console.log('Unusually long IDs:', longIds.slice(0, 10));
        }
      }
    }
  } catch (error) {
    console.log('Error parsing BOM data:', error.message);
  }
} else {
  console.log('❌ No BOM data found for key:', bomStorageKey);
  
  // Check alternative keys
  const alternativeKeys = ['bom', 'packaging/bom', 'general-trading/bom', 'trucking/bom'];
  console.log('\nChecking alternative keys:');
  alternativeKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const items = parsed.value || parsed;
        console.log(`• ${key}: ${Array.isArray(items) ? items.length + ' items' : 'invalid'}`);
      } catch (e) {
        console.log(`• ${key}: parse error`);
      }
    } else {
      console.log(`• ${key}: not found`);
    }
  });
}

// 4. Fix: Force use main bom.json data
console.log('\n🔧 Attempting to fix by using main bom.json data...');

// Try to get main bom data
const mainBomData = localStorage.getItem('bom');
if (mainBomData) {
  try {
    const parsed = JSON.parse(mainBomData);
    const items = parsed.value || parsed;
    
    if (Array.isArray(items) && items.length > 0) {
      // Force update the business-specific key with main bom data
      localStorage.setItem(bomStorageKey, mainBomData);
      console.log(`✅ Copied main bom.json data to ${bomStorageKey}`);
      
      // Dispatch storage change event
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { key: bomStorageKey.split('/').pop() || bomStorageKey, value: items }
      }));
      console.log('✅ Storage change event dispatched');
      
      console.log('🎯 Now check Products page - BOM indicators should appear!');
    }
  } catch (error) {
    console.log('Error processing main BOM data:', error.message);
  }
} else {
  console.log('❌ Main bom.json data not found in localStorage');
}
