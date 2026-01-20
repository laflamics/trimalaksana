# Test BOM Indicators - Debug Guide

## Status
✅ Debug logging telah ditambahkan ke Products.tsx
✅ Build berhasil completed
🔄 Ready untuk testing

## Langkah Testing

### 1. Jalankan Aplikasi
```bash
npm start
# atau jika menggunakan Electron
npm run electron
```

### 2. Buka Browser DevTools
- Tekan **F12** untuk membuka DevTools
- Pilih tab **Console**
- Clear console log (Ctrl+L)

### 3. Navigate ke Products Page
- Buka aplikasi
- Login jika diperlukan
- Navigate ke **Master > Products**

### 4. Monitor Console Output
Anda harus melihat log seperti ini:

```
[Products] 🔄 Loading products and BOM data...
[Products] 📊 Loaded data: {products: 5490, bomItems: 62, bomSample: [...]}
[Products] 💾 BOM data set to state: {bomCount: 62, firstFewIds: [...]}
[Products] 🔄 Creating bomProductIdsSet from bomData: 62
[Products] ✅ bomProductIdsSet created: {size: 53, ids: [...]}
[Products] 🔍 hasBOM check: {productName: "KARTON BOX 430X350X350", productId: "krt04072", hasBOM: true, bomSetSize: 53}
[Products] 🎨 Rendering BOM indicator: {productName: "KARTON BOX 430X350X350", hasBom: true, color: "#388e3c"}
```

### 5. Check BOM Indicators
Pada kolom **BOM** di tabel products, Anda harus melihat:
- **🟢 Green dots** untuk produk yang memiliki BOM (53 produk)
- **🟠 Orange dots** untuk produk yang tidak memiliki BOM

### 6. Expected Results
Produk-produk ini harus menunjukkan **green dot**:
1. KARTON BOX 430X350X350 (KRT04072)
2. LAYER KARTON (KRT04173) 
3. CARTON LAYER 950X770 (KRT00248)
4. CARTON BOX DH1 560X380X340 C/FLUTE (KRT00199)
5. CARTON BOX DH8 POLOS 727X380X320MM (KRT02722)

## Troubleshooting

### Jika Console Log Tidak Muncul
❌ **Problem**: Tidak ada log `[Products]` di console
✅ **Solution**: 
- Pastikan sudah di halaman Products
- Refresh halaman (F5)
- Check apakah ada error di console

### Jika BOM Data Empty
❌ **Problem**: Log menunjukkan `bomItems: 0`
✅ **Solution**:
```javascript
// Test di browser console:
localStorage.getItem('bom')
// Harus return data BOM, bukan null
```

### Jika bomProductIdsSet Empty
❌ **Problem**: Log menunjukkan `bomProductIdsSet created: {size: 0}`
✅ **Solution**:
- Check apakah bomData state ter-populate
- Verify extractStorageValue function

### Jika hasBOM Always False
❌ **Problem**: Semua produk menunjukkan `hasBOM: false`
✅ **Solution**:
- Check case sensitivity di product IDs
- Verify bomProductIdsSet contains correct IDs

### Jika Indicators Tidak Render
❌ **Problem**: Console log OK tapi tidak ada dots di UI
✅ **Solution**:
- Check CSS styling
- Verify React rendering
- Check for JavaScript errors

## Manual Test di Console

Paste kode ini di browser console untuk test manual:

```javascript
// Test BOM data loading
const testBomData = JSON.parse(localStorage.getItem('bom') || '{"value":[]}').value;
console.log('Manual Test - BOM Data:', testBomData.length);

// Test bomProductIdsSet creation
const testSet = new Set();
testBomData.forEach(b => {
  if (b && b.product_id) {
    testSet.add(b.product_id.toLowerCase());
  }
});
console.log('Manual Test - BOM Product IDs:', Array.from(testSet).slice(0, 10));

// Test hasBOM function
const testProduct = {product_id: 'KRT04072', nama: 'KARTON BOX 430X350X350'};
const testResult = testSet.has(testProduct.product_id.toLowerCase());
console.log('Manual Test - Product has BOM:', testResult);
```

## Remove Debug Logs

Setelah selesai testing, hapus debug logs:

```bash
git checkout src/pages/Master/Products.tsx
npm run build
```

## Contact

Jika masih ada masalah, berikan screenshot dari:
1. Console logs
2. Products page (kolom BOM)
3. Manual test results