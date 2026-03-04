# AR/AP Reports Implementation Guide

**Status**: ✅ COMPLETE  
**Date**: Februari 2026  
**Version**: 1.0  

---

## 📊 Laporan AR/AP yang Diimplementasikan

### 1. Piutang (AR) - Accounts Receivable

#### Piutang Per Pelanggan
- **ID**: `ar-per-customer`
- **Fungsi**: `generateARReport()`
- **Data Source**: 
  - `invoices` (436 records)
  - `payments` (44 records)
- **Kalkulasi**:
  - Group invoices by customer
  - Sum total invoice amount per customer
  - Sum total paid amount per customer
  - Outstanding = Total - Paid
  - Overdue = Outstanding items dengan due date < today
- **Output**: Excel dengan kolom:
  - Pelanggan
  - Total Invoice
  - Total Piutang
  - Terbayar
  - Sisa Piutang
  - Overdue
  - Status (OUTSTANDING/LUNAS)

#### Piutang Per Faktur
- **ID**: `ar-per-invoice`
- **Data Source**: `invoices` + `payments`
- **Kalkulasi**: Detail per invoice dengan:
  - No. Faktur
  - Pelanggan
  - Tanggal
  - Jatuh Tempo
  - Total
  - Terbayar
  - Sisa Piutang
  - Status
  - Umur (hari)

#### Aging Piutang
- **ID**: `ar-aging`
- **Kalkulasi**: Group outstanding piutang by age:
  - 0-30 hari
  - 31-60 hari
  - 61-90 hari
  - >90 hari

#### Piutang Overdue
- **ID**: `ar-overdue`
- **Kalkulasi**: Filter invoices dengan:
  - Due date < today
  - Outstanding > 0

---

### 2. Hutang (AP) - Accounts Payable

#### Hutang Per Supplier
- **ID**: `ap-per-supplier`
- **Fungsi**: `generateAPReport()`
- **Data Source**:
  - `grn` (Goods Receipt Notes)
  - `payments` (44 records)
- **Kalkulasi**:
  - Group GRN by supplier
  - Sum total GRN amount per supplier
  - Sum total paid amount per supplier
  - Outstanding = Total - Paid
  - Overdue = Outstanding items dengan due date < today
- **Output**: Excel dengan kolom:
  - Supplier
  - Total GRN
  - Total Hutang
  - Terbayar
  - Sisa Hutang
  - Overdue
  - Status (OUTSTANDING/LUNAS)

#### Hutang Per Faktur
- **ID**: `ap-per-invoice`
- **Data Source**: `grn` + `payments`
- **Kalkulasi**: Detail per GRN dengan:
  - No. GRN
  - Supplier
  - Tanggal
  - Jatuh Tempo
  - Total
  - Terbayar
  - Sisa Hutang
  - Status
  - Umur (hari)

#### Aging Hutang
- **ID**: `ap-aging`
- **Kalkulasi**: Group outstanding hutang by age:
  - 0-30 hari
  - 31-60 hari
  - 61-90 hari
  - >90 hari

#### Hutang Overdue
- **ID**: `ap-overdue`
- **Kalkulasi**: Filter GRN dengan:
  - Due date < today
  - Outstanding > 0

---

## 🔧 Data Flow & Implementation

### Storage Keys yang Digunakan

```typescript
// Primary (direct keys)
'invoices'      // 436 records
'payments'      // 44 records
'grn'           // GRN records
'customers'     // Customer master
'suppliers'     // Supplier master

// Fallback (StorageKeys variants)
StorageKeys.GENERAL_TRADING.INVOICES
StorageKeys.GENERAL_TRADING.PAYMENTS
StorageKeys.GENERAL_TRADING.GRN
StorageKeys.GENERAL_TRADING.CUSTOMERS
StorageKeys.GENERAL_TRADING.SUPPLIERS
```

### Fetch Pattern (Sama seperti Master Products)

```typescript
// Try direct key first
let invoicesRaw = await storageService.get('invoices');
if (!invoicesRaw) invoicesRaw = await storageService.get(StorageKeys.GENERAL_TRADING.INVOICES);

const invoices = extractStorageValue(invoicesRaw) || [];

console.log('[ReportService] 📊 Data fetched:', {
  invoicesCount: invoices.length,
});
```

### Data Processing

```typescript
// 1. Build lookup maps
const paymentsMap = new Map<string, number>();
payments.forEach((payment: any) => {
  const invoiceNo = payment.invoiceNo || payment.refNo || '';
  if (invoiceNo) {
    const current = paymentsMap.get(invoiceNo) || 0;
    paymentsMap.set(invoiceNo, current + (payment.amount || 0));
  }
});

// 2. Calculate AR/AP
const arData = invoices.map((inv: any) => {
  const total = inv.amount || inv.total || 0;
  const paid = paymentsMap.get(invoiceNo) || 0;
  const outstanding = total - paid;
  
  return {
    'Pelanggan': inv.customer || inv.customerName || '',
    'Total': total,
    'Terbayar': paid,
    'Sisa Piutang': outstanding,
    'Status': outstanding > 0 ? 'OUTSTANDING' : 'LUNAS',
  };
});

// 3. Generate template
const template = reportTemplateEngine.arReport(arData, {
  totalInvoice,
  totalPaid,
  totalOutstanding,
});

// 4. Export
excelFormatter.exportReport(template, filename);
```

---

## 📋 Template Methods

### AR Report Template
```typescript
arReport(data: any[], totals?: any): ReportTemplate
```

**Input**:
- `data`: Array of AR records dengan fields: No. Faktur, Pelanggan, Tanggal, Jatuh Tempo, Total, Terbayar, Sisa Piutang, Status, Umur (hari)
- `totals`: Optional totals object

**Output**: ReportTemplate dengan:
- Title: "PT. TRIMA LAKSANA"
- Subtitle: "LAPORAN PIUTANG (AR)"
- Headers: [No. Faktur, Pelanggan, Tanggal, Jatuh Tempo, Total, Terbayar, Sisa Piutang, Status, Umur (hari)]
- Totals: Total Piutang, Total Terbayar, Total Sisa Piutang

### AR Per Customer Template
```typescript
arPerCustomerReport(data: any[]): ReportTemplate
```

**Input**:
- `data`: Array dengan fields: customerName, totalInvoices, totalAmount, totalPaid, totalOutstanding, overdueAmount

**Output**: ReportTemplate dengan:
- Headers: [Pelanggan, Total Invoice, Total Piutang, Terbayar, Sisa Piutang, Overdue, Status]
- Totals: Total Piutang, Total Terbayar, Total Sisa Piutang

### AP Report Template
```typescript
apReport(data: any[], totals?: any): ReportTemplate
```

**Input**:
- `data`: Array of AP records dengan fields: No. GRN, Supplier, Tanggal, Jatuh Tempo, Total, Terbayar, Sisa Hutang, Status, Umur (hari)
- `totals`: Optional totals object

**Output**: ReportTemplate dengan:
- Title: "PT. TRIMA LAKSANA"
- Subtitle: "LAPORAN HUTANG (AP)"
- Headers: [No. GRN, Supplier, Tanggal, Jatuh Tempo, Total, Terbayar, Sisa Hutang, Status, Umur (hari)]
- Totals: Total Hutang, Total Terbayar, Total Sisa Hutang

### AP Per Supplier Template
```typescript
apPerSupplierReport(data: any[]): ReportTemplate
```

**Input**:
- `data`: Array dengan fields: supplierName, totalGRN, totalAmount, totalPaid, totalOutstanding, overdueAmount

**Output**: ReportTemplate dengan:
- Headers: [Supplier, Total GRN, Total Hutang, Terbayar, Sisa Hutang, Overdue, Status]
- Totals: Total Hutang, Total Terbayar, Total Sisa Hutang

---

## ✅ Checklist Implementasi

- ✅ AR Report (Piutang Per Faktur)
- ✅ AR Per Customer Report
- ✅ AP Report (Hutang Per Faktur)
- ✅ AP Per Supplier Report
- ✅ Data fetching dengan fallback pattern
- ✅ Payments mapping
- ✅ Outstanding calculation
- ✅ Overdue detection
- ✅ Excel export dengan professional formatting
- ✅ Console logging untuk debugging
- ✅ Error handling
- ✅ Toast notifications

---

## 🎯 Cara Menggunakan

### Untuk User
1. Buka **Settings** → **Full Reports**
2. Pilih kategori **Piutang (AR)** atau **Hutang (AP)**
3. Pilih salah satu laporan:
   - Piutang Per Pelanggan
   - Piutang Per Faktur
   - Aging Piutang
   - Piutang Overdue
   - (dan seterusnya untuk AP)
4. Klik tombol Excel untuk export
5. File akan otomatis didownload

### Untuk Developer
```typescript
// Generate AR Report
await reportService.generateARReport();

// Generate AP Report
await reportService.generateAPReport();
```

---

## 📊 Data Requirements

### Untuk AR Report
- **invoices**: Harus memiliki fields:
  - invoiceNo / no
  - customer / customerName
  - amount / total
  - created / date
  - dueDate
  
- **payments**: Harus memiliki fields:
  - invoiceNo / refNo
  - amount

### Untuk AP Report
- **grn**: Harus memiliki fields:
  - grnNo / invoiceNo
  - supplier / supplierName
  - amount / total
  - created / date
  - dueDate
  
- **payments**: Harus memiliki fields:
  - grnNo / refNo
  - amount

---

## 🔍 Troubleshooting

### Laporan kosong
**Solusi**:
1. Pastikan server mode aktif di Settings → Server Data
2. Pastikan data sudah diimport ke PostgreSQL
3. Lihat console log untuk error messages
4. Check storage keys yang digunakan

### Data tidak match
**Solusi**:
1. Pastikan invoiceNo di invoices match dengan invoiceNo di payments
2. Pastikan grnNo di grn match dengan grnNo di payments
3. Check field names (bisa berbeda: invoiceNo vs invoice_no)

### Overdue tidak terdeteksi
**Solusi**:
1. Pastikan dueDate field ada di invoices/grn
2. Pastikan format date valid (ISO format)
3. Check timezone settings

---

## 📝 Notes

- Semua laporan menggunakan **PostgreSQL sebagai source of truth**
- Data di-fetch dengan **fallback pattern** (direct key → StorageKeys)
- Payments di-map berdasarkan **invoiceNo/grnNo**
- Outstanding = Total - Paid
- Overdue = Due date < today AND Outstanding > 0
- Laporan di-export dengan **professional Excel formatting**
- Console logging untuk debugging

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: Februari 2026  
**Version**: 1.0.0

