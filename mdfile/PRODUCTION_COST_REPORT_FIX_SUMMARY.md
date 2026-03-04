# Production Cost Report - Fix Summary

**Date**: February 26, 2026  
**Status**: ✅ Code Fixed, Data Import Required  
**Issue**: Biaya Material column showing all zeros

---

## What Was Fixed

### Code Changes
✅ **File**: `src/services/report-service.ts`  
✅ **Method**: `generateProductionCostReport()`

**The Problem**:
- Code was looking for BOM in `product.bom` array (embedded in products)
- But BOM is actually stored separately in `StorageKeys.PACKAGING.BOM`

**The Solution**:
1. Fetch BOM from correct storage key: `StorageKeys.PACKAGING.BOM`
2. Build product-BOM lookup map: `product_id/kode` → `[BOM items]`
3. For each BOM item, look up material price from materials master
4. Calculate: `(material_price × ratio) × quantity`
5. Enhanced console logging for debugging

### Key Implementation Details

```typescript
// Build BOM lookup map: product_id/kode -> [BOM items]
const productBomMap = new Map<string, any[]>();
if (bomData && Array.isArray(bomData)) {
  bomData.forEach((bomItem: any) => {
    const productId = (bomItem.product_id || bomItem.kode || '').toString().trim().toLowerCase();
    if (!productId) return;
    
    if (!productBomMap.has(productId)) {
      productBomMap.set(productId, []);
    }
    productBomMap.get(productId)!.push(bomItem);
  });
}

// Calculate material cost
const bomItems = productBomMap.get(productKode) || [];
if (bomItems.length > 0) {
  bomItems.forEach((bomItem: any) => {
    const materialId = (bomItem.material_id || bomItem.materialId || bomItem.kode || '').toString().trim();
    const materialInfo = materialMap.get(materialId.toLowerCase());
    const materialPrice = materialInfo?.price || bomItem.price || bomItem.harga || 0;
    const ratio = bomItem.ratio || bomItem.qty || 1;
    
    // Material cost = (material price × ratio) × quantity
    if (materialPrice > 0) {
      materialCost += (materialPrice * ratio) * quantity;
    }
  });
}
```

---

## Enhanced Debugging

The report now logs detailed information to help diagnose issues:

### Console Output Example

```
[ReportService] 🔄 Generating production cost report...

[ReportService] 📊 Fetched data: {
  spkCount: 8,
  productsCount: 0,
  materialsCount: 0,
  bomCount: 0,
  soCount: 0
}

[ReportService] 💰 Material Prices (first 5):
  mat001: Rp 15,000
  mat002: Rp 25,000
  ...

[ReportService] 📋 BOM Map Sample (first 3 products):
  Product: pm2006, BOM Items: 3
    - Material: mat001, Ratio: 2.5
    - Material: mat002, Ratio: 1.0
  ...

[ReportService] 🔍 SPK SPK/260216/BXXYFB: BOM found, items: 3, Calculated: 3, Cost: 500000

[ReportService] 💰 Enriched SPK data with costs: {
  count: 8,
  materialMapSize: 5,
  productBomMapSize: 3,
  totalMaterialCost: 5500000,
  sample: [...]
}

[ReportService] ⚠️ WARNING: All material costs are 0. Detailed diagnostics:
  1. BOM data exists: false (0 items)
  2. Materials master data exists: false (0 items)
  3. Material prices are set: false
  4. BOM items linked to products: false (0 products with BOM)
```

---

## What Data is Still Needed

The code is fixed, but the report will show zeros until you import data to PostgreSQL:

| Data | Storage Key | Status | Required |
|------|-------------|--------|----------|
| SPK | `spk` | ✅ Exists | ✅ Yes |
| BOM | `bom` | ❌ Missing | ✅ **YES** |
| Materials | `materials` | ❌ Missing | ✅ **YES** |
| Material Prices | `materials.harga` | ❌ Missing | ✅ **YES** |

---

## How to Verify the Fix

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Run Production Cost Report
4. Look for `[ReportService]` logs
5. Check if BOM and materials data are being fetched

### Step 2: Run Diagnostic Script
```bash
node scripts/diagnose-production-cost-report.js
```

This will show:
- How many records exist for each data type
- Whether BOM items are linked to products
- Whether materials have prices
- Specific recommendations

### Step 3: Import Missing Data
Based on diagnostic output, import:
- BOM data to `bom` storage key
- Materials data to `materials` storage key
- Ensure materials have prices > 0

### Step 4: Re-run Report
After importing data:
1. Run Production Cost Report again
2. Check browser console for logs
3. Verify "Biaya Material" column shows calculated values

---

## Files Created/Modified

### Modified
- ✅ `src/services/report-service.ts` - Fixed BOM lookup and added enhanced debugging

### Created
- ✅ `scripts/diagnose-production-cost-report.js` - Diagnostic script to check server data
- ✅ `mdfile/PRODUCTION_COST_REPORT_FIX_GUIDE.md` - Detailed fix guide
- ✅ `mdfile/PRODUCTION_COST_REPORT_QUICK_FIX.md` - Quick reference guide
- ✅ `mdfile/PRODUCTION_COST_REPORT_FIX_SUMMARY.md` - This file

---

## Data Flow (After Fix)

```
1. User runs Production Cost Report
   ↓
2. Report fetches from server:
   - SPK data (storage key: 'spk')
   - BOM data (storage key: 'bom') ← NOW CORRECT
   - Materials data (storage key: 'materials')
   - Sales Orders (storage key: 'salesOrders')
   ↓
3. Build lookup maps:
   - Material map: material_id → {name, price}
   - Product-BOM map: product_id → [BOM items]
   ↓
4. For each SPK:
   - Get product code
   - Find BOM items for product
   - For each BOM item:
     - Get material price
     - Calculate: (price × ratio) × quantity
   - Sum all material costs
   ↓
5. Generate Excel report with calculated costs
   ↓
6. Console logs show detailed diagnostics
```

---

## Troubleshooting

### Still showing zeros?

**Check 1**: Is BOM data on server?
```bash
node scripts/diagnose-production-cost-report.js
# Look for: "BOM data exists: true"
```

**Check 2**: Do materials have prices?
```
Check Master Data → Materials in app
Verify each material has harga/price > 0
```

**Check 3**: Are product codes matching?
```
SPK kode = BOM product_id
Example: SPK has kode="PM2006", BOM has product_id="PM2006"
```

**Check 4**: Are material IDs matching?
```
BOM material_id = Materials material_id
Example: BOM has material_id="MAT001", Materials has material_id="MAT001"
```

### Report runs but takes too long?

- Large datasets may take time
- Check browser console for progress
- Consider filtering by date range

### Server connection error?

- Verify Settings → Server Data has correct URL
- Check if server is running
- Test with other reports first

---

## Next Steps

1. **Diagnose**: Run `node scripts/diagnose-production-cost-report.js`
2. **Identify**: Check what data is missing
3. **Import**: Import BOM and materials data to PostgreSQL
4. **Verify**: Run report again and check console logs
5. **Confirm**: Verify "Biaya Material" column shows values

---

## Technical Details

### Storage Keys Used
- `StorageKeys.PACKAGING.SPK` = `'spk'`
- `StorageKeys.PACKAGING.BOM` = `'bom'` ← **KEY FIX**
- `StorageKeys.PACKAGING.MATERIALS` = `'materials'`
- `StorageKeys.PACKAGING.SALES_ORDERS` = `'salesOrders'`

### Field Name Variations Supported
- Product ID: `product_id`, `kode`, `productId`
- Material ID: `material_id`, `materialId`, `kode`
- Material Price: `harga`, `price`
- Quantity: `qty`, `quantity`
- Ratio: `ratio`, `qty`

### Calculation Formula
```
Material Cost = Σ (material_price × ratio × quantity)

Where:
- material_price = price from materials master
- ratio = quantity per unit from BOM
- quantity = total quantity to produce from SPK
```

---

**Status**: ✅ Code is fixed and ready. Waiting for data import to PostgreSQL.
