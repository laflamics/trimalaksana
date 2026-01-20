// Fix hasBOM Matching Logic - Handle FG prefix and customer codes
console.log('🔧 Fixing hasBOM matching logic...');

// Helper function to normalize product ID for matching
function normalizeProductId(id) {
    if (!id) return '';
    
    let normalized = String(id).trim().toLowerCase();
    
    // Remove FG- prefix if exists
    if (normalized.startsWith('fg-')) {
        normalized = normalized.substring(3);
    }
    
    // Remove customer code suffix (everything after last -)
    // But keep KRT-style codes intact
    if (normalized.includes('-') && !normalized.match(/^[a-z]{3}-?\d{4,5}$/)) {
        const parts = normalized.split('-');
        // If it looks like customer-product format, take the last part
        if (parts.length > 1 && parts[parts.length - 1].match(/^[a-z]{3}\d{4,5}$/)) {
            normalized = parts[parts.length - 1];
        }
        // If it looks like product-customer format, take the first part  
        else if (parts.length > 1 && parts[0].match(/^[a-z]{3}\d{4,5}$/)) {
            normalized = parts[0];
        }
    }
    
    // Remove any remaining dashes for KRT codes
    if (normalized.match(/^[a-z]{3}-\d{4,5}$/)) {
        normalized = normalized.replace('-', '');
    }
    
    return normalized;
}

// Test the normalization
console.log('🧪 Testing normalization:');
const testIds = [
    'FG-KRT04173',
    'FG-CUST-KRT04173', 
    'KRT04173',
    'KRT-04173',
    'CUST-KRT04173',
    'KRT04173-CUST',
    'krt04173'
];

testIds.forEach(id => {
    console.log(`${id} → ${normalizeProductId(id)}`);
});

// Get current BOM data
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

// Create normalized BOM set
const normalizedBomSet = new Set();
bomItems.forEach(b => {
    if (b && b.product_id) {
        const normalized = normalizeProductId(b.product_id);
        if (normalized) {
            normalizedBomSet.add(normalized);
        }
    }
});

console.log('📊 Normalized BOM Set:', {
    size: normalizedBomSet.size,
    sample: Array.from(normalizedBomSet).slice(0, 10)
});

// Test problem products
const problemIds = ['krt04173', 'krt02722', 'krt04072'];
console.log('\n🎯 Testing problem products:');
problemIds.forEach(id => {
    const normalized = normalizeProductId(id);
    const found = normalizedBomSet.has(normalized);
    console.log(`${id} → ${normalized} → ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});

// Get products data to test real matching
const productsData = JSON.parse(localStorage.getItem('products') || '[]');

// Find actual problem products and test
console.log('\n🔍 Real Product Testing:');
const problemProductNames = [
    'LAYER KARTON',
    'CARTON BOX DH8 POLOS 727X380X320MM',
    'KARTON BOX 430X350X350'
];

problemProductNames.forEach(name => {
    const product = productsData.find(p => p.nama && p.nama.includes(name.substring(0, 15)));
    if (product) {
        const productId = product.product_id || product.padCode || product.kode || '';
        const normalized = normalizeProductId(productId);
        const found = normalizedBomSet.has(normalized);
        
        console.log(`\n📦 ${product.nama.substring(0, 30)}...`);
        console.log(`  Original ID: ${productId}`);
        console.log(`  Normalized: ${normalized}`);
        console.log(`  Has BOM: ${found ? '✅ YES' : '❌ NO'}`);
    }
});

console.log('\n🚀 READY TO APPLY FIX!');
console.log('The normalization logic should handle:');
console.log('• FG- prefix removal');
console.log('• Customer code handling'); 
console.log('• KRT-style code normalization');

// Export the fix for Products.tsx
window.normalizeProductIdForBOM = normalizeProductId;
console.log('✅ normalizeProductIdForBOM function available globally');