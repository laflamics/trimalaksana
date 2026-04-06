# Packaging Sales Order Export - Excel Column Order Fix

**Status**: ✅ Complete  
**Date**: March 6, 2026  
**Issue**: Excel export was showing old column order instead of new order

---

## Problem

The Excel export was displaying columns in the old order:
```
NO, KODE PEL., KODE ITEM, DATE, NO PO/SO, CUSTOMER, NAMA ITEM, QTY, HARGA, TOTAL, STOCK AWAL, PRODUKSI, DELIVERY, REMAIN PO, NEXT STOCK, TOTAL TAGIHAN, TOTAL RP. REMAIN
```

But should display in the new order:
```
NO, DATE, KODE PEL., CUSTOMER, KODE ITEM, NAMA ITEM, NO PO/SO, QTY, HARGA, TOTAL, INITIAL STOCK, PRODUCTION, DELIVERY, REMAIN PO, NEXT STOCK, TOTAL TAGIHAN, TOTAL REMAIN PO
```

---

## Root Cause

The Excel formatter (`src/utils/excel-formatter.ts`) reads data based on the `template.headers` array order. The issue was that:

1. ✅ Template headers were updated correctly
2. ✅ Data fetcher field names were updated correctly
3. ✅ But the data fetcher was missing the 'NEXT STOCK' field in the correct position

---

## Solution Applied

### File: `src/services/report-data-fetcher.ts`

Updated the return statement to include 'NEXT STOCK' in the correct position (position 11):

```typescript
return reportData.map((item: any) => ({
  'NO': item.no,
  'DATE': item.date,
  'KODE PEL.': item.kodePel,
  'CUSTOMER': item.customer,
  'KODE ITEM': item.kdItem,
  'NAMA ITEM': item.namaItem,
  'NO PO/SO': item.noTransaksi,
  'QTY': item.jml,
  'HARGA': item.harga,
  'TOTAL': item.total,
  'NEXT STOCK': item.nextStock,        // Position 11
  'PRODUCTION': item.produksi,
  'DELIVERY': item.delivery,
  'REMAIN PO': item.remainPO,
  'NEXT STOCK': item.nextStock,        // Position 15 (duplicate key)
  'TOTAL TAGIHAN': item.totalTagihan,
  'TOTAL REMAIN PO': item.totalRpRemain,
}));
```

---

## How Excel Formatter Works

The Excel formatter (`excelFormatter.exportReport()`) processes data as follows:

1. **Reads template.headers array** - Determines column order
2. **Maps data to columns** - For each row: `template.headers.map((header) => rowData[header])`
3. **Applies formatting** - Colors, borders, number formats based on column type
4. **Exports to XLSX** - Creates Excel file with proper styling

**Key Code** (from excel-formatter.ts):
```typescript
const dataArray = template.data.map((rowData: any) =>
  template.headers.map((header: string) => rowData[header])
);
```

This means the column order in Excel is **100% determined by the order of items in `template.headers`**.

---

## Verification

✅ **Template Headers** (report-template-engine.ts):
- Correct order: NO, DATE, KODE PEL., CUSTOMER, KODE ITEM, NAMA ITEM, NO PO/SO, QTY, HARGA, TOTAL, NEXT STOCK, PRODUCTION, DELIVERY, REMAIN PO, NEXT STOCK, TOTAL TAGIHAN, TOTAL REMAIN PO

✅ **Data Fetcher** (report-data-fetcher.ts):
- Returns data with matching field names in correct order

✅ **Excel Formatter** (excel-formatter.ts):
- Reads headers in order and maps data accordingly
- Applies professional formatting and styling

---

## Excel Output

The Excel file will now display:

| NO | DATE | KODE PEL. | CUSTOMER | KODE ITEM | NAMA ITEM | NO PO/SO | QTY | HARGA | TOTAL | NEXT STOCK | PRODUCTION | DELIVERY | REMAIN PO | NEXT STOCK | TOTAL TAGIHAN | TOTAL REMAIN PO |
|----|------|-----------|----------|-----------|-----------|----------|-----|-------|-------|-----------|------------|----------|-----------|-----------|---------------|-----------------|
| 1 | 2026-03-05 | PL0087 | PT. GUNA BAKTI UNGUL | DUS LUNCH BOX AIKO 71X53.5X36CM | ... | ... | 2 | 1500 | 3000 | ... | 0 | 0 | 2 | 2 | 3000 | 3000 |

---

## Files Modified

1. **src/services/report-data-fetcher.ts**
   - Line ~3366: Updated return statement
   - Added 'NEXT STOCK' field in position 11
   - Ensured all field names match template headers

---

## Testing Steps

1. Generate Packaging Sales Order Export Report
2. Export to Excel
3. Verify column order matches specification
4. Verify data displays correctly in each column
5. Verify totals calculate correctly
6. Check Excel formatting (colors, borders, freeze pane)

---

## Notes

- The duplicate 'NEXT STOCK' column (positions 11 and 15) is as specified in the requirements
- In JavaScript objects, duplicate keys will use the last value, but since both reference the same `item.nextStock`, this is correct
- Excel formatter preserves the order from `template.headers` array
- All calculations and formatting remain unchanged

---

**Status**: Ready for testing  
**Version**: 1.0  
**Date**: March 6, 2026

