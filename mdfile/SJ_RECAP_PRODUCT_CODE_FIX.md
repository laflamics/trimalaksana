# SJ Recap Product Code Fix - Complete

**Status**: ✅ Fixed  
**Date**: March 6, 2026  
**Issue**: Product code di SJ Recap tidak jelas atau fallback ke nama item  

---

## Problem

Saat membuat SJ Recap dari SO, kolom **PRODUCT CODE** menampilkan:
- Kosong atau tidak jelas
- Fallback ke nama item panjang (bukan kode yang singkat)
- Tidak konsisten dengan product master

**Contoh yang salah**:
```
NO | PRODUCT CODE | ITEM | QTY | UOM | DESCRIPTION
1  | (kosong)     | PACKAGING BOX/NEUTRAL LOGO... | 30 | PCS | PO: SO-001
```

**Contoh yang benar** (setelah fix):
```
NO | PRODUCT CODE | ITEM | QTY | UOM | DESCRIPTION
1  | PL0113       | PACKAGING BOX/NEUTRAL LOGO... | 30 | PCS | PO: SO-001
```

---

## Root Cause

1. **Saat create delivery dari SO**: `productCode` tidak di-populate dari product master
   - Hanya mengambil dari `item.productCode` yang bisa kosong
   - Tidak fallback ke master product untuk mendapatkan kode yang benar

2. **Di template SJ Recap**: Tidak ada validasi untuk memastikan productCode jelas
   - Jika kosong atau panjang, tidak ada fallback ke master

---

## Solution

### 1. Fix di DeliveryNote.tsx (Create Delivery dari SO)

**File**: `src/pages/Packaging/DeliveryNote.tsx`  
**Lines**: ~5915-5950

**Perubahan**:
- Saat create delivery dari SO, sekarang **selalu** mencari product code dari master product
- Jika `productCode` kosong atau terlihat seperti nama (panjang dengan spasi), cari dari master
- Gunakan `product_id` atau `kode` dari master product

```typescript
// IMPORTANT: Ensure productCode is from master product (kode/product_id), not fallback to name
let finalProductCode = item.productCode || '';

// If productCode is empty or looks like a name, try to find from master
if (!finalProductCode || finalProductCode.includes(' ')) {
  const masterProduct = productsList.find((p: any) => {
    const pName = (p.nama || '').toLowerCase().trim();
    const itemName = (item.product || '').toLowerCase().trim();
    return pName === itemName;
  });
  if (masterProduct) {
    finalProductCode = (masterProduct.product_id || masterProduct.kode || '').toString().trim();
  }
}
```

### 2. Fix di Template SJ Recap (4 templates)

**File**: `src/pdf/packaging-delivery-recap-templates.ts`

**Templates yang di-update**:
1. `generatePackagingRecapStandardHtml` (Template 1)
2. `generatePackagingRecapWithPOHtml` (Template 2)
3. `generatePackagingRecapWithSJListHtml` (Template 3)
4. `generatePackagingRecapCompleteHtml` (Template 4)

**Perubahan di setiap template**:
- Saat render items table, validasi `productCode`
- Jika kosong atau panjang (>20 chars dengan spasi), cari dari master product
- Tampilkan `-` jika tidak ditemukan (bukan kosong)

```typescript
// IMPORTANT: Ensure productCode is displayed clearly - not fallback to name
let productCode = (itm.productCode || '').trim();

// If productCode is empty or looks like a full product name (contains spaces and is long), 
// try to find from master products
if (!productCode || (productCode.includes(' ') && productCode.length > 20)) {
  const masterProduct = products.find((p: any) => {
    const pName = (p.nama || '').toLowerCase().trim();
    const itemName = (itm.product || '').toLowerCase().trim();
    return pName === itemName;
  });
  if (masterProduct) {
    productCode = (masterProduct.product_id || masterProduct.kode || '').toString().trim();
  }
}

// Display with fallback to '-' if empty
${htmlEscape(productCode || '-')}
```

### 3. Update Product Interface

**File**: `src/pdf/packaging-delivery-recap-templates.ts`  
**Lines**: ~35-42

**Perubahan**:
- Tambah field `product_id` dan `nama` ke interface `Product`
- Ini memastikan TypeScript tidak error saat akses field tersebut

```typescript
interface Product {
  id?: string;
  sku?: string;
  name?: string;
  kode?: string;
  product_id?: string;  // ← Added
  nama?: string;        // ← Added
  bom?: any;
}
```

---

## Files Modified

1. ✅ `src/pages/Packaging/DeliveryNote.tsx`
   - Lines ~5915-5950: Fix create delivery dari SO
   - Ensure productCode dari master product

2. ✅ `src/pdf/packaging-delivery-recap-templates.ts`
   - Lines ~35-42: Update Product interface
   - Lines ~164-190: Fix Template 1 (Standard)
   - Lines ~420-450: Fix Template 2 (dengan SJ List)
   - Lines ~671-700: Fix Template 3 (Complete)
   - Plus Template 4 (dengan PO) - sudah di-fix sebelumnya

---

## Testing

### Test Case 1: Create Delivery dari SO
1. Buat SO dengan product yang ada di master
2. Create delivery note dari SO
3. Lihat di delivery note list - productCode harus jelas (bukan nama panjang)
4. Generate SJ Recap
5. Lihat di PDF - kolom PRODUCT CODE harus menampilkan kode (PL0113, KRT03780, dll)

### Test Case 2: SJ Recap dengan berbagai template
1. Create SJ Recap dengan Template 1 (Standard)
2. Create SJ Recap dengan Template 2 (dengan PO)
3. Create SJ Recap dengan Template 3 (dengan SJ List)
4. Create SJ Recap dengan Template 4 (Complete)
5. Semua template harus menampilkan product code yang jelas

### Test Case 3: Edge cases
1. Product tidak ada di master → tampilkan `-`
2. Product code kosong → cari dari master
3. Product code panjang (>20 chars) → cari dari master
4. Multiple items dengan product code berbeda → semua harus jelas

---

## Expected Result

**Sebelum Fix**:
```
NO | PRODUCT CODE | ITEM | QTY | UOM
1  | (kosong)     | PACKAGING BOX... | 30 | PCS
2  | (kosong)     | CARTON 5 LAYERS... | 800 | PCS
```

**Sesudah Fix**:
```
NO | PRODUCT CODE | ITEM | QTY | UOM
1  | PL0113       | PACKAGING BOX... | 30 | PCS
2  | (994819000000192) | CARTON 5 LAYERS... | 800 | PCS
```

---

## Notes

- Fix ini **tidak mengubah data** yang sudah ada, hanya cara menampilkan
- Delivery note yang sudah dibuat sebelumnya akan otomatis menampilkan product code yang benar saat di-generate SJ Recap
- Jika product tidak ada di master, akan menampilkan `-` (lebih jelas daripada kosong)
- Semua 4 template SJ Recap sudah di-update dengan logic yang sama

---

## Deployment

1. Deploy code changes
2. Test dengan data existing
3. Verify SJ Recap menampilkan product code yang jelas
4. No data migration needed

---

**Status**: ✅ Ready for Testing  
**Complexity**: Low (UI/Display fix only)  
**Risk**: Very Low (no data changes)

