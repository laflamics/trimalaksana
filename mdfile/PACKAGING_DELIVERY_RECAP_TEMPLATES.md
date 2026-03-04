# Packaging Delivery Recap Templates

Dua template tambahan untuk delivery note packaging recap telah ditambahkan di `src/pdf/packaging-delivery-recap-templates.ts`

## Template 1: Recap dengan PO Number di Description
**Function:** `generatePackagingRecapWithPOHtml()`

Menampilkan nomor PO di kolom DESCRIPTION tiap product.

**Contoh output:**
```
NO | PRODUCT CODE | ITEM | QTY | UOM | DESCRIPTION
1  | ABC123       | Item | 100 | PCS | PO: PO-2024-001
2  | DEF456       | Item | 50  | PCS | PO: PO-2024-001
```

**Data yang diperlukan:**
- `item.items[]` - Array items dengan product code dan qty
- `item.soNo` atau `item.items[].soNo` - Nomor PO

---

## Template 2: Recap dengan REKAP Nomor Surat Jalan di Keterangan
**Function:** `generatePackagingRecapWithSJListHtml()`

Menampilkan list nomor surat jalan yang di-recap di bagian Keterangan.

**Contoh output di Keterangan:**
```
REKAP: DLV.12423242, DLV.43423423, DLV.98765432
```

**Data yang diperlukan:**
- `item.items[]` - Array items dengan product code dan qty
- `item.sjList[]` - Array nomor surat jalan yang di-recap (contoh: ['DLV.12423242', 'DLV.43423423'])

---

## Cara Menggunakan

### Import di component:
```typescript
import { 
  generatePackagingRecapWithPOHtml,
  generatePackagingRecapWithSJListHtml 
} from '@/pdf/packaging-delivery-recap-templates';
```

### Contoh penggunaan Template 1:
```typescript
const html = generatePackagingRecapWithPOHtml({
  logo: logoBase64,
  company: companyData,
  item: {
    customer: 'PT ABC',
    customerAddress: 'Jl. Raya...',
    items: [
      { product: 'Item A', productCode: 'ABC123', qty: 100, unit: 'PCS', soNo: 'PO-2024-001' },
      { product: 'Item B', productCode: 'DEF456', qty: 50, unit: 'PCS', soNo: 'PO-2024-001' }
    ]
  },
  sjData: { sjNo: 'SJ-001', sjDate: '2024-01-15', driver: 'Budi', vehicleNo: 'B1234CD' }
});
```

### Contoh penggunaan Template 2:
```typescript
const html = generatePackagingRecapWithSJListHtml({
  logo: logoBase64,
  company: companyData,
  item: {
    customer: 'PT ABC',
    customerAddress: 'Jl. Raya...',
    items: [
      { product: 'Item A', productCode: 'ABC123', qty: 100, unit: 'PCS' },
      { product: 'Item B', productCode: 'DEF456', qty: 50, unit: 'PCS' }
    ],
    sjList: ['DLV.12423242', 'DLV.43423423', 'DLV.98765432']
  },
  sjData: { sjNo: 'SJ-RECAP-001', sjDate: '2024-01-15', driver: 'Budi', vehicleNo: 'B1234CD' }
});
```

---

## Struktur Data

### DeliveryItem (untuk Template 1 & 2):
```typescript
{
  product: string;           // Nama item
  productCode: string;       // Kode product
  qty: number | string;      // Quantity
  unit: string;              // Unit (PCS, BOX, dll)
  soNo?: string;             // PO Number (untuk Template 1)
}
```

### DeliveryNote (untuk Template 2):
```typescript
{
  customer: string;
  customerAddress: string;
  items: DeliveryItem[];
  sjList?: string[];         // Array nomor SJ yang di-recap
  specNote?: string;         // Note tambahan
}
```

---

## Catatan
- Kedua template menggunakan styling yang sama dengan template recap yang sudah ada
- Format tanggal: YYYY-MM-DD
- Semua text di-escape untuk keamanan HTML
- Responsive untuk print dengan ukuran kertas 9.5in x 11in
