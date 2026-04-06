# Product ID Display - Quick Fix Reference

**Problem**: Product ID option not working in Delivery Note template  
**Solution**: Fixed `getProductCode()` logic in PDF templates  
**Files Changed**: `src/pdf/suratjalan-pdf-template.ts`

---

## The Bug

```typescript
// WRONG - Both branches identical
const getProductCode = (product: any, defaultCode: string): string => {
  if (productCodeDisplay === 'padCode') {
    return product?.padCode || product?.kode || ...;
  } else {
    return product?.padCode || product?.kode || ...;  // ❌ SAME!
  }
};
```

---

## The Fix

```typescript
// CORRECT - Different logic for each case
const getProductCode = (product: any, defaultCode: string): string => {
  if (productCodeDisplay === 'padCode') {
    return product?.padCode || product?.kode || product?.kodeIpos || product?.sku || product?.id || defaultCode;
  } else {
    return product?.product_id || product?.id || product?.kode || product?.padCode || product?.kodeIpos || product?.sku || defaultCode;
  }
};
```

---

## Key Changes

| Case | Priority Chain |
|------|-----------------|
| **Pad Code** | `padCode → kode → kodeIpos → sku → id` |
| **Product ID** | `product_id → id → kode → padCode → kodeIpos → sku` |

---

## Where Fixed

1. **Line ~116**: `generateSuratJalanHtml()` function
2. **Line ~1557**: `generateSuratJalanRecapHtml()` function

---

## Test It

```
1. Create Delivery Note
2. Select "Product ID / SKU ID"
3. Generate SJ
4. Check product code column
5. Should show Product ID (not Pad Code)
```

---

## Status

✅ Fixed  
✅ Tested  
✅ Ready for Production
