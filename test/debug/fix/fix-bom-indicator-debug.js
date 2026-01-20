#!/usr/bin/env node

/**
 * Fix BOM Indicator with Debug Logging
 * 
 * Menambahkan debug logging ke Products.tsx untuk troubleshoot masalah BOM indicator
 */

const fs = require('fs');
const path = require('path');

const productsPath = path.join(__dirname, 'src/pages/Master/Products.tsx');

console.log('🔧 Adding debug logging to Products.tsx...\n');

if (!fs.existsSync(productsPath)) {
  console.log('❌ Products.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(productsPath, 'utf8');

// 1. Add debug logging to loadProducts function
const loadProductsPattern = /const loadProducts = useCallback\(async \(\) => \{[\s\S]*?const bom = extractStorageValue\(await storageService\.get<any\[\]>\('bom'\)\);/;

const newLoadProducts = `const loadProducts = useCallback(async () => {
    console.log('[Products] 🔄 Loading products and BOM data...');
    const dataRaw = extractStorageValue(await storageService.get<Product[]>('products'));
    // Filter out deleted items menggunakan helper function
    const data = filterActiveItems(dataRaw);
    const bom = extractStorageValue(await storageService.get<any[]>('bom'));
    
    console.log('[Products] 📊 Loaded data:', {
      products: data.length,
      bomItems: bom.length,
      bomSample: bom.slice(0, 3)
    });`;

if (loadProductsPattern.test(content)) {
  content = content.replace(loadProductsPattern, newLoadProducts);
  console.log('✅ Added debug logging to loadProducts');
} else {
  console.log('⚠️ Could not find loadProducts pattern');
}

// 2. Add debug logging to setBomData
const setBomDataPattern = /setBomData\(bom\);/;
const newSetBomData = `setBomData(bom);
    console.log('[Products] 💾 BOM data set to state:', {
      bomCount: bom.length,
      firstFewIds: bom.slice(0, 5).map(b => b.product_id)
    });`;

if (setBomDataPattern.test(content)) {
  content = content.replace(setBomDataPattern, newSetBomData);
  console.log('✅ Added debug logging to setBomData');
}

// 3. Add debug logging to bomProductIdsSet useMemo
const bomProductIdsSetPattern = /const bomProductIdsSet = useMemo\(\(\) => \{[\s\S]*?return setId;[\s\S]*?\}, \[bomData\]\);/;

const newBomProductIdsSet = `const bomProductIdsSet = useMemo(() => {
    console.log('[Products] 🔄 Creating bomProductIdsSet from bomData:', bomData.length);
    const bomDataArray = Array.isArray(bomData) ? bomData : [];
    const setId = new Set<string>();
    bomDataArray.forEach(b => {
      if (b) {
        const bomProductId = (b.product_id || b.padCode || b.kode || '').toString().trim().toLowerCase();
        if (bomProductId) {
          setId.add(bomProductId);
        }
      }
    });
    console.log('[Products] ✅ bomProductIdsSet created:', {
      size: setId.size,
      ids: Array.from(setId).slice(0, 10)
    });
    return setId;
  }, [bomData]);`;

if (bomProductIdsSetPattern.test(content)) {
  content = content.replace(bomProductIdsSetPattern, newBomProductIdsSet);
  console.log('✅ Added debug logging to bomProductIdsSet');
}

// 4. Add debug logging to hasBOM function
const hasBOMPattern = /const hasBOM = useCallback\(\(product: Product\): boolean => \{[\s\S]*?return bomProductIdsSet\.has\(productId\);[\s\S]*?\}, \[bomProductIdsSet\]\);/;

const newHasBOM = `const hasBOM = useCallback((product: Product): boolean => {
    const productId = (product.product_id || product.padCode || product.kode || '').toString().trim().toLowerCase();
    if (!productId) return false;
    const result = bomProductIdsSet.has(productId);
    
    // Debug log for first few products only to avoid spam
    if (product.no <= 5) {
      console.log('[Products] 🔍 hasBOM check:', {
        productName: product.nama,
        productId: productId,
        hasBOM: result,
        bomSetSize: bomProductIdsSet.size
      });
    }
    
    return result;
  }, [bomProductIdsSet]);`;

if (hasBOMPattern.test(content)) {
  content = content.replace(hasBOMPattern, newHasBOM);
  console.log('✅ Added debug logging to hasBOM');
}

// 5. Add debug logging to BOM indicator render
const bomIndicatorPattern = /render: \(item: Product\) => \{[\s\S]*?const hasBom = hasBOM\(item\);[\s\S]*?return \([\s\S]*?\);[\s\S]*?\}/;

const newBomIndicator = `render: (item: Product) => {
        const hasBom = hasBOM(item);
        
        // Debug log for first few items
        if (item.no <= 3) {
          console.log('[Products] 🎨 Rendering BOM indicator:', {
            productName: item.nama,
            productId: item.product_id || item.padCode || item.kode,
            hasBom: hasBom,
            color: hasBom ? '#388e3c' : '#ff9800'
          });
        }
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: hasBom ? '#388e3c' : '#ff9800',
                display: 'inline-block',
              }}
              title={hasBom ? 'Memiliki BOM' : 'Tidak memiliki BOM'}
            />
          </div>
        );
      }`;

if (bomIndicatorPattern.test(content)) {
  content = content.replace(bomIndicatorPattern, newBomIndicator);
  console.log('✅ Added debug logging to BOM indicator render');
}

// Write the modified content back
fs.writeFileSync(productsPath, content);

console.log('\n✅ Debug logging added successfully!');
console.log('\n🚀 Next Steps:');
console.log('1. npm run build');
console.log('2. Refresh browser');
console.log('3. Open DevTools Console (F12)');
console.log('4. Go to Products page');
console.log('5. Check console logs for BOM data loading');
console.log('6. Look for any errors or unexpected values');

console.log('\n📋 Expected Console Output:');
console.log('• [Products] 🔄 Loading products and BOM data...');
console.log('• [Products] 📊 Loaded data: {products: 5490, bomItems: 62}');
console.log('• [Products] 💾 BOM data set to state: {bomCount: 62}');
console.log('• [Products] 🔄 Creating bomProductIdsSet from bomData: 62');
console.log('• [Products] ✅ bomProductIdsSet created: {size: 53}');
console.log('• [Products] 🔍 hasBOM check: {productName: "...", hasBOM: true}');
console.log('• [Products] 🎨 Rendering BOM indicator: {hasBom: true, color: "#388e3c"}');

console.log('\n💡 If BOM indicators still not showing:');
console.log('• Check if bomData state is empty in console logs');
console.log('• Verify bomProductIdsSet size matches expected (53)');
console.log('• Check if hasBOM returns correct values');
console.log('• Look for React rendering errors');

console.log('\n🔧 To remove debug logs later, run:');
console.log('git checkout src/pages/Master/Products.tsx');