# Professional Excel Export Guide - Trima Laksana ERP

**Status**: ✅ Complete  
**Version**: 2.0 - Professional Edition  
**Date**: February 2026  
**Language**: Bahasa Indonesia & English

---

## 📋 Overview

Excel export telah ditingkatkan menjadi **Professional Grade** dengan fitur-fitur enterprise:

✅ **Professional Styling** - Header dengan warna corporate, alternating rows  
✅ **Advanced Formatting** - Currency, dates, percentages dengan format lokal  
✅ **Multi-Sheet Support** - Export multiple reports dalam satu file  
✅ **Conditional Formatting** - Highlight cells berdasarkan kondisi  
✅ **Grouping & Subtotals** - Automatic grouping dengan subtotal  
✅ **Pivot Table Style** - Summary by multiple dimensions  
✅ **Print Optimization** - Ready untuk print dengan margin & scaling  
✅ **Metadata** - Company info, timestamps, audit trail  

---

## 🎨 Professional Color Scheme

```typescript
const COLORS = {
  primary: '1F4E78',      // Dark blue (header)
  secondary: '4472C4',    // Medium blue
  accent: '70AD47',       // Green
  headerBg: '1F4E78',     // Dark blue background
  headerText: 'FFFFFF',   // White text
  alternateRow: 'D9E1F2', // Light blue (alternate rows)
  totalBg: 'B4C7E7',      // Medium light blue (totals)
  totalText: '000000',    // Black text
  border: '000000',       // Black borders
  lightBorder: 'D0CECE',  // Light gray borders
};
```

---

## 📊 Features & Usage

### 1. Basic Export (Simple Report)

```typescript
import { excelFormatter } from '@/utils/excel-formatter';

const template = {
  title: 'Laporan Penjualan',
  subtitle: 'Periode: Jan 2026 - Feb 2026',
  headers: ['No', 'Produk', 'Qty', 'Harga', 'Total'],
  data: [
    { 'No': 1, 'Produk': 'Item A', 'Qty': 10, 'Harga': 50000, 'Total': 500000 },
    { 'No': 2, 'Produk': 'Item B', 'Qty': 5, 'Harga': 75000, 'Total': 375000 },
  ],
  totals: {
    'Total Penjualan': 875000,
  },
  formatting: {
    columnWidths: [8, 20, 10, 15, 15],
    headerBgColor: '1F4E78',
    headerTextColor: 'FFFFFF',
    alternateRowColor: true,
    freezePane: true,
  },
};

excelFormatter.exportReport(template, 'Laporan_Penjualan.xlsx');
```

**Output**:
- Header dengan background dark blue, text white
- Company name "PT. TRIMA LAKSANA" di baris pertama
- Report title di baris kedua
- Subtitle di baris ketiga
- Data dengan alternating row colors (light blue)
- Totals section dengan styling khusus
- Timestamp footer
- Frozen header untuk scrolling

---

### 2. Multi-Sheet Export

```typescript
const sheets = [
  {
    name: 'Penjualan',
    template: {
      title: 'Laporan Penjualan',
      headers: ['Tanggal', 'Customer', 'Amount'],
      data: [...],
      totals: { 'Total': 1000000 },
    },
  },
  {
    name: 'Pembelian',
    template: {
      title: 'Laporan Pembelian',
      headers: ['Tanggal', 'Supplier', 'Amount'],
      data: [...],
      totals: { 'Total': 500000 },
    },
  },
];

excelFormatter.exportMultiSheet(sheets, 'Laporan_Lengkap.xlsx');
```

**Output**: File Excel dengan 2 sheet (tabs) yang dapat di-navigate

---

### 3. Export dengan Summary Sheet

```typescript
const summaryTemplate = {
  title: 'Ringkasan Laporan',
  headers: ['Kategori', 'Total'],
  data: [
    { 'Kategori': 'Penjualan', 'Total': 1000000 },
    { 'Kategori': 'Pembelian', 'Total': 500000 },
    { 'Kategori': 'Profit', 'Total': 500000 },
  ],
  totals: { 'Grand Total': 2000000 },
};

const detailSheets = [
  { name: 'Detail Penjualan', template: {...} },
  { name: 'Detail Pembelian', template: {...} },
];

excelFormatter.exportWithSummary(
  summaryTemplate,
  detailSheets,
  'Laporan_Dengan_Ringkasan.xlsx'
);
```

**Output**: File dengan sheet "Ringkasan" di depan, diikuti detail sheets

---

### 4. Auto-Format Export (Recommended)

```typescript
const data = [
  { id: 1, name: 'Product A', qty: 10, price: 50000, total: 500000 },
  { id: 2, name: 'Product B', qty: 5, price: 75000, total: 375000 },
];

excelFormatter.exportAutoFormat(
  data,
  ['id', 'name', 'qty', 'price', 'total'],
  'Laporan Produk',
  'Laporan_Produk.xlsx',
  {
    subtitle: 'Data Master Produk',
    totals: { 'Total Qty': 15, 'Total Value': 875000 },
    columnWidths: [8, 20, 10, 15, 15],
    freezePane: true,
  }
);
```

**Keuntungan**:
- Auto-detect column types
- Auto-format numbers (currency, quantity)
- Auto-validate data
- Minimal configuration

---

### 5. Custom Column Styling

```typescript
const columnStyles = {
  'Harga': { align: 'right', format: '#,##0.00', width: 15 },
  'Qty': { align: 'center', format: '0', width: 10 },
  'Produk': { align: 'left', width: 25 },
  'Total': { align: 'right', format: '#,##0.00', width: 15 },
};

excelFormatter.exportWithColumnStyles(
  template,
  columnStyles,
  'Laporan_Custom_Style.xlsx'
);
```

**Alignment Options**: `'left' | 'center' | 'right'`  
**Format Options**: Excel number formats (e.g., `'#,##0.00'`, `'0%'`, `'mm/dd/yyyy'`)

---

### 6. Conditional Formatting

```typescript
const conditions = [
  {
    column: 'Status',
    condition: (value) => value === 'OVERDUE',
    fillColor: 'FF0000', // Red
    textColor: 'FFFFFF', // White
  },
  {
    column: 'Total',
    condition: (value) => value > 1000000,
    fillColor: '70AD47', // Green
    textColor: '000000', // Black
  },
  {
    column: 'Qty',
    condition: (value) => value < 5,
    fillColor: 'FFC000', // Yellow
    textColor: '000000',
  },
];

excelFormatter.exportWithConditionalFormatting(
  template,
  conditions,
  'Laporan_Conditional.xlsx'
);
```

**Use Cases**:
- Highlight overdue invoices (red)
- Highlight high-value transactions (green)
- Highlight low stock items (yellow)
- Highlight negative values (red)

---

### 7. Grouping & Subtotals

```typescript
excelFormatter.exportWithGrouping(
  template,
  'Customer',           // Group by column
  ['Amount', 'Qty'],    // Subtotal columns
  'Laporan_Grouped.xlsx'
);
```

**Output**:
```
GROUP: Customer A
  Transaction 1    Amount: 100000
  Transaction 2    Amount: 150000
Subtotal Customer A  Amount: 250000

GROUP: Customer B
  Transaction 3    Amount: 200000
Subtotal Customer B  Amount: 200000
```

---

### 8. Pivot Table Style Export

```typescript
excelFormatter.exportPivotStyle(
  data,
  'Customer',      // Row dimension
  'Month',         // Column dimension
  'Amount',        // Value column
  'sum',           // Aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max'
  'Penjualan per Customer per Bulan',
  'Pivot_Report.xlsx'
);
```

**Output**:
```
Customer    | Jan 2026 | Feb 2026 | Mar 2026 | Total
Customer A  | 100000   | 150000   | 120000   | 370000
Customer B  | 200000   | 180000   | 220000   | 600000
Customer C  | 50000    | 75000    | 60000    | 185000
```

---

## 🔧 Formatting Functions

### Currency Formatting

```typescript
// Display format (dengan simbol Rp)
excelFormatter.formatCurrency(1000000);
// Output: "Rp 1.000.000"

// Excel cell format (tanpa simbol)
excelFormatter.formatCurrencyValue(1000000);
// Output: 1000000 (dengan numFmt: '#,##0.00')
```

### Date Formatting

```typescript
// Display format
excelFormatter.formatDate('2026-02-25');
// Output: "25/02/2026"

// Excel format (ISO)
excelFormatter.formatDateISO('2026-02-25');
// Output: "2026-02-25"
```

### Number Formatting

```typescript
excelFormatter.formatNumber(1234567.89, 2);
// Output: "1.234.567,89"

excelFormatter.formatPercentage(0.85, 2);
// Output: "85.00%"
```

### Filename Generation

```typescript
excelFormatter.generateFilename('Laporan Penjualan');
// Output: "Laporan_Penjualan_2026-02-25.xlsx"

excelFormatter.generateFilename('Laporan Penjualan', '2026-01-01', '2026-02-28');
// Output: "Laporan_Penjualan_20260101_20260228.xlsx"
```

---

## 📋 Data Validation

```typescript
const validation = excelFormatter.validateData(
  data,
  ['id', 'name', 'amount']
);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Handle errors
}
```

---

## 🎯 Best Practices

### 1. Always Validate Data

```typescript
const validation = excelFormatter.validateData(data, headers);
if (!validation.valid) {
  throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
}
```

### 2. Use Meaningful Column Names

```typescript
// ✅ GOOD
headers: ['Tanggal', 'Nama Produk', 'Jumlah', 'Harga Satuan', 'Total']

// ❌ BAD
headers: ['date', 'prod', 'qty', 'price', 'tot']
```

### 3. Set Appropriate Column Widths

```typescript
columnWidths: [
  12,  // Tanggal
  25,  // Nama Produk (lebih lebar)
  10,  // Jumlah
  15,  // Harga Satuan
  15,  // Total
]
```

### 4. Include Totals for Financial Reports

```typescript
totals: {
  'Total Penjualan': sumAmount,
  'Total Qty': sumQty,
  'Rata-rata': avgAmount,
}
```

### 5. Use Conditional Formatting Sparingly

```typescript
// ✅ GOOD - Highlight important exceptions
conditions: [
  { column: 'Status', condition: (v) => v === 'OVERDUE', fillColor: 'FF0000' },
]

// ❌ BAD - Too many conditions
conditions: [
  { column: 'Amount', condition: (v) => v > 0, fillColor: '00FF00' },
  { column: 'Amount', condition: (v) => v < 0, fillColor: 'FF0000' },
  { column: 'Amount', condition: (v) => v === 0, fillColor: 'FFFF00' },
  // ... many more
]
```

### 6. Freeze Header Row

```typescript
formatting: {
  freezePane: true,  // Always freeze header
}
```

### 7. Use Alternating Row Colors

```typescript
formatting: {
  alternateRowColor: true,  // Improves readability
}
```

---

## 📊 Report Templates

### Sales Report Template

```typescript
const salesTemplate = {
  title: 'Laporan Penjualan',
  subtitle: `Periode: ${startDate} - ${endDate}`,
  headers: ['Tanggal', 'No. SO', 'Customer', 'Produk', 'Qty', 'Harga', 'Total'],
  data: salesData,
  totals: {
    'Total Qty': totalQty,
    'Total Penjualan': totalAmount,
    'Rata-rata per Transaksi': avgAmount,
  },
  formatting: {
    columnWidths: [12, 12, 20, 20, 10, 15, 15],
    freezePane: true,
  },
};
```

### Purchase Report Template

```typescript
const purchaseTemplate = {
  title: 'Laporan Pembelian',
  subtitle: `Periode: ${startDate} - ${endDate}`,
  headers: ['Tanggal', 'No. PO', 'Supplier', 'Material', 'Qty', 'Harga', 'Total'],
  data: purchaseData,
  totals: {
    'Total Qty': totalQty,
    'Total Pembelian': totalAmount,
  },
  formatting: {
    columnWidths: [12, 12, 20, 20, 10, 15, 15],
    freezePane: true,
  },
};
```

### Inventory Report Template

```typescript
const inventoryTemplate = {
  title: 'Laporan Stok Barang',
  headers: ['Kode', 'Nama Barang', 'Stok Awal', 'Masuk', 'Keluar', 'Stok Akhir', 'Nilai'],
  data: inventoryData,
  totals: {
    'Total Stok': totalStock,
    'Total Nilai': totalValue,
  },
  formatting: {
    columnWidths: [12, 25, 12, 12, 12, 12, 15],
    freezePane: true,
  },
};
```

---

## 🚀 Integration Examples

### In React Component

```typescript
import { excelFormatter } from '@/utils/excel-formatter';

export function ReportComponent() {
  const handleExport = async () => {
    try {
      const data = await fetchReportData();
      
      excelFormatter.exportAutoFormat(
        data,
        ['id', 'name', 'amount'],
        'Laporan Penjualan',
        'Laporan_Penjualan.xlsx',
        {
          subtitle: 'Data Penjualan Bulan Ini',
          totals: { 'Total': data.reduce((sum, d) => sum + d.amount, 0) },
        }
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Gagal export laporan');
    }
  };

  return <button onClick={handleExport}>📊 Export ke Excel</button>;
}
```

### In Report Service

```typescript
export const reportService = {
  async generateSalesReport(startDate: string, endDate: string) {
    const data = await fetchSalesData(startDate, endDate);
    
    const template = {
      title: 'Laporan Penjualan',
      subtitle: `${startDate} - ${endDate}`,
      headers: ['Tanggal', 'Customer', 'Amount'],
      data,
      totals: { 'Total': data.reduce((sum, d) => sum + d.amount, 0) },
    };

    const filename = excelFormatter.generateFilename(
      'Laporan_Penjualan',
      startDate,
      endDate
    );

    excelFormatter.exportReport(template, filename);
  },
};
```

---

## 📈 Performance Tips

### 1. Large Datasets (>10,000 rows)

```typescript
// Use pagination or chunking
const chunkSize = 5000;
for (let i = 0; i < data.length; i += chunkSize) {
  const chunk = data.slice(i, i + chunkSize);
  // Process chunk
}
```

### 2. Memory Optimization

```typescript
// Don't load all data at once
const template = {
  title: 'Large Report',
  headers: [...],
  data: lazyLoadData(), // Load on demand
};
```

### 3. Async Export

```typescript
// Use setTimeout to prevent UI blocking
setTimeout(() => {
  excelFormatter.exportReport(template, filename);
}, 100);
```

---

## 🐛 Troubleshooting

### Issue: File tidak ter-download

**Solution**:
```typescript
// Ensure browser allows downloads
// Check browser console for errors
console.log('Exporting file:', filename);
```

### Issue: Formatting tidak muncul

**Solution**:
```typescript
// Ensure formatting object is complete
formatting: {
  columnWidths: [...],
  headerBgColor: '1F4E78',
  headerTextColor: 'FFFFFF',
  alternateRowColor: true,
  freezePane: true,
}
```

### Issue: Data tidak lengkap

**Solution**:
```typescript
// Validate data before export
const validation = excelFormatter.validateData(data, headers);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

---

## 📞 Support

Untuk pertanyaan atau masalah:
- Email: support@trimalaksana.com
- Jam: Senin-Jumat, 8 AM - 5 PM

---

**Last Updated**: February 2026  
**Version**: 2.0 - Professional Edition  
**Status**: ✅ Production Ready

