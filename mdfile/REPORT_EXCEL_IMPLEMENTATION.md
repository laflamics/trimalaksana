# Report Excel Implementation - IPOS Style

**Created**: February 2026  
**Status**: ✅ Complete  
**Architecture**: Template Engine + Formatter + Service Pattern

---

## 📋 Overview

Implementasi report Excel yang efisien dan rapi dengan struktur:
1. **Report Template Engine** - Reusable templates untuk semua jenis report
2. **Excel Formatter** - Styling dan formatting Excel yang rapi
3. **Report Service** - Data fetching dan report generation
4. **FullReports UI** - Interface untuk generate report

---

## 🏗️ Architecture

```
FullReports.tsx (UI)
    ↓
reportService.generateXXXReport()
    ↓
reportTemplateEngine.xxxReport() → ReportTemplate
    ↓
excelFormatter.exportReport() → Excel File
```

### Flow:
1. User klik "Export Excel" di FullReports
2. FullReports call `reportService.generateXXXReport()`
3. Report Service fetch data dari storage
4. Report Service call `reportTemplateEngine.xxxReport()` untuk generate template
5. Report Service call `excelFormatter.exportReport()` untuk export ke Excel
6. File Excel ter-download otomatis

---

## 📁 File Structure

```
src/
├── services/
│   ├── report-template-engine.ts    # Template definitions
│   ├── report-service.ts            # Data fetching & generation
│   └── storage.ts                   # Storage keys (existing)
├── utils/
│   └── excel-formatter.ts           # Excel styling & export
└── pages/Settings/
    └── FullReports.tsx              # UI (updated)
```

---

## 🎯 Key Components

### 1. Report Template Engine (`report-template-engine.ts`)

Menyediakan template untuk berbagai jenis report:

```typescript
interface ReportTemplate {
  title: string;              // Judul laporan
  subtitle?: string;          // Subtitle (periode, tanggal, dll)
  headers: string[];          // Kolom headers
  data: any[];                // Data rows
  totals?: Record<string, number | string>;  // Summary totals
  formatting?: {
    headerBgColor?: string;   // Header background color (hex)
    headerTextColor?: string; // Header text color (hex)
    alternateRowColor?: boolean;  // Alternate row colors
    freezePane?: boolean;     // Freeze header row
    columnWidths?: number[];  // Column widths
  };
}
```

**Available Templates:**
- `gtSalesReport()` - General Trading Sales
- `gtPurchaseReport()` - General Trading Purchase
- `gtInvoicesReport()` - General Trading Invoices
- `packagingProductionReport()` - Packaging Production
- `packagingQCReport()` - Packaging QC
- `truckingDeliveryReport()` - Trucking Delivery
- `truckingInvoicesReport()` - Trucking Invoices
- `masterProductsReport()` - Master Products
- `masterCustomersReport()` - Master Customers
- `inventoryStockReport()` - Inventory Stock
- `arReport()` - Accounts Receivable
- `apReport()` - Accounts Payable

### 2. Excel Formatter (`excel-formatter.ts`)

Handle styling dan export Excel:

```typescript
excelFormatter.formatWorksheet(ws, template)
  // Format header dengan background color
  // Format data rows dengan alternate colors
  // Format numbers dengan currency/quantity format
  // Add borders dan alignment
  // Freeze panes

excelFormatter.exportReport(template, filename)
  // Create workbook
  // Format worksheet
  // Export ke file

excelFormatter.generateFilename(reportName, startDate, endDate)
  // Generate filename dengan format: ReportName_YYYY-MM-DD_YYYY-MM-DD.xlsx
```

### 3. Report Service (`report-service.ts`)

Fetch data dari storage dan generate report:

```typescript
reportService.generateGTSalesReport(startDate, endDate)
  // 1. Fetch invoices dari storage
  // 2. Filter by date range
  // 3. Flatten items dari invoices
  // 4. Generate template
  // 5. Export ke Excel

reportService.generateMasterProductsReport()
  // 1. Fetch products dari storage
  // 2. Generate template
  // 3. Export ke Excel
```

---

## 🎨 Styling & Colors

Setiap kategori report punya warna header yang berbeda:

| Kategori | Header Color | Hex Code |
|----------|--------------|----------|
| General Trading Sales | Yellow | FFD966 |
| General Trading Purchase | Blue | B4C7E7 |
| General Trading Invoices | Green | C6E0B4 |
| Packaging Production | Light Green | E2EFDA |
| Packaging QC | Orange | F4B084 |
| Trucking Delivery | Light Blue | D9E1F2 |
| Trucking Invoices | Green | A9D08E |
| Master Data | Pink | FFC7CE |
| Inventory | Green | C6E0B4 |
| AR | Yellow | FFE699 |
| AP | Orange | F8CBAD |

---

## 📊 Report Templates Detail

### General Trading - Sales Report

**Headers:**
- No, Tanggal, No. SO, Pelanggan, Item, Qty, Unit, Harga, Total

**Data Source:** `StorageKeys.GENERAL_TRADING.INVOICES`

**Totals:**
- Total Penjualan (sum of amount)
- Total Item (sum of qty)

**Example:**
```typescript
await reportService.generateGTSalesReport('2026-01-01', '2026-01-31');
// Output: Laporan_Penjualan_GT_2026-01-01_2026-01-31.xlsx
```

### Packaging - Production Report

**Headers:**
- No, No. SPK, Produk, Qty Order, Qty Produksi, Status, Tanggal Mulai, Tanggal Selesai

**Data Source:** `StorageKeys.PACKAGING.SPK`

**Totals:**
- Total Order (sum of quantity)
- Total Produksi (sum of actualQuantity)

**Example:**
```typescript
await reportService.generatePackagingProductionReport();
// Output: Laporan_Produksi_Packaging_2026-02-24.xlsx
```

### Trucking - Delivery Report

**Headers:**
- No, Tanggal, No. Surat Jalan, Pengemudi, Kendaraan, Tujuan, Status, Total

**Data Source:** `StorageKeys.TRUCKING.SURAT_JALAN`

**Totals:**
- Total Pengiriman (count)
- Total Nilai (sum of total)

**Example:**
```typescript
await reportService.generateTruckingDeliveryReport('2026-01-01', '2026-01-31');
// Output: Laporan_Pengiriman_Trucking_2026-01-01_2026-01-31.xlsx
```

---

## 🔧 How to Add New Report

### Step 1: Create Template in `report-template-engine.ts`

```typescript
export const reportTemplateEngine = {
  myNewReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    return {
      title: 'LAPORAN BARU',
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      headers: ['No', 'Kolom1', 'Kolom2', 'Kolom3'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Kolom1': item.field1,
        'Kolom2': item.field2,
        'Kolom3': item.field3,
      })),
      totals: {
        'TOTAL': data.reduce((sum, item) => sum + item.amount, 0),
      },
      formatting: {
        headerBgColor: 'FFD966',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 20, 20, 20],
      },
    };
  },
};
```

### Step 2: Create Service Function in `report-service.ts`

```typescript
export const reportService = {
  async generateMyNewReport(startDate: string, endDate: string): Promise<void> {
    try {
      // Fetch data
      const data = await storageService.get<any[]>(StorageKeys.PACKAGING.MY_DATA);
      const extracted = extractStorageValue(data);

      // Filter by date
      const filtered = extracted.filter(item => {
        const itemDate = item.created || item.date;
        return itemDate >= startDate && itemDate <= endDate;
      });

      // Generate template
      const template = reportTemplateEngine.myNewReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Baru', startDate, endDate);
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },
};
```

### Step 3: Add Case in `FullReports.tsx`

```typescript
case 'my-new-report':
  await reportService.generateMyNewReport(startDate, endDate);
  break;
```

### Step 4: Add Report Item in `FullReports.tsx`

```typescript
{
  id: 'my-new-report',
  name: 'Laporan Baru',
  description: 'Deskripsi laporan baru',
}
```

---

## 💡 Key Features

### ✅ Efficient
- Template reusable untuk semua report
- Tidak perlu bikin dari nol setiap kali
- Mudah tambah report baru

### ✅ Professional
- Header dengan background color
- Alternate row colors untuk readability
- Freeze panes untuk header
- Proper number formatting (currency, quantity)
- Borders dan alignment

### ✅ Scalable
- Support multiple sheets (untuk report kompleks)
- Support date range filtering
- Support totals dan summary

### ✅ Maintainable
- Centralized template definitions
- Centralized formatting logic
- Centralized data fetching
- Easy to debug dan modify

---

## 📊 Data Mapping

### Storage Keys Used

```typescript
// General Trading
StorageKeys.GENERAL_TRADING.INVOICES      // Invoices
StorageKeys.GENERAL_TRADING.GRN           // Purchase receipts

// Packaging
StorageKeys.PACKAGING.SPK                 // Work orders
StorageKeys.PACKAGING.QC                  // QC records
StorageKeys.PACKAGING.PRODUCTS            // Products

// Trucking
StorageKeys.TRUCKING.SURAT_JALAN          // Delivery notes
StorageKeys.TRUCKING.INVOICES             // Invoices

// Master
StorageKeys.PACKAGING.CUSTOMERS           // Customers
StorageKeys.PACKAGING.PRODUCTS            // Products
```

### Data Extraction

```typescript
// Storage bisa return data dalam 2 format:
// 1. Direct array: [item1, item2, ...]
// 2. Wrapped object: { value: [item1, item2, ...] }

// extractStorageValue() handle kedua format:
const data = extractStorageValue(storageData);
// Result: always array
```

---

## 🚀 Usage

### Generate Report Programmatically

```typescript
import { reportService } from '@/services/report-service';

// Sales Report
await reportService.generateGTSalesReport('2026-01-01', '2026-01-31');

// Production Report
await reportService.generatePackagingProductionReport();

// Delivery Report
await reportService.generateTruckingDeliveryReport('2026-01-01', '2026-01-31');
```

### Generate Report via UI

1. Go to Settings → Full Reports
2. Select category (optional)
3. Search report (optional)
4. Set date range
5. Click "Export Excel"
6. File auto-download

---

## 📈 Performance

- **Data Fetching**: Direct from storage (no caching)
- **Template Generation**: O(n) where n = number of rows
- **Excel Export**: Using XLSX library (fast)
- **File Size**: Depends on data size (typically 100KB-1MB)

---

## 🐛 Troubleshooting

### Report tidak ada data
- Check storage keys di `storage.ts`
- Verify data ada di storage
- Check date range filter

### Excel file tidak ter-download
- Check browser download settings
- Check console untuk error messages
- Try different browser

### Styling tidak rapi
- Check `formatting` object di template
- Verify column widths
- Check color hex codes

---

## ✅ Checklist

- [x] Create report-template-engine.ts
- [x] Create excel-formatter.ts
- [x] Create report-service.ts
- [x] Update FullReports.tsx
- [x] Add 12+ report templates
- [x] Add styling & colors
- [x] Add data extraction logic
- [x] Add error handling
- [x] Add filename generation
- [x] Test with actual data
- [ ] Add PDF export (TODO)
- [ ] Add scheduled reports (TODO)
- [ ] Add email delivery (TODO)

---

## 📝 Notes

1. **Storage Keys**: Semua storage keys sudah terdaftar di `storage.ts`
2. **Data Format**: Invoices punya struktur `{ lines: [...], bom: {...} }`
3. **Date Format**: Gunakan ISO format (YYYY-MM-DD)
4. **Currency**: Semua values dalam IDR
5. **Timezone**: Gunakan local timezone

---

## 🎉 Result

Implementasi report Excel yang:
- ✅ Efisien (template reusable)
- ✅ Rapi (styling IPOS style)
- ✅ Scalable (mudah tambah report)
- ✅ Maintainable (centralized logic)
- ✅ Professional (header, colors, formatting)

**Ready to use!** 🚀

---

**Created by**: Kiro AI Assistant  
**Date**: February 2026  
**Version**: 1.0.0

