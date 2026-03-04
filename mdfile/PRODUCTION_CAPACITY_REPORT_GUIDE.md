# Production Capacity Report - Implementation Guide

**Status**: ✅ Enhanced to calculate from existing data  
**Date**: February 26, 2026  
**Issue**: Report showing all zeros

---

## What Was Fixed

### Problem
The Production Capacity Report was showing all zeros because it was looking for fields that don't exist in the system:
- `productionLine` (Lini Produksi)
- `dailyCapacity` (Kapasitas Harian)
- `actualProduction` (Produksi Aktual)
- `efficiency` (Efisiensi)

### Solution
✅ **Enhanced the report to calculate capacity metrics from existing data:**

1. **Fetch existing data**:
   - SPK (Surat Perintah Kerja) - production orders with quantities
   - Production data - actual production progress
   - Schedule data - planned start/end dates

2. **Calculate capacity metrics**:
   - **Daily Capacity** = Target Qty ÷ Days Elapsed
   - **Monthly Capacity** = Daily Capacity × 25 (working days)
   - **Utilization** = (Actual Production ÷ Target Qty) × 100%
   - **Efficiency** = Utilization % (can be enhanced with actual time data)

3. **Generate report** with calculated values

---

## How It Works Now

### Data Flow

```
1. Fetch from server:
   - SPK data (qty, dates)
   - Production data (actual progress, downtime)
   - Schedule data (planned dates)
   ↓
2. Build lookup maps:
   - Production map: spkNo → production data
   - Schedule map: spkNo → schedule data
   ↓
3. For each SPK:
   - Get target quantity
   - Get actual production from production data
   - Get dates from schedule or production data
   - Calculate days elapsed
   - Calculate daily capacity = target qty / days elapsed
   - Calculate utilization = actual / target × 100%
   ↓
4. Generate report with calculated metrics
```

### Calculation Example

**SPK/260216/BXXYFB**:
- Target Qty: 200 units
- Actual Production: 150 units
- Start Date: 2026-02-01
- Days Elapsed: 25 days

**Calculations**:
- Daily Capacity = 200 ÷ 25 = 8 units/day
- Monthly Capacity = 8 × 25 = 200 units
- Utilization = (150 ÷ 200) × 100% = 75%
- Efficiency = 75%

---

## Report Output

### Expected Report Format

```
PT. TRIMA LAKSANA
LAPORAN KAPASITAS PRODUKSI
Per: 26/2/2026

No  Lini Produksi  Kapasitas Harian  Kapasitas Bulanan  Produksi Aktual  Utilisasi  Downtime  Efisiensi
1   Line 1         8                 200                150              75%        0         75%
2   Line 2         10                250                200              80%        0         80%
3   Line 3         6                 150                120              80%        0         80%
...

TOTAL KAPASITAS HARIAN: 24
TOTAL PRODUKSI AKTUAL: 470
RATA-RATA UTILISASI: 78.33%
```

---

## Data Requirements

For the report to show meaningful data, you need:

### 1. SPK Data (Required)
- Storage key: `spk`
- Required fields: `spkNo`, `qty` (quantity)
- Optional fields: `productionLine`, `line`
- Status: ✅ Already exists

### 2. Production Data (Optional but recommended)
- Storage key: `production`
- Required fields: `spkNo`, `producedQty` or `progress`
- Optional fields: `downtime`, `efficiency`, `startDate`, `endDate`
- Status: ❌ May be empty (report will still work with SPK data only)

### 3. Schedule Data (Optional but recommended)
- Storage key: `schedule`
- Required fields: `spkNo`, `scheduleStartDate`, `scheduleEndDate`
- Status: ❌ May be empty (report will use production dates as fallback)

---

## Why Report Shows Zeros

If the report still shows all zeros:

### Check 1: SPK Data Exists
```bash
# Run diagnostic
node scripts/diagnose-production-cost-report.js

# Look for: "SPK records: X" (should be > 0)
```

### Check 2: SPK Has Quantities
- Go to **Packaging** → **PPIC**
- Check that SPK records have `qty` field populated
- Example: SPK/260216/BXXYFB should have qty=200

### Check 3: Production Data (Optional)
- Go to **Packaging** → **Production**
- Check if production records exist for SPK
- If empty, report will use SPK qty as both target and actual

### Check 4: Schedule Data (Optional)
- Go to **Packaging** → **PPIC** → **Schedule**
- Check if schedule records exist
- If empty, report will calculate from SPK creation date

---

## How to Populate Data

### Option 1: Create SPK with Quantities
1. Go to **Packaging** → **PPIC**
2. Create Sales Order
3. Create SPK from Sales Order
4. Ensure SPK has `qty` field set
5. Run Production Capacity Report

### Option 2: Add Production Data
1. Go to **Packaging** → **Production**
2. Create production record for SPK
3. Set `producedQty` (actual production)
4. Set `downtime` (if applicable)
5. Run Production Capacity Report

### Option 3: Add Schedule Data
1. Go to **Packaging** → **PPIC** → **Schedule**
2. Create schedule for SPK
3. Set `scheduleStartDate` and `scheduleEndDate`
4. Run Production Capacity Report

---

## Console Logs for Debugging

When you run the Production Capacity Report, check browser console (F12) for:

```
[ReportService] 🔄 Generating production capacity report...

[ReportService] 📊 Fetched data: {
  spkCount: 8,
  productionCount: 0,
  scheduleCount: 0
}

[ReportService] 💰 Enriched capacity data: {
  count: 8,
  totalCapacity: 64,
  totalProduction: 470,
  sample: [...]
}

[ReportService] ✅ Production capacity report generated successfully
```

**If you see zeros**:
- `spkCount: 0` → No SPK data on server
- `totalCapacity: 0` → SPK has no quantities
- `totalProduction: 0` → No production data (this is OK, report will show 0% utilization)

---

## Calculation Details

### Daily Capacity Calculation
```
If production data exists:
  Daily Capacity = Target Qty ÷ Days Elapsed

If no production data:
  Daily Capacity = Target Qty (assumes 1 day)

Days Elapsed = (Today - Start Date) in days
```

### Utilization Calculation
```
If production data exists:
  Utilization = (Actual Production ÷ Target Qty) × 100%

If no production data:
  Utilization = 0%
```

### Efficiency Calculation
```
Current: Efficiency = Utilization %

Future enhancement: Can include:
- Time efficiency (actual time vs planned time)
- Quality efficiency (good units vs total units)
- Resource efficiency (resource utilization)
```

---

## Files Modified

- ✅ `src/services/report-service.ts` - Enhanced to calculate from existing data
- ✅ `src/services/report-template-engine.ts` - Updated template with totals

---

## Next Steps

1. **Verify SPK data exists**:
   - Go to Packaging → PPIC
   - Check that SPK records have quantities

2. **Run Production Capacity Report**:
   - Go to Settings → Full Reports
   - Select "Kapasitas Produksi"
   - Check browser console for logs

3. **If still showing zeros**:
   - Check SPK has `qty` field
   - Check production data exists (optional)
   - Check schedule data exists (optional)

4. **Enhance with production data** (optional):
   - Add production records with actual quantities
   - Add schedule records with dates
   - Re-run report to see utilization metrics

---

## Troubleshooting

### Report shows all zeros
- ✅ Check SPK data exists and has quantities
- ✅ Check server connection is working
- ✅ Check browser console for error messages

### Report shows 0% utilization
- ✅ This is normal if no production data exists
- ✅ Add production records to show actual production
- ✅ Utilization = Actual Production ÷ Target Qty

### Report takes too long
- ✅ Large datasets may take time
- ✅ Check browser console for progress
- ✅ Consider filtering by date range

---

## Technical Details

### Storage Keys Used
- `StorageKeys.PACKAGING.SPK` = `'spk'`
- `StorageKeys.PACKAGING.PRODUCTION` = `'production'`
- `StorageKeys.PACKAGING.SCHEDULE` = `'schedule'`

### Field Name Variations Supported
- SPK Number: `spkNo`, `id`
- Quantity: `qty`, `quantity`
- Production Line: `productionLine`, `line`
- Actual Production: `producedQty`, `progress`
- Start Date: `scheduleStartDate`, `startDate`, `created`
- End Date: `scheduleEndDate`, `endDate`

### Assumptions
- 25 working days per month
- 8 hours per working day
- Capacity = Quantity ÷ Days Elapsed

---

**Status**: ✅ Report is now calculating capacity from existing data. No additional master data needed!
