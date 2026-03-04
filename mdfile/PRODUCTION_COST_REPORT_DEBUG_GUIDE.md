# Production Cost Report - Debug Guide

**Status**: Biaya Material masih menunjukkan 0  
**Root Cause**: Data BOM atau Materials tidak ada di server PostgreSQL  
**Solution**: Populate data ke server, pastikan product codes match

---

## 🔍 Diagnosis Steps

### Step 1: Verify Server Mode is Enabled

1. Go to **Settings** → **Server Data**
2. Check that **Server URL** is configured
3. Verify you're in **Server Mode** (not Local Mode)

If not configured:
- Go to **Settings** → **Server Data**
- Enter your server URL (e.g., `http://localhost:3000`)
- Click **Save**

### Step 2: Check Data on Server

Run this debug script in browser console:

```javascript
// Copy and paste this entire script into browser console
async function debugProductionCostReport() {
  console.log('🔍 Debugging Production Cost Report Data...\n');
  
  const config = JSON.parse(localStorage.getItem('storage_config') || '{}');
  console.log('📋 Storage Config:', config);
  
  if (config.type !== 'server' || !config.serverUrl) {
    console.error('❌ ERROR: Not in server mode!');
    return;
  }
  
  const serverUrl = config.serverUrl;
  
  async function fetchFromServer(key) {
    try {
      const response = await fetch(`${serverUrl}/api/storage/${encodeURIComponent(key)}`);
      if (!response.ok) return null;
      const data = await response.json();
      const value = data.value !== undefined ? data.value : data;
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      return null;
    }
  }
  
  const spkData = await fetchFromServer('spk');
  const bomData = await fetchFromServer('bom');
  const materialsData = await fetchFromServer('materials');
  
  console.log('📊 Data Summary:');
  console.log(`  SPK Records: ${spkData?.length || 0}`);
  console.log(`  BOM Records: ${bomData?.length || 0}`);
  console.log(`  Materials Records: ${materialsData?.length || 0}\n`);
  
  if (!bomData || bomData.length === 0) {
    console.error('❌ CRITICAL: No BOM data on server!');
  }
  
  if (!materialsData || materialsData.length === 0) {
    console.error('❌ CRITICAL: No Materials data on server!');
  }
  
  // Check material prices
  let materialsWithPrice = 0;
  materialsData?.forEach((mat) => {
    const price = parseFloat(mat.harga || mat.price || '0') || 0;
    if (price > 0) materialsWithPrice++;
  });
  
  console.log(`  Materials with Price: ${materialsWithPrice}/${materialsData?.length || 0}`);
  
  if (materialsWithPrice === 0) {
    console.error('❌ CRITICAL: No materials have prices set!');
  }
}

debugProductionCostReport();
```

### Step 3: Interpret Console Output

**Expected Output:**
```
📊 Data Summary:
  SPK Records: 8
  BOM Records: 15
  Materials Records: 20
  Materials with Price: 20/20
```

**If you see zeros:**

| Issue | Solution |
|-------|----------|
| `SPK Records: 0` | Create SPK records in Packaging → PPIC |
| `BOM Records: 0` | Create BOM entries in Master → Products |
| `Materials Records: 0` | Import materials in Master → Materials |
| `Materials with Price: 0/20` | Set prices for all materials |

---

## 🛠️ How to Fix

### Issue 1: No BOM Data

**Location**: Master Data → Products

1. Go to **Master** → **Products**
2. Select a product
3. Click **Edit BOM**
4. Add materials with:
   - Material ID
   - Material Name
   - Ratio (quantity per unit)
   - Unit
5. Click **Save**

### Issue 2: No Materials Data

**Location**: Master Data → Materials

1. Go to **Master** → **Materials** (if available)
2. Import materials CSV or add manually
3. Each material must have:
   - Material ID (kode)
   - Material Name (nama)
   - Price (harga)

### Issue 3: Materials Have No Prices

**Location**: Master Data → Materials

1. Go to **Master** → **Materials**
2. For each material, set the **Price** field
3. Example:
   - Material: `KERTAS_A4`
   - Price: `50000` (Rp 50,000)
4. Click **Save**

### Issue 4: Product Codes Don't Match

**Problem**: SPK has product code `PM2006`, but BOM has product code `BULK_BOX_8`

**Solution**: Ensure product codes are consistent:
- In SPK: Use the same product code as in BOM
- In BOM: Use the same product code as in Products master
- All must match exactly (case-insensitive)

---

## 📋 Data Flow for Material Cost Calculation

```
SPK (spkNo, kode/product_id, qty)
  ↓
  ├─→ Get product code from SPK
  │
  ├─→ Find BOM items for this product
  │   (BOM table: product_id → [material_id, ratio])
  │
  ├─→ For each BOM item:
  │   ├─→ Get material price from Materials master
  │   ├─→ Calculate: (price × ratio) × qty
  │   └─→ Add to total material cost
  │
  └─→ Result: Total Material Cost
```

---

## 🔧 Troubleshooting

### Report Still Shows Zeros After Fix

1. **Clear browser cache**:
   - Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
   - Clear all cache
   - Reload page

2. **Verify data was saved to server**:
   - Go to **Settings** → **Server Data**
   - Check that `bom` and `materials` keys show data

3. **Check server logs**:
   - Look for errors in server console
   - Verify PostgreSQL is running
   - Check API endpoints are responding

### Product Codes Not Matching

**Debug**: Run this in console to see available product codes:

```javascript
async function checkProductCodes() {
  const config = JSON.parse(localStorage.getItem('storage_config') || '{}');
  const serverUrl = config.serverUrl;
  
  async function fetch(key) {
    const response = await fetch(`${serverUrl}/api/storage/${encodeURIComponent(key)}`);
    const data = await response.json();
    return Array.isArray(data.value) ? data.value : [];
  }
  
  const spkData = await fetch('spk');
  const bomData = await fetch('bom');
  
  console.log('SPK Product Codes:');
  spkData.slice(0, 3).forEach(spk => {
    console.log(`  - ${spk.kode || spk.product_id}`);
  });
  
  console.log('\nBOM Product Codes:');
  const bomProducts = new Set();
  bomData.forEach(bom => {
    bomProducts.add(bom.product_id || bom.kode);
  });
  Array.from(bomProducts).slice(0, 3).forEach(code => {
    console.log(`  - ${code}`);
  });
}

checkProductCodes();
```

---

## ✅ Verification Checklist

Before running the report, verify:

- [ ] Server mode is enabled in Settings
- [ ] Server URL is configured correctly
- [ ] SPK data exists (check in Settings → Server Data)
- [ ] BOM data exists (check in Settings → Server Data)
- [ ] Materials data exists (check in Settings → Server Data)
- [ ] All materials have prices set (> 0)
- [ ] Product codes in SPK match product codes in BOM
- [ ] Browser cache is cleared

---

## 📊 Expected Report Output

After fixing the data, the report should show:

```
PT. TRIMA LAKSANA
LAPORAN BIAYA PRODUKSI
Periode: 2026-01-31 s/d 2026-02-25

No  SPK              Produk                    Qty   Biaya Material  Biaya TK  Biaya OH  Total Biaya
1   SPK/260216/BXXYF BULK BOX 8" (PM2006)     200   500,000         0         0         500,000
2   SPK/260216/0E8X5 OUT BOX BOSCH VA 4-5"   500   1,250,000       0         0         1,250,000
3   SPK/260216/AQS3Y OUTBOX BOSCH SLEEVE 4-5" 1500  3,750,000       0         0         3,750,000
...

TOTAL BIAYA MATERIAL:     5,500,000
TOTAL BIAYA TENAGA KERJA: 0
TOTAL BIAYA OVERHEAD:     0
TOTAL BIAYA PRODUKSI:     5,500,000
```

---

## 🚀 Quick Fix Checklist

If report shows all zeros:

1. **Check BOM exists**: `Settings → Server Data` → Look for `bom` key
2. **Check Materials exists**: `Settings → Server Data` → Look for `materials` key
3. **Check prices**: Run debug script, look for `Materials with Price`
4. **Check product codes match**: Run product code debug script
5. **Clear cache**: `Ctrl+Shift+Delete` → Clear all → Reload
6. **Try again**: Run Production Cost Report

---

## 📞 Still Not Working?

1. Run the debug script and share console output
2. Check server logs for errors
3. Verify PostgreSQL is running
4. Verify API endpoints are accessible
5. Check network tab in DevTools for failed requests

---

**Last Updated**: February 2026  
**Version**: 1.0
