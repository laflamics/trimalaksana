# Master Units Report - COMPLETE ✅

**Date**: February 2026  
**Status**: ✅ COMPLETE  
**Report ID**: `master-units`

---

## Overview

Implemented "Daftar Satuan Pengukuran" (Master Units Report) yang tarik satuan unik dari product dan material inventory.

### Report Details
- **Report Name**: Daftar Satuan Pengukuran
- **Report ID**: `master-units`
- **Data Source**: Inventory (Product + Material)
- **Output Format**: Excel (.xlsx)
- **Grouping**: By Satuan (Unit) dengan count items

---

## Report Output

### Excel Format

| NO | SATUAN | JUMLAH ITEM | TIPE | DESKRIPSI |
|----|--------|-------------|------|-----------|
| 1 | PCS | 45 | Product, Material | Satuan PCS |
| 2 | KG | 15 | Material | Satuan KG |
| 3 | METER | 8 | Material | Satuan METER |
| 4 | BOX | 5 | Product | Satuan BOX |

**Totals**:
- TOTAL SATUAN: 4
- TOTAL ITEM: 73

---

## Data Mapping

### Dari Inventory ke Report

```
Inventory Items:
[
  { satuan: 'PCS', kategori: 'Material', ... },
  { satuan: 'PCS', kategori: 'Product', ... },
  { satuan: 'KG', kategori: 'Material', ... },
  { satuan: 'METER', kategori: 'Material', ... },
]

↓ (Extract unique satuan + count + tipe)

Report Data:
[
  { satuan: 'PCS', jumlahItem: 45, tipe: 'Product, Material' },
  { satuan: 'KG', jumlahItem: 15, tipe: 'Material' },
  { satuan: 'METER', jumlahItem: 8, tipe: 'Material' },
  { satuan: 'BOX', jumlahItem: 5, tipe: 'Product' },
]
```

---

## Template Function

### masterUnitsReport()

```typescript
masterUnitsReport: (data: any[]): ReportTemplate => {
  // Extract unique units dengan count
  const unitMap = new Map<string, { satuan: string; jumlahItem: number; tipe: string[] }>();
  
  data.forEach(item => {
    const satuan = (item.satuan || item.unit || 'PCS').toString().trim().toUpperCase();
    const tipe = (item.kategori || '').toLowerCase().trim() === 'material' ? 'Material' : 'Product';
    
    if (!unitMap.has(satuan)) {
      unitMap.set(satuan, { satuan, jumlahItem: 0, tipe: [] });
    }
    
    const entry = unitMap.get(satuan)!;
    entry.jumlahItem += 1;
    if (!entry.tipe.includes(tipe)) {
      entry.tipe.push(tipe);
    }
  });

  // Convert to array dan sort by jumlahItem descending
  const normalizedData = Array.from(unitMap.values())
    .sort((a, b) => b.jumlahItem - a.jumlahItem)
    .map(item => ({
      satuan: item.satuan,
      jumlahItem: item.jumlahItem,
      tipe: item.tipe.join(', '),
      deskripsi: `Satuan ${item.satuan}`,
    }));

  const totalItem = normalizedData.reduce((sum, item) => sum + (item.jumlahItem || 0), 0);

  return {
    title: 'DAFTAR SATUAN PENGUKURAN',
    subtitle: `Per: ${new Date().toLocaleDateString('id-ID')} | Total Satuan: ${normalizedData.length}`,
    headers: ['NO', 'SATUAN', 'JUMLAH ITEM', 'TIPE', 'DESKRIPSI'],
    data: normalizedData.map((item, idx) => ({
      'NO': idx + 1,
      'SATUAN': item.satuan,
      'JUMLAH ITEM': item.jumlahItem,
      'TIPE': item.tipe,
      'DESKRIPSI': item.deskripsi,
    })),
    totals: {
      'TOTAL SATUAN': normalizedData.length,
      'TOTAL ITEM': totalItem,
    },
    formatting: {
      headerBgColor: 'FFC000', // Professional orange/gold
      headerTextColor: '000000', // Black text
      alternateRowColor: true,
      freezePane: true,
      columnWidths: [6, 15, 15, 20, 30],
    },
  };
}
```

---

## Report Service Function

### generateMasterUnitsReport()

```typescript
async generateMasterUnitsReport(): Promise<void> {
  try {
    console.log('[ReportService] 🔄 Generating master units report...');
    
    // Get storage config
    const config = storageService.getConfig();
    
    // FORCE SERVER MODE untuk reports
    if (config.type !== 'server' || !config.serverUrl) {
      alert('⚠️ Report harus menggunakan server mode...');
      return;
    }
    
    // Fetch inventory dari SERVER
    const inventoryRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVENTORY);
    let inventoryData = extractStorageValue(inventoryRaw);
    
    if (!inventoryData || inventoryData.length === 0) {
      alert('❌ Tidak ada data inventory di server...');
      return;
    }

    // Generate template
    const template = reportTemplateEngine.masterUnitsReport(inventoryData);
    
    // Export ke Excel
    const filename = excelFormatter.generateFilename('Daftar_Satuan');
    excelFormatter.exportReport(template, filename);
    
    alert('✅ Laporan berhasil di-export!');
  } catch (error) {
    console.error('[ReportService] ❌ Error generating master units report:', error);
    alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}
```

---

## Data Flow

```
User clicks "Daftar Satuan"
    ↓
FullReports.tsx (case 'master-units')
    ↓
reportService.generateMasterUnitsReport()
    ↓
Fetch from Server: StorageKeys.PACKAGING.INVENTORY
    ↓
Extract unique satuan dari semua items
    ↓
Count jumlah item per satuan
    ↓
Identify tipe (Product/Material) per satuan
    ↓
reportTemplateEngine.masterUnitsReport()
    ↓
Sort by jumlahItem descending
    ↓
Transform to Excel format
    ↓
excelFormatter.exportReport()
    ↓
Download: Daftar_Satuan_*.xlsx
```

---

## Columns Explained

| Column | Description |
|--------|-------------|
| NO | Nomor urut |
| SATUAN | Satuan pengukuran (PCS, KG, METER, BOX, dll) |
| JUMLAH ITEM | Jumlah item yang menggunakan satuan ini |
| TIPE | Tipe item (Product, Material, atau keduanya) |
| DESKRIPSI | Deskripsi satuan |

---

## Features

✅ **Extract Unique Units**: Tarik satuan unik dari inventory  
✅ **Count Items**: Hitung jumlah item per satuan  
✅ **Identify Types**: Identifikasi tipe (Product/Material) per satuan  
✅ **Sort by Count**: Sorted by jumlahItem descending (terbanyak dulu)  
✅ **Professional Formatting**: Orange/gold header, freeze pane, alternate rows  
✅ **Totals**: Satuan count dan item total  
✅ **Server Mode Only**: Fetch dari PostgreSQL  
✅ **Error Handling**: User-friendly error messages  

---

## Testing

### Test Case 1: Generate Report
```
1. Go to Settings → Full Reports
2. Select "Daftar Satuan"
3. Click "Generate Report"
4. Expected: Excel file dengan unique satuan dan item count
5. Verify: Sorted by jumlahItem descending
```

### Test Case 2: Verify Data
```
1. Check satuan values (PCS, KG, METER, BOX, dll)
2. Check jumlahItem count accuracy
3. Check tipe shows correct Product/Material mix
```

### Test Case 3: No Data
```
1. Clear inventory data
2. Try to generate report
3. Expected: Alert "Tidak ada data inventory di server"
```

---

## Files Modified

1. **src/services/report-template-engine.ts**
   - Added `masterUnitsReport()` template function

2. **src/services/report-service.ts**
   - Added `generateMasterUnitsReport()` function

3. **src/pages/Settings/FullReports.tsx**
   - Added case handler untuk 'master-units'

---

## Related Reports

- ✅ Master Products Report (`master-products`)
- ✅ Master Materials Report (`master-materials`)
- ✅ Master Categories Report (`master-categories`)
- ✅ Master Units Report (`master-units`) - **NEW**
- ✅ Master Customers Report (`master-customers`)
- ✅ Master Suppliers Report (`master-suppliers`)
- ✅ Master Staff Report (`master-employees`)

---

## Notes

- Report tarik satuan unik dari inventory (Product + Material)
- Satuan di-normalize ke UPPERCASE
- Default satuan adalah 'PCS' jika tidak ada
- Sorted by jumlahItem descending (terbanyak dulu)
- Tipe menunjukkan apakah satuan digunakan untuk Product, Material, atau keduanya
- Report hanya bisa di-generate dalam server mode
- Filename: `Daftar_Satuan_YYYYMMDD_HHMMSS.xlsx`

---

**Status**: ✅ READY FOR PRODUCTION

