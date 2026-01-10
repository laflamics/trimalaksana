// Debug script untuk mencari FG-CTM-00009 yang masih muncul
// Jalankan di browser console

console.log('=== DEBUG CTM-00009 ISSUE ===');

// Function untuk debug products
function debugProducts() {
  // Ambil data dari localStorage
  const productsData = localStorage.getItem('products');
  if (productsData) {
    const parsed = JSON.parse(productsData);
    const products = parsed.value || parsed;
    
    console.log(`Total products in localStorage: ${products.length}`);
    
    // Cari produk dengan CTM di kode
    const ctmProducts = products.filter(p => {
      const kode = (p.kode || '').toLowerCase();
      const productId = (p.product_id || '').toLowerCase();
      return kode.includes('ctm') || productId.includes('ctm');
    });
    
    console.log(`Products with CTM in kode/product_id: ${ctmProducts.length}`);
    ctmProducts.forEach(p => {
      console.log(`  - ${p.kode} (product_id: ${p.product_id}) - ${p.nama} - Customer: ${p.customer}`);
    });
    
    // Cari produk dengan nama TUTUP
    const tutupProducts = products.filter(p => {
      const nama = (p.nama || '').toLowerCase();
      return nama.includes('tutup 113x110x12.5');
    });
    
    console.log(`Products with TUTUP 113X110X12.5: ${tutupProducts.length}`);
    tutupProducts.forEach(p => {
      console.log(`  - ${p.kode} (product_id: ${p.product_id}) - ${p.nama} - Customer: ${p.customer}`);
    });
    
    // Cari produk CAC yang mungkin punya CTM reference
    const cacProducts = products.filter(p => {
      const customer = (p.customer || '').toLowerCase();
      return customer.includes('cac');
    });
    
    console.log(`CAC customer products: ${cacProducts.length}`);
    
    const cacWithCtm = cacProducts.filter(p => {
      const kode = (p.kode || '').toLowerCase();
      const productId = (p.product_id || '').toLowerCase();
      const nama = (p.nama || '').toLowerCase();
      return kode.includes('ctm') || productId.includes('ctm') || nama.includes('ctm');
    });
    
    if (cacWithCtm.length > 0) {
      console.log(`CAC products with CTM reference: ${cacWithCtm.length}`);
      cacWithCtm.forEach(p => {
        console.log(`  - FOUND ISSUE: ${p.kode} (product_id: ${p.product_id}) - ${p.nama} - Customer: ${p.customer}`);
      });
    }
  }
  
  // Check server data jika ada
  if (window.storageService) {
    console.log('Checking server data...');
    window.storageService.get('products').then(serverProducts => {
      if (serverProducts) {
        console.log(`Server products: ${serverProducts.length}`);
        
        const serverCtm = serverProducts.filter(p => {
          const kode = (p.kode || '').toLowerCase();
          const productId = (p.product_id || '').toLowerCase();
          return kode.includes('ctm') || productId.includes('ctm');
        });
        
        console.log(`Server CTM products: ${serverCtm.length}`);
        serverCtm.forEach(p => {
          console.log(`  - Server: ${p.kode} (product_id: ${p.product_id}) - ${p.nama} - Customer: ${p.customer}`);
        });
      }
    });
  }
}

// Function untuk test filtering
function testFiltering() {
  console.log('\n=== TESTING PRODUCT FILTERING ===');
  
  const productsData = localStorage.getItem('products');
  if (productsData) {
    const parsed = JSON.parse(productsData);
    const products = parsed.value || parsed;
    
    // Test CAC search
    const cacResults = products.filter(p => {
      const code = (p.product_id || p.kode || '').toLowerCase();
      const name = (p.nama || '').toLowerCase();
      const customer = (p.customer || '').toLowerCase();
      const label = `${code}${code ? ' - ' : ''}${name}`.toLowerCase();
      
      const query = 'cac';
      const codeMatch = code.includes(query);
      const nameMatch = name.includes(query);
      const customerMatch = customer.includes(query);
      const labelMatch = label.includes(query);
      
      return codeMatch || nameMatch || customerMatch || labelMatch;
    });
    
    console.log(`CAC search results: ${cacResults.length}`);
    cacResults.forEach(p => {
      const hasCtmInCode = (p.kode || '').toLowerCase().includes('ctm');
      const hasCtmInProductId = (p.product_id || '').toLowerCase().includes('ctm');
      const marker = (hasCtmInCode || hasCtmInProductId) ? ' ⚠️ HAS CTM' : '';
      console.log(`  - ${p.kode} (${p.product_id}) - ${p.customer}${marker}`);
    });
  }
}

// Run debug
debugProducts();
testFiltering();

console.log('\n=== INSTRUCTIONS ===');
console.log('1. Copy and paste this script in browser console');
console.log('2. Look for products with CTM in kode but CAC customer');
console.log('3. Check if FG-CTM-00009 appears in results');
console.log('4. Report findings to fix the data corruption');