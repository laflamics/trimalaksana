// Debug Product ID Format Mismatch
console.log('🔍 Debugging Product ID Format Mismatch...');

// Get BOM data
const selectedBusiness = localStorage.getItem('selectedBusiness');
const bomStorageKey = selectedBusiness && selectedBusiness !== 'packaging' ? 
    selectedBusiness + '/bom' : 'bom';

const bomData = JSON.parse(localStorage.getItem(bomStorageKey) || '{"value": []}');
const bomItems = bomData.value || bomData;

console.log('📊 BOM Data Analysis:');
console.log('Total BOM items:', bomItems.length);

// Get unique BOM product IDs
const bomProductIds = new Set();
bomItems.forEach(b => {
    if (b && b.product_id) {
        bomProductIds.add(String(b.product_id).trim());
    }
});

console.log('Unique BOM product IDs:', bomProductIds.size);
console.log('Sample BOM IDs:', Array.from(bomProductIds).slice(0, 10));

// Get Products data
const productsData = JSON.parse(localStorage.getItem('products') || '[]');
console.log('\n📊 Products Data Analysis:');
console.log('Total products:', productsData.length);

// Find problem products from console logs
const problemProductNames = [
    'LAYER KARTON',
    'CARTON BOX DH8 POLOS 727X380X320MM K200/M125/K200 C/F',
    'KARTON BOX 430X350X350'
];

console.log('\n🔍 Problem Products Analysis:');
problemProductNames.forEach(name => {
    const product = productsData.find(p => p.nama && p.nama.includes(name.substring(0, 15)));
    if (product) {
        console.log(`\n📦 Product: ${product.nama}`);
        console.log('  • product_id:', product.product_id);
        console.log('  • kode:', product.kode);
        console.log('  • padCode:', product.padCode);
        console.log('  • kodeIpos:', product.kodeIpos);
        
        // Check what hasBOM logic would use
        const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
        console.log('  • hasBOM uses:', productId);
        
        // Check if it exists in BOM (case insensitive)
        const bomHasIt = Array.from(bomProductIds).some(bomId => 
            String(bomId).toLowerCase() === productId
        );
        console.log('  • BOM has it:', bomHasIt);
        
        // Check for similar IDs (maybe with FG prefix or customer codes)
        const similarBomIds = Array.from(bomProductIds).filter(bomId => {
            const bomIdLower = String(bomId).toLowerCase();
            return bomIdLower.includes(productId) || productId.includes(bomIdLower);
        });
        console.log('  • Similar BOM IDs:', similarBomIds);
        
        // Check if BOM has any ID that matches the product name pattern
        const nameBasedIds = Array.from(bomProductIds).filter(bomId => {
            const bomIdStr = String(bomId).toLowerCase();
            // Check if BOM ID contains parts of the product identifier
            return bomIdStr.includes('krt04173') || bomIdStr.includes('krt02722') || bomIdStr.includes('krt04072');
        });
        console.log('  • Name-based BOM matches:', nameBasedIds);
    } else {
        console.log(`❌ Product not found: ${name}`);
    }
});

// Check for FG prefix issues
console.log('\n🔍 FG Prefix Analysis:');
const fgProducts = productsData.filter(p => 
    p.product_id && String(p.product_id).toUpperCase().startsWith('FG-')
);
console.log('Products with FG prefix:', fgProducts.length);
if (fgProducts.length > 0) {
    console.log('Sample FG products:');
    fgProducts.slice(0, 5).forEach(p => {
        console.log(`  • ${p.nama}: ${p.product_id}`);
    });
}

// Check for customer code issues
console.log('\n🔍 Customer Code Analysis:');
const customerCodeProducts = productsData.filter(p => 
    p.product_id && String(p.product_id).includes('-')
);
console.log('Products with customer codes (-):', customerCodeProducts.length);
if (customerCodeProducts.length > 0) {
    console.log('Sample customer code products:');
    customerCodeProducts.slice(0, 5).forEach(p => {
        console.log(`  • ${p.nama}: ${p.product_id}`);
    });
}

// Check exact matches for problem IDs
console.log('\n🎯 Exact Problem ID Check:');
const problemIds = ['KRT04173', 'KRT02722', 'KRT04072'];
problemIds.forEach(id => {
    const bomHasIt = bomProductIds.has(id);
    const product = productsData.find(p => {
        const productId = (p.product_id || p.padCode || p.kode || '').toString().trim();
        return productId.toUpperCase() === id;
    });
    
    console.log(`\n${id}:`);
    console.log('  • In BOM:', bomHasIt);
    console.log('  • Product found:', !!product);
    if (product) {
        console.log('  • Product name:', product.nama);
        console.log('  • Product ID field:', product.product_id);
        console.log('  • Kode field:', product.kode);
        console.log('  • PadCode field:', product.padCode);
    }
});

console.log('\n🔧 SOLUTION NEEDED:');
console.log('Check if the matching logic needs to:');
console.log('1. Strip FG- prefix from product_id');
console.log('2. Handle customer code suffixes');
console.log('3. Use different field priority (kode vs product_id vs padCode)');
console.log('4. Normalize both sides before comparison');