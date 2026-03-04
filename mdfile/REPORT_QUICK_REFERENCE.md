# Report Excel - Quick Reference Guide

**For Developers**  
**Date**: February 2026  
**Version**: 1.0.0

---

## 🚀 Quick Start

### Generate Report Programmatically

```typescript
import { reportService } from '@/services/report-service';

// Sales Report (with date range)
await reportService.generateGTSalesReport('2026-01-01', '2026-01-31');

// Production Report (no date range)
await reportService.generatePackagingProductionReport();

// File auto-downloads: Laporan_Penjualan_GT_2026-01-01_2026-01-31.xlsx
```

### Use Custom Hook

```typescript
import { useReportGeneration } from '@/hooks/useReportGeneration';

export function MyComponent() {
  const { isLoading, error, success, generateReport } = useReportGeneration();

  const handleGenerateReport = async () => {
    try {
      await generateReport('gt-sales', '2026-01-01', '2026-01-31');
      alert('Report generated successfully!');
    } catch (error) {
      alert('Error generating report');
    }
  };

  return (
    <button onClick={handleGenerateReport} disabled={isLoading}>
      {isLoading ? 'Generating...' : 'Generate Report'}
    </button>
  );
}
```

---

## 📊 Available Reports

### General Trading

| Report ID | Function | Date Range | Output |
|-----------|----------|-----------|--------|
| `gt-sales` | `generateGTSalesReport()` | Required | Laporan_Penjualan_GT_*.xlsx |
| `gt-purchase` | `generateGTPurchaseReport()` | Required | Laporan_Pembelian_GT_*.xlsx |
| `gt-invoices` | `generateGTInvoicesReport()` | Required | Laporan_Faktur_GT_*.xlsx |

### Packaging

| Report ID | Function | Date Range | Output |
|-----------|----------|-----------|--------|
| `packaging-production` | `generatePackagingProductionReport()` | Not needed | Laporan_Produksi_Packaging_*.xlsx |
| `packaging-qc` | `generatePackagingQCReport()` | Not needed | Laporan_QC_Packaging_*.xlsx |

### Trucking

| Report ID | Function | Date Range | Output |
|-----------|----------|-----------|--------|
| `trucking-delivery` | `generateTruckingDeliveryReport()` | Required | Laporan_Pengiriman_Trucking_*.xlsx |
| `trucking-invoices` | `generateTruckingInvoicesReport()` | Required | Laporan_Faktur_Trucking_*.xlsx |

### Master Data

| Report ID | Function | Date Range | Output |
|-----------|----------|-----------|--------|
| `master-products` | `generateMasterProductsReport()` | Not needed | Daftar_Produk_*.xlsx |
| `master-customers` | `generateMasterCustomersReport()` | Not needed | Daftar_Pelanggan_*.xlsx |

### Inventory

| Report ID | Function | Date Range | Output |
|-----------|----------|-----------|--------|
| `inventory-stock` | `generateInventoryStockReport()` | Not needed | Laporan_Stok_Barang_*.xlsx |

### Finance

| Report ID | Function | Date Range | Output |
|-----------|----------|-----------|--------|
| `ar-report` | `generateARReport()` | Not needed | Laporan_Piutang_AR_*.xlsx |
| `ap-report` | `generateAPReport()` | Not needed | Laporan_Hutang_AP_*.xlsx |

---

## 🎨 Report Colors

```typescript
// Each report has a unique header color (IPOS style)

GT Sales        → Yellow      (FFD966)
GT Purchase     → Blue        (B4C7E7)
GT Invoices     → Green       (C6E0B4)
Packaging Prod  → Light Green (E2EFDA)
Packaging QC    → Orange      (F4B084)
Trucking Del    → Light Blue  (D9E1F2)
Trucking Inv    → Green       (A9D08E)
Master Data     → Pink        (FFC7CE)
Inventory       → Green       (C6E0B4)
AR              → Yellow      (FFE699)
AP              → Orange      (F8CBAD)
```

---

## 📁 File Structure

```
src/
├── services/
│   ├── report-template-engine.ts    # 12 templates
│   ├── report-service.ts            # 12 functions
│   └── storage.ts                   # Storage keys
├── utils/
│   └── excel-formatter.ts           # Formatting & export
├── hooks/
│   └── useReportGeneration.ts       # Custom hook
└── pages/Settings/
    └── FullReports.tsx              # UI
```

---

## 🔧 Add New Report (3 Steps)

### Step 1: Add Template

```typescript
// In report-template-engine.ts
myNewReport: (data: any[]): ReportTemplate => ({
  title: 'LAPORAN BARU',
  headers: ['No', 'Kolom1', 'Kolom2'],
  data: data.map((item, idx) => ({
    'No': idx + 1,
    'Kolom1': item.field1,
    'Kolom2': item.field2,
  })),
  totals: {
    'TOTAL': data.reduce((sum, item) => sum + item.amount, 0),
  },
  formatting: {
    headerBgColor: 'FFD966',
    alternateRowColor: true,
    freezePane: true,
  },
})
```

### Step 2: Add Service Function

```typescript
// In report-service.ts
async generateMyNewReport() {
  const data = await storageService.get(StorageKeys.PACKAGING.MY_DATA);
  const extracted = extractStorageValue(data);
  const template = reportTemplateEngine.myNewReport(extracted);
  const filename = excelFormatter.generateFilename('Laporan_Baru');
  excelFormatter.exportReport(template, filename);
}
```

### Step 3: Add to Hook & UI

```typescript
// In useReportGeneration.ts
case 'my-new-report':
  await reportService.generateMyNewReport();
  break;

// In FullReports.tsx
case 'my-new-report':
  await reportService.generateMyNewReport();
  break;
```

---

## 💡 Common Patterns

### Pattern 1: Report with Date Range

```typescript
async generateMyReport(startDate: string, endDate: string) {
  const data = await storageService.get(StorageKeys.PACKAGING.MY_DATA);
  const extracted = extractStorageValue(data);
  
  // Filter by date
  const filtered = extracted.filter(item => 
    item.created >= startDate && item.created <= endDate
  );
  
  const template = reportTemplateEngine.myReport(filtered, startDate, endDate);
  const filename = excelFormatter.generateFilename('Laporan_Baru', startDate, endDate);
  excelFormatter.exportReport(template, filename);
}
```

### Pattern 2: Report with Nested Data

```typescript
async generateMyReport() {
  const invoices = await storageService.get(StorageKeys.PACKAGING.INVOICES);
  const extracted = extractStorageValue(invoices);
  
  // Flatten nested items
  const flatData = extracted.flatMap(inv =>
    (inv.lines || []).map((line: any) => ({
      invoiceNo: inv.invoiceNo,
      itemName: line.itemName,
      qty: line.qty,
      amount: line.total,
    }))
  );
  
  const template = reportTemplateEngine.myReport(flatData);
  const filename = excelFormatter.generateFilename('Laporan_Baru');
  excelFormatter.exportReport(template, filename);
}
```

### Pattern 3: Report with Calculations

```typescript
async generateMyReport() {
  const data = await storageService.get(StorageKeys.PACKAGING.MY_DATA);
  const extracted = extractStorageValue(data);
  
  // Add calculations
  const withCalcs = extracted.map(item => ({
    ...item,
    subtotal: item.qty * item.price,
    tax: (item.qty * item.price) * 0.1,
    total: (item.qty * item.price) * 1.1,
  }));
  
  const template = reportTemplateEngine.myReport(withCalcs);
  const filename = excelFormatter.generateFilename('Laporan_Baru');
  excelFormatter.exportReport(template, filename);
}
```

---

## 🐛 Troubleshooting

### Report tidak ada data
```typescript
// Check storage key
const data = await storageService.get(StorageKeys.PACKAGING.MY_DATA);
console.log('Data:', data);

// Check extraction
const extracted = extractStorageValue(data);
console.log('Extracted:', extracted);
```

### Excel file tidak ter-download
```typescript
// Check browser console untuk error
// Try different browser
// Check XLSX library version
```

### Styling tidak rapi
```typescript
// Check formatting object
formatting: {
  headerBgColor: 'FFD966',      // Valid hex
  headerTextColor: '000000',    // Valid hex
  alternateRowColor: true,      // Boolean
  freezePane: true,             // Boolean
  columnWidths: [5, 15, 20],    // Array of numbers
}
```

---

## 📊 Data Mapping Examples

### Example 1: Invoice Data

```typescript
// Storage format
{
  invoiceNo: "INV-001",
  customer: "PT. ABC",
  created: "2026-01-01",
  lines: [
    { itemName: "Item 1", qty: 10, price: 50000, total: 500000 },
    { itemName: "Item 2", qty: 5, price: 100000, total: 500000 }
  ],
  bom: {
    subtotal: 1000000,
    tax: 100000,
    total: 1100000
  }
}

// Mapped to report
{
  'No': 1,
  'Tanggal': '2026-01-01',
  'No. Faktur': 'INV-001',
  'Pelanggan': 'PT. ABC',
  'Total': 1100000,
}
```

### Example 2: Product Data

```typescript
// Storage format
{
  code: "PRD-001",
  name: "Product 1",
  category: "Category A",
  stock: 100,
  price: 50000,
  cost: 30000
}

// Mapped to report
{
  'No': 1,
  'Kode': 'PRD-001',
  'Nama Produk': 'Product 1',
  'Kategori': 'Category A',
  'Stok': 100,
  'Harga Jual': 50000,
  'Harga Beli': 30000,
  'Nilai Stok': 5000000,
}
```

---

## ✅ Checklist Before Deploy

- [ ] All storage keys verified
- [ ] All data mappings correct
- [ ] All templates have headers
- [ ] All templates have formatting
- [ ] All service functions implemented
- [ ] Error handling in place
- [ ] Hook integrated
- [ ] FullReports.tsx updated
- [ ] No TypeScript errors
- [ ] Tested with actual data

---

## 🎯 Performance Tips

1. **Filter early**: Filter data before mapping
2. **Avoid nested loops**: Use flatMap for nested data
3. **Cache calculations**: Calculate once, use multiple times
4. **Lazy load**: Load data only when needed

---

## 📝 Notes

- All dates in ISO format (YYYY-MM-DD)
- All currency in IDR
- All storage keys from `storage.ts`
- All colors in hex format (6 digits)
- All column widths in number format

---

## 🚀 Next Steps

1. Test all 12 reports with actual data
2. Add more report types as needed
3. Add PDF export support
4. Add scheduled reports
5. Add email delivery

---

**Created by**: Kiro AI Assistant  
**Date**: February 2026  
**Version**: 1.0.0

