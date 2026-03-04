# Excel Export - Quick Reference Card

**Version**: 2.0 | **Date**: February 2026

---

## 🚀 Quick Start (Copy & Paste)

### Basic Export
```typescript
import { excelFormatter } from '@/utils/excel-formatter';

excelFormatter.exportAutoFormat(
  data,
  ['id', 'name', 'amount'],
  'Laporan Penjualan',
  'Laporan_Penjualan.xlsx',
  { totals: { 'Total': 1000000 } }
);
```

### Professional Export
```typescript
const template = {
  title: 'Laporan Penjualan',
  subtitle: 'Jan - Feb 2026',
  headers: ['Tanggal', 'Customer', 'Amount'],
  data: salesData,
  totals: { 'Total': totalAmount },
  formatting: {
    columnWidths: [12, 25, 15],
    freezePane: true,
  },
};

excelFormatter.exportReport(template, 'Laporan_Penjualan.xlsx');
```

### With Conditional Formatting
```typescript
excelFormatter.exportWithConditionalFormatting(
  template,
  [
    {
      column: 'Status',
      condition: (v) => v === 'OVERDUE',
      fillColor: 'FF0000',
      textColor: 'FFFFFF',
    },
  ],
  'Laporan_Dengan_Highlight.xlsx'
);
```

---

## 📊 Export Methods

| Method | Syntax | Use Case |
|--------|--------|----------|
| **Basic** | `exportReport(template, filename)` | Single sheet |
| **Auto** | `exportAutoFormat(data, headers, title, filename, options)` | Quick export |
| **Multi** | `exportMultiSheet(sheets, filename)` | Multiple sheets |
| **Summary** | `exportWithSummary(summary, details, filename)` | Summary + details |
| **Styles** | `exportWithColumnStyles(template, styles, filename)` | Custom styling |
| **Conditional** | `exportWithConditionalFormatting(template, conditions, filename)` | Highlight cells |
| **Grouping** | `exportWithGrouping(template, groupBy, subtotals, filename)` | Group & subtotal |
| **Pivot** | `exportPivotStyle(data, rowDim, colDim, value, agg, title, filename)` | Pivot analysis |

---

## 🎨 Colors

```typescript
Primary:        '#1F4E78'  // Dark blue (header)
Secondary:      '#4472C4'  // Medium blue
Accent:         '#70AD47'  // Green
AlternateRow:   '#D9E1F2'  // Light blue
TotalBg:        '#B4C7E7'  // Medium light blue
Border:         '#000000'  // Black
LightBorder:    '#D0CECE'  // Light gray
```

---

## 📋 Template Structure

```typescript
interface ReportTemplate {
  title: string;                    // Report title
  subtitle?: string;                // Optional subtitle
  headers: string[];                // Column headers
  data: any[];                      // Data rows
  totals?: Record<string, any>;     // Optional totals
  formatting?: {
    columnWidths?: number[];        // Column widths
    headerBgColor?: string;         // Header background
    headerTextColor?: string;       // Header text color
    alternateRowColor?: boolean;    // Alternate row colors
    freezePane?: boolean;           // Freeze header
  };
}
```

---

## 🔧 Formatting Functions

```typescript
// Currency
excelFormatter.formatCurrency(1000000);        // "Rp 1.000.000"
excelFormatter.formatCurrencyValue(1000000);   // 1000000

// Date
excelFormatter.formatDate('2026-02-25');       // "25/02/2026"
excelFormatter.formatDateISO('2026-02-25');    // "2026-02-25"

// Number
excelFormatter.formatNumber(1234567.89, 2);    // "1.234.567,89"
excelFormatter.formatPercentage(0.85, 2);      // "85.00%"

// Filename
excelFormatter.generateFilename('Laporan');    // "Laporan_2026-02-25.xlsx"
excelFormatter.generateFilename('Laporan', '2026-01-01', '2026-02-28');
// "Laporan_20260101_20260228.xlsx"
```

---

## ✅ Validation

```typescript
const validation = excelFormatter.validateData(data, headers);

if (!validation.valid) {
  console.error('Errors:', validation.errors);
  // Handle errors
}
```

---

## 🎯 Common Patterns

### Pattern 1: Sales Report
```typescript
const data = await fetchSalesData(startDate, endDate);
excelFormatter.exportAutoFormat(
  data,
  ['date', 'customer', 'product', 'qty', 'amount'],
  'Laporan Penjualan',
  excelFormatter.generateFilename('Laporan_Penjualan', startDate, endDate),
  {
    subtitle: `${startDate} - ${endDate}`,
    totals: { 'Total': data.reduce((sum, d) => sum + d.amount, 0) },
  }
);
```

### Pattern 2: Overdue Report
```typescript
const data = await fetchOverdueInvoices();
excelFormatter.exportWithConditionalFormatting(
  template,
  [
    {
      column: 'DaysOverdue',
      condition: (v) => v > 30,
      fillColor: 'FF0000',
      textColor: 'FFFFFF',
    },
  ],
  'Laporan_Overdue.xlsx'
);
```

### Pattern 3: Inventory Report
```typescript
const data = await fetchInventoryData();
excelFormatter.exportWithGrouping(
  template,
  'Warehouse',
  ['Stock', 'Value'],
  'Laporan_Stok.xlsx'
);
```

### Pattern 4: Analysis Report
```typescript
excelFormatter.exportPivotStyle(
  data,
  'Customer',
  'Month',
  'Amount',
  'sum',
  'Analisa Penjualan',
  'Analisa_Penjualan.xlsx'
);
```

---

## 🚨 Error Handling

```typescript
try {
  excelFormatter.exportReport(template, filename);
  alert('✅ Export berhasil!');
} catch (error) {
  console.error('Export failed:', error);
  alert('❌ Export gagal. Silakan coba lagi.');
}
```

---

## 📊 Column Styling

```typescript
const columnStyles = {
  'Harga': { 
    align: 'right', 
    format: '#,##0.00', 
    width: 15 
  },
  'Qty': { 
    align: 'center', 
    format: '0', 
    width: 10 
  },
  'Produk': { 
    align: 'left', 
    width: 25 
  },
};

excelFormatter.exportWithColumnStyles(
  template,
  columnStyles,
  'Laporan_Custom.xlsx'
);
```

---

## 🎨 Conditional Formatting

```typescript
const conditions = [
  {
    column: 'Status',
    condition: (value) => value === 'OVERDUE',
    fillColor: 'FF0000',  // Red
    textColor: 'FFFFFF',  // White
  },
  {
    column: 'Amount',
    condition: (value) => value > 1000000,
    fillColor: '70AD47',  // Green
    textColor: '000000',
  },
  {
    column: 'Stock',
    condition: (value) => value < 10,
    fillColor: 'FFC000',  // Yellow
    textColor: '000000',
  },
];

excelFormatter.exportWithConditionalFormatting(
  template,
  conditions,
  'Laporan_Conditional.xlsx'
);
```

---

## 📈 Grouping & Subtotals

```typescript
excelFormatter.exportWithGrouping(
  template,
  'Customer',           // Group by column
  ['Amount', 'Qty'],    // Subtotal columns
  'Laporan_Grouped.xlsx'
);
```

---

## 🔄 Multi-Sheet Export

```typescript
const sheets = [
  {
    name: 'Penjualan',
    template: { title: 'Penjualan', headers: [...], data: [...] },
  },
  {
    name: 'Pembelian',
    template: { title: 'Pembelian', headers: [...], data: [...] },
  },
];

excelFormatter.exportMultiSheet(sheets, 'Laporan_Lengkap.xlsx');
```

---

## 📋 Summary + Details

```typescript
excelFormatter.exportWithSummary(
  summaryTemplate,
  [
    { name: 'Detail Penjualan', template: {...} },
    { name: 'Detail Pembelian', template: {...} },
  ],
  'Laporan_Dengan_Ringkasan.xlsx'
);
```

---

## 🎯 Best Practices

✅ **DO**:
- Validate data before export
- Use meaningful column names
- Set appropriate column widths
- Include totals for financial reports
- Use conditional formatting sparingly
- Freeze header rows
- Use alternating row colors
- Generate descriptive filenames

❌ **DON'T**:
- Export without validation
- Use generic column names
- Leave columns too narrow
- Forget to include totals
- Use too many conditional formats
- Export sensitive data
- Hardcode filenames
- Skip error handling

---

## 🔍 Troubleshooting

| Problem | Solution |
|---------|----------|
| File not downloading | Check browser console for errors |
| Formatting not showing | Ensure formatting object is complete |
| Data incomplete | Validate data before export |
| Slow export | Use pagination for large datasets |
| Memory issues | Export in chunks for >50k rows |

---

## 📞 Resources

- 📖 [Full Guide](./EXCEL_EXPORT_PROFESSIONAL_GUIDE.md)
- 📋 [Implementation Summary](./EXCEL_EXPORT_IMPLEMENTATION_SUMMARY.md)
- 💻 [Code File](../src/utils/excel-formatter.ts)

---

## 🎓 Learning Path

1. **Beginner**: Start with `exportAutoFormat()`
2. **Intermediate**: Learn `exportReport()` with templates
3. **Advanced**: Master conditional formatting & grouping
4. **Expert**: Use pivot tables & multi-sheet exports

---

**Quick Tip**: Copy the "Basic Export" example above and modify for your needs! 🚀

