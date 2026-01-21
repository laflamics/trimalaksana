// Script untuk memaksa refresh data dan membersihkan cache
// Jalankan di browser console

console.log('=== FORCE DATA REFRESH ===');

async function forceRefreshProducts() {
  console.log('1. Clearing product cache...');
  
  // Clear localStorage cache
  localStorage.removeItem('products_cache_timestamp');
  localStorage.removeItem('cached_products');
  
  console.log('2. Forcing reload from server...');
  
  // Force reload products from server
  if (window.storageService) {
    try {
      // Clear local products first
      localStorage.removeItem('products');
      
      // Force sync from server
      const products = await window.storageService.get('products');
      console.log(`Loaded ${products ? products.length : 0} products from server`);
      
      // Check for CTM products
      if (products) {
        const ctmProducts = products.filter(p => {
          const kode = (p.kode || '').toLowerCase();
          const productId = (p.product_id || '').toLowerCase();
          return kode.includes('ctm') || productId.includes('ctm');
        });
        
        console.log(`Found ${ctmProducts.length} CTM products:`);
        ctmProducts.forEach(p => {
          console.log(`  - ${p.kode} (${p.product_id}) - ${p.customer}`);
        });
        
        // Check for the specific problematic product
        const ctm09 = products.find(p => {
          const kode = (p.kode || '').toLowerCase();
          const productId = (p.product_id || '').toLowerCase();
          return kode.includes('fg-ctm-00009') || productId.includes('fg-ctm-00009');
        });
        
        if (ctm09) {
          console.log('⚠️ FOUND FG-CTM-00009:', ctm09);
          console.log('This product should be fixed or removed');
        } else {
          console.log('✅ FG-CTM-00009 not found in server data');
        }
      }
      
    } catch (error) {
      console.error('Error loading from server:', error);
    }
  }
  
  console.log('3. Refreshing page to reload components...');
  // Uncomment next line to refresh page
  // window.location.reload();
}

async function checkCurrentProducts() {
  console.log('=== CURRENT PRODUCTS CHECK ===');
  
  // Check localStorage
  const localData = localStorage.getItem('products');
  if (localData) {
    const parsed = JSON.parse(localData);
    const products = parsed.value || parsed;
    
    console.log(`Local products: ${products.length}`);
    
    // Look for CTM products
    const ctmProducts = products.filter(p => {
      const kode = (p.kode || '').toLowerCase();
      const productId = (p.product_id || '').toLowerCase();
      return kode.includes('ctm') || productId.includes('ctm');
    });
    
    console.log(`Local CTM products: ${ctmProducts.length}`);
    ctmProducts.forEach(p => {
      console.log(`  - ${p.kode} (${p.product_id}) - ${p.customer}`);
    });
    
    // Check for CAC products that might have CTM references
    const cacProducts = products.filter(p => {
      const customer = (p.customer || '').toLowerCase();
      return customer.includes('cac');
    });
    
    const cacWithCtmRef = cacProducts.filter(p => {
      const kode = (p.kode || '').toLowerCase();
      const productId = (p.product_id || '').toLowerCase();
      const nama = (p.nama || '').toLowerCase();
      return kode.includes('ctm') || productId.includes('ctm') || nama.includes('ctm');
    });
    
    if (cacWithCtmRef.length > 0) {
      console.log('⚠️ CAC products with CTM references:');
      cacWithCtmRef.forEach(p => {
        console.log(`  - ${p.kode} (${p.product_id}) - ${p.nama} - ${p.customer}`);
      });
    }
  }
}

// Run checks
checkCurrentProducts();

console.log('\n=== INSTRUCTIONS ===');
console.log('1. Run checkCurrentProducts() to see current data');
console.log('2. Run forceRefreshProducts() to force reload from server');
console.log('3. If FG-CTM-00009 still appears, it needs to be fixed on server');
console.log('4. The product should use product SKU ID, not customer code');

// Export functions to global scope
window.checkCurrentProducts = checkCurrentProducts;
window.forceRefreshProducts = forceRefreshProducts;