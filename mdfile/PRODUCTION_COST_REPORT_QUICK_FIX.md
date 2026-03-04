# Production Cost Report - Quick Fix (TL;DR)

## The Issue
Biaya Material column showing all zeros ❌

## Root Cause
- ✅ Code is now fixed (fetches BOM from correct location)
- ❌ **BOM and Materials data NOT on server** (PostgreSQL)

## Quick Diagnosis

Run this to see what's missing:
```bash
node scripts/diagnose-production-cost-report.js
```

Or check browser console (F12) when running the report - look for:
```
[ReportService] ⚠️ WARNING: All material costs are 0. Detailed diagnostics:
  1. BOM data exists: false ← THIS IS THE PROBLEM
  2. Materials master data exists: false ← THIS IS THE PROBLEM
```

## What You Need to Do

### Option A: Quick Check (5 minutes)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run Production Cost Report
4. Look for `[ReportService]` logs
5. Check if BOM and materials data exist

### Option B: Import Data (if you have files)
```bash
# If you have BOM and materials JSON files
node scripts/import-all-json-to-postgres.js
```

### Option C: Manual Entry (if no files)
1. Go to **Master Data** → **Materials**
2. Add materials with prices
3. Go to **Master Data** → **Products**
4. Add BOM for each product

## Verify It Works

After importing data:
1. Run Production Cost Report again
2. Check browser console for logs
3. Verify "Biaya Material" column shows numbers (not zeros)

## Key Data Needed

| Data | Storage Key | Status | Action |
|------|-------------|--------|--------|
| SPK | `spk` | ✅ Exists | None |
| BOM | `bom` | ❌ Missing | **Import or create** |
| Materials | `materials` | ❌ Missing | **Import or create** |
| Material Prices | `materials.harga` | ❌ Missing | **Set prices** |

## The Fix (Already Done)

Code now correctly:
1. Fetches BOM from `StorageKeys.PACKAGING.BOM` (not from products)
2. Builds product → BOM items map
3. Looks up material prices
4. Calculates: `(price × ratio) × quantity`

## Still Not Working?

Check:
1. ✅ Server URL correct? (Settings → Server Data)
2. ✅ BOM data on server? (Run diagnostic script)
3. ✅ Materials have prices? (Check Master Data → Materials)
4. ✅ Product codes match? (SPK kode = BOM product_id)
5. ✅ Material IDs match? (BOM material_id = Materials material_id)

---

**TL;DR**: Code is fixed. Import BOM and materials data to PostgreSQL. Done! 🎉
