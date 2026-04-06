# Trucking Invoices Module - Rebuild Complete

**Status**: ✅ Complete  
**Date**: March 2026  
**Module**: Trucking Finance - Invoices  

---

## Overview

Modul Invoices Trucking telah dibangun ulang dari nol dengan logic yang bersih, sederhana, dan mudah dipahami.

## Fitur Utama

### 1. Create Invoice
- **Trigger**: Dari Delivery Order yang sudah punya Surat Jalan (Close + Signed)
- **Flow**:
  1. Pilih Delivery Order dari dropdown
  2. Sistem otomatis filter SJ yang valid (Close + Signed)
  3. Pilih Surat Jalan
  4. Preview invoice sebelum create
  5. Click "Create Invoice"

- **Data yang diambil**:
  - Invoice No: Auto-generated (INV-YYYY + 6 digit random)
  - DO No: Dari Delivery Order
  - SJ No: Dari Surat Jalan
  - Customer: Dari Delivery Order
  - Items: Dari Surat Jalan items
  - Total Deal: Dari Delivery Order
  - Price per unit: totalDeal / totalQty

### 2. View Invoice
- Klik "View" button untuk melihat invoice dalam format PDF
- Menampilkan detail lengkap invoice
- Bisa di-print atau di-save

### 3. Record Payment
- Klik "Payment" button untuk mencatat pembayaran
- Input:
  - Payment Amount (required)
  - Payment Method (TRANSFER, CASH, CHECK, OTHER)
  - Payment Date (required)
  - Reference (optional - untuk nomor bank/cek)

- **Status Update**:
  - OPEN → PARTIAL (jika pembayaran < total)
  - OPEN → PAID (jika pembayaran = total)
  - PARTIAL → PAID (jika pembayaran tambahan = sisa)

- **Payment History**: Menampilkan semua pembayaran yang sudah dicatat

### 4. Delete Invoice
- Klik "Delete" button untuk menghapus invoice
- Confirmation dialog sebelum delete

### 5. Search & Filter
- Search by: Invoice No, Customer, DO No
- Filter by: Date Range

---

## Data Structure

### Invoice Object
```typescript
{
  id: string;
  invoiceNo: string;           // INV-YYYY + 6 digit
  doNo: string;                // Dari DO
  sjNo: string;                // Dari SJ
  customer: string;            // Dari DO
  customerAddress: string;     // Dari DO
  lines: [
    {
      itemSku: string;
      qty: number;
      unit: string;
      price: number;           // totalDeal / totalQty
      pot: number;
    }
  ];
  bom: {
    subtotal: number;
    discount: number;
    discountPercent: number;
    tax: number;
    taxPercent: number;
    biayaLain: number;
    total: number;
    paymentTerms: string;
    topDays: number;
  };
  payments: [
    {
      id: string;
      amount: number;
      method: string;          // TRANSFER, CASH, CHECK, OTHER
      date: string;
      reference: string;
      createdAt: string;
    }
  ];
  totalPaid: number;           // Sum of all payments
  status: string;              // OPEN, PARTIAL, PAID
  created: string;
}
```

---

## Key Logic

### 1. Available DOs Filter
```
DO harus memenuhi:
- Ada SJ dengan status "Close"
- SJ sudah punya signed document
- DO belum punya invoice
```

### 2. Price Calculation
```
Price per unit = totalDeal / totalQty

Contoh:
- totalDeal = 1,000,000
- totalQty = 100 pcs
- price per unit = 10,000

Invoice lines:
- Item 1: 50 pcs × 10,000 = 500,000
- Item 2: 30 pcs × 10,000 = 300,000
- Item 3: 20 pcs × 10,000 = 200,000
- Total = 1,000,000
```

### 3. Payment Status Logic
```
if (totalPaid >= invoiceTotal) {
  status = 'PAID'
} else if (totalPaid > 0) {
  status = 'PARTIAL'
} else {
  status = 'OPEN'
}
```

---

## UI Components

### Main Table
- Invoice No
- DO No
- Customer
- Total (Rp format)
- Paid (Rp format)
- Status (color-coded)
- Created Date

### Actions
- View (PDF preview)
- Print (print/save PDF)
- Payment (record payment)
- Delete (with confirmation)

### Dialogs
1. **Create Invoice Dialog**
   - Select DO dropdown
   - Select SJ dropdown (filtered by DO)
   - Preview section
   - Cancel / Create buttons

2. **Payment Dialog**
   - Invoice summary (total, paid, remaining)
   - Payment amount input
   - Payment method select
   - Payment date input
   - Reference input
   - Payment history (if any)
   - Cancel / Record Payment buttons

3. **View PDF Dialog**
   - Invoice PDF preview
   - Close button

---

## Storage Keys

```typescript
StorageKeys.TRUCKING.INVOICES              // Main invoices data
StorageKeys.TRUCKING.DELIVERY_ORDERS       // For DO lookup
StorageKeys.TRUCKING.SURAT_JALAN           // For SJ lookup
StorageKeys.TRUCKING.CUSTOMERS             // For customer info
StorageKeys.TRUCKING.PRODUCTS              // For product info
```

---

## Error Handling

✅ Validation checks:
- DO must have valid SJ
- SJ must be Close status
- SJ must have signed document
- Payment amount must be > 0
- Payment amount cannot exceed invoice total

✅ Toast notifications:
- Success: Invoice created, Payment recorded, Invoice deleted
- Error: Data loading errors, validation errors, operation errors

---

## Testing Checklist

- [ ] Create invoice dari DO dengan SJ yang valid
- [ ] Verify invoice number auto-generated
- [ ] Verify items dan prices dari SJ
- [ ] Verify total deal dari DO
- [ ] Record payment (full payment)
- [ ] Verify status berubah ke PAID
- [ ] Record payment (partial payment)
- [ ] Verify status berubah ke PARTIAL
- [ ] Record payment tambahan
- [ ] Verify status berubah ke PAID
- [ ] View invoice PDF
- [ ] Print invoice
- [ ] Delete invoice
- [ ] Search invoice
- [ ] Filter by date range

---

## Next Steps

1. Test dengan data real dari Delivery Orders
2. Verify price calculation dengan totalDeal
3. Test payment recording flow
4. Verify PDF generation
5. Test search dan filter functionality

---

**Module Status**: Ready for Testing ✅
