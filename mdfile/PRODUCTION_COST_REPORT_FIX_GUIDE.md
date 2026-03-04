# Production Cost Report - Material Cost Fix Guide

**Status**: Fixed in code, but data needs to be populated on server  
**Date**: February 2026  
**Issue**: Biaya Material (Material Cost) column showing all zeros

---

## Problem Summary

The Production Cost Report is showing all zeros for "Biaya Material" (Material Cost) column because:

1. **Code was looking in wrong place**: Was looking for BOM in `product.bom` array, but BOM is stored separately in PostgreSQL
2. **Data not on server**: Even with the code fix, the BOM and materials data need to be imported to PostgreSQL on the server

---

## What Was Fixed in Code

✅ **Updated `src/services/report-service.ts`** method `generateProductionCostReport()`:

- Now fetches BOM data from `StorageKeys.PACKAGING.BOM` (separate storage key)
- Builds a product-BOM lookup map correctly
- Calculates material costs: `(material_price × ratio) × quantity`
- Enhanced console logging for debugging

**Key change**: BOM data is stored separately, not embedded in products!

```
OLD (WRONG):
  product.bom → array of BOM items

NEW (CORRECT):
  StorageKeys.PACKAGING.BOM → separate storage with all BOM items
  → Build map: product_id/kode → [BOM items]
  → Look up material prices from materials master
  → Calculate: (price × ratio) × quantity
```

---

## What Data is Required on Server

For the report to work, you need these data on PostgreSQL server:

### 1. **SPK Data** (Surat Perintah Kerja)
- Storage key: `spk`
- Required fields: `spkNo`, `kode` (product code), `qty` (quantity)
- Status: ✅ Already exists (report shows 8 SPK records)

### 2. **BOM Data** (Bill of Materials)
- Storage key: `bom`
- Required fields: `product_id` or `kode` (link to product), `material_id`, `ratio` (quantity per unit)
- Status: ❌ **MISSING or EMPTY** (this is why costs are zero!)
- **Action needed**: Import BOM data to PostgreSQL

### 3. **Materials Master** (Daftar Material)
- Storage key: `materials`
- Required fields: `material_id` or `kode`, `nama` (name), `harga` or `price` (unit price)
- Status: ❌ **MISSING or EMPTY** (this is why costs are zero!)
- **Action needed**: Import materials master to PostgreSQL

### 4. **Sales Orders** (Optional, for quantity enrichment)
- Storage key: `salesOrders`
- Used to get order quantity if not in SPK
- Status: May or may not exist

---

## How to Diagnose the Issue

### Step 1: Run Diagnostic Script

```bash
node scripts/diagnose-production-cost-report.js
```

This will show:
- How many records exist for each data type
- Whether BOM items are linked to products
- Whether materials have prices set
- Specific recommendations for what's missing

### Step 2: Check Browser Console

When you run the Production Cost Report:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs starting with `[ReportService]`
4. Check these specific logs:
   - `📊 Fetched data:` - Shows counts of each data type
   - `💰 Enriched SPK data with costs:` - Shows if costs were calculated
   - `⚠️ WARNING:` - Shows what's missing

Example output:
```
[ReportService] 📊 Fetched data: {
  spkCount: 8,
  productsCount: 0,
  materialsCount: 0,
  bomCount: 0,
  soCount: 0
}

[ReportService] ⚠️ WARNING: All material costs are 0. Detailed diagnostics:
  1. BOM data exists: false (0 items)
  2. Materials master data exists: false (0 items)
  3. Material prices are set: false
  4. BOM items linked to products: false (0 products with BOM)
```

---

## Data Import Instructions

### Option 1: Import from Existing JSON Files

If you have BOM and materials data in JSON format:

```bash
# Check if data files exist
ls scripts/master/packaging/

# Look for files like:
# - bom.json
# - materials.json
# - daftar_material.json
```

### Option 2: Import from CSV

If you have CSV files:

```bash
# Convert CSV to JSON
node scripts/convert-packaging-csv-to-json.js

# Then import to PostgreSQL
node scripts/import-all-json-to-postgres.js
```

### Option 3: Manual Entry

If no data files exist, you need to:

1. Go to **Master Data** → **Materials** in the app
2. Add materials with:
   - Material ID/Code
   - Material Name
   - Unit Price (Harga)
3. Go to **Master Data** → **Products** in the app
4. For each product, add BOM items:
   - Select material
   - Enter ratio (quantity per unit)

---

## Data Structure Reference

### BOM Item Structure
```json
{
  "id": "unique-id",
  "product_id": "PM2006",  // or "kode"
  "material_id": "MAT001",  // or "materialId"
  "material_name": "Kertas Kraft",
  "ratio": 2.5,  // quantity per unit
  "unit": "kg",
  "price": 15000  // optional, from materials master
}
```

### Material Structure
```json
{
  "id": "unique-id",
  "material_id": "MAT001",  // or "kode"
  "nama": "Kertas Kraft",
  "harga": 15000,  // IMPORTANT: Must be > 0
  "satuan": "kg",
  "supplier": "Supplier A"
}
```

### SPK Structure
```json
{
  "id": "unique-id",
  "spkNo": "SPK/260216/BXXYFB",
  "kode": "PM2006",  // product code
  "productName": "BULK BOX 8\"",
  "qty": 200,  // quantity to produce
  "soNo": "SO/260216/001"
}
```

---

## Verification Checklist

After importing data, verify:

- [ ] BOM data exists on server (check with diagnostic script)
- [ ] Materials master exists on server
- [ ] Materials have prices > 0
- [ ] BOM items are linked to products (product_id matches)
- [ ] Material IDs in BOM match material IDs in materials master
- [ ] Run Production Cost Report again
- [ ] Check browser console for calculation details
- [ ] Verify "Biaya Material" column now shows values

---

## Expected Output After Fix

When everything is set up correctly, the report should show:

```
PT. TRIMA LAKSANA
LAPORAN BIAYA PRODUKSI
Periode: 2026-01-31 s/d 2026-02-25

No  SPK No.              Produk                          Qty   Biaya Material  Biaya Tenaga Kerja  ...
1   SPK/260216/BXXYFB    BULK BOX 8" (PM2006)           200   500,000         0                  ...
2   SPK/260216/0E8X5     OUT BOX BOSCH VA 4-5 INCH...   500   1,250,000       0                  ...
3   SPK/260216/AQS3Y     OUTBOX BOSCH SLEEVE 4-5...    1500   3,750,000       0                  ...
...

TOTAL BIAYA MATERIAL: 5,500,000
```

---

## Troubleshooting

### Still showing zeros after importing data?

1. **Check server connection**:
   - Verify Settings → Server Data shows correct server URL
   - Test connection by checking if other reports work

2. **Check data on server**:
   - Run diagnostic script: `node scripts/diagnose-production-cost-report.js`
   - Verify BOM and materials data exists

3. **Check data linkage**:
   - Verify product codes in SPK match product codes in BOM
   - Verify material IDs in BOM match material IDs in materials master
   - Check browser console for detailed logs

4. **Check material prices**:
   - Verify materials have `harga` or `price` field > 0
   - Check materials master in app: Master Data → Materials

### Report runs but takes too long?

- Large datasets may take time to process
- Check browser console for progress logs
- Consider filtering by date range to reduce data

---

## Files Modified

- ✅ `src/services/report-service.ts` - Fixed BOM lookup logic
- ✅ `scripts/diagnose-production-cost-report.js` - New diagnostic script

---

## Next Steps

1. **Run diagnostic**: `node scripts/diagnose-production-cost-report.js`
2. **Identify missing data**: Check output to see what needs to be imported
3. **Import data**: Use appropriate import script or manual entry
4. **Verify**: Run Production Cost Report again and check browser console
5. **Confirm**: Verify "Biaya Material" column shows calculated values

---

**Questions?** Check browser console logs when running the report for detailed diagnostic information.
