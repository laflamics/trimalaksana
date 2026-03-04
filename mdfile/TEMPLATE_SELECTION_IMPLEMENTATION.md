# Template Selection Implementation untuk Packaging Delivery Note

## Overview
Telah ditambahkan fitur pilihan template untuk Surat Jalan Recap di Packaging Delivery Note. User sekarang bisa memilih dari 4 template berbeda saat print/view SJ Recap.

## 4 Template yang Tersedia

### Template 1: Standard Recap
- **Deskripsi**: Template standar dengan nomor SJ lama di description tiap product
- **Fitur**: Menampilkan nomor SJ yang di-recap di kolom description
- **Gunakan untuk**: Tracking SJ lama yang di-recap

### Template 2: Recap dengan PO
- **Deskripsi**: Menampilkan nomor PO di kolom description tiap product
- **Fitur**: Setiap product menampilkan nomor PO-nya
- **Gunakan untuk**: Tracking PO per product

### Template 3: Recap dengan SJ List
- **Deskripsi**: Menampilkan REKAP nomor surat jalan di bagian keterangan
- **Fitur**: List semua nomor SJ yang di-recap di bagian Keterangan
- **Format**: `REKAP: DLV.12423242, DLV.43423423, DLV.98765432`
- **Gunakan untuk**: Dokumentasi lengkap SJ yang di-recap

### Template 4: Recap Lengkap
- **Deskripsi**: Kombinasi Template 2 + Template 3
- **Fitur**: 
  - PO di description tiap product
  - REKAP SJ list di bagian keterangan
- **Gunakan untuk**: Dokumentasi paling lengkap

## File yang Ditambahkan/Dimodifikasi

### File Baru:
1. **src/components/TemplateSelectionDialog.tsx**
   - Dialog untuk memilih template
   - Menampilkan 4 pilihan template dengan deskripsi

2. **src/pdf/packaging-delivery-recap-templates.ts**
   - Berisi 4 fungsi template generator
   - Export `PACKAGING_RECAP_TEMPLATES` array
   - Export `generatePackagingRecapHtmlByTemplate()` untuk select template

### File Dimodifikasi:
1. **src/pages/Packaging/DeliveryNote.tsx**
   - Import `TemplateSelectionDialog` dan template functions
   - Tambah state: `showTemplateSelectionDialog`, `selectedTemplate`, `pendingPrintItem`
   - Update `handlePrint()` untuk menampilkan dialog saat recap SJ
   - Tambah `handleTemplateSelected()` untuk handle template selection
   - Tambah `generateSuratJalanHtmlContentWithTemplate()` untuk generate HTML dengan template tertentu
   - Render `TemplateSelectionDialog` di JSX

## Cara Kerja

### Flow untuk Print Recap SJ:
1. User klik Print pada Recap SJ
2. Dialog Template Selection muncul dengan 4 pilihan
3. User pilih template yang diinginkan
4. Print window terbuka dengan template yang dipilih

### Flow untuk Non-Recap SJ:
1. User klik Print pada regular SJ
2. Langsung print dengan template standar (tidak ada dialog)

## Data yang Diperlukan

### Untuk Template 2 (PO):
```typescript
item.items[].soNo  // Nomor PO per item
```

### Untuk Template 3 & 4 (SJ List):
```typescript
item.mergedSjNos[]  // Array nomor SJ yang di-recap
// atau
item.sjList[]       // Alternative field name
```

## Contoh Penggunaan

### Di Component:
```typescript
// Dialog akan otomatis muncul saat user klik print pada recap SJ
<TemplateSelectionDialog
  isOpen={showTemplateSelectionDialog}
  onClose={() => setShowTemplateSelectionDialog(false)}
  onSelectTemplate={handleTemplateSelected}
  templates={PACKAGING_RECAP_TEMPLATES}
/>
```

### Untuk Generate HTML dengan Template Tertentu:
```typescript
import { generatePackagingRecapHtmlByTemplate } from '@/pdf/packaging-delivery-recap-templates';

const html = generatePackagingRecapHtmlByTemplate(2, {
  logo: logoBase64,
  company: companyData,
  item: deliveryNoteData,
  sjData: sjData,
  products: productsData
});
```

## Styling

Dialog menggunakan CSS variables yang sudah ada:
- `--bg-primary`: Background utama
- `--bg-secondary`: Background secondary
- `--bg-tertiary`: Background tertiary (hover)
- `--text-primary`: Text utama
- `--text-secondary`: Text secondary
- `--border-color`: Border color
- `--primary-color`: Primary color (untuk highlight)

## Testing

### Test Case 1: Print Regular SJ
1. Buka Packaging > Delivery Note
2. Klik Print pada regular SJ
3. Verifikasi: Print window terbuka langsung (tanpa dialog)

### Test Case 2: Print Recap SJ
1. Buka Packaging > Delivery Note > Recap tab
2. Klik Print pada recap SJ
3. Verifikasi: Dialog template selection muncul
4. Pilih template 1-4
5. Verifikasi: Print window terbuka dengan template yang dipilih

### Test Case 3: Template 2 (PO)
1. Pilih Template 2
2. Verifikasi: Description column menampilkan "PO: [nomor-po]"

### Test Case 4: Template 3 (SJ List)
1. Pilih Template 3
2. Verifikasi: Keterangan menampilkan "REKAP: DLV.xxx, DLV.yyy, ..."

### Test Case 5: Template 4 (Lengkap)
1. Pilih Template 4
2. Verifikasi: Description menampilkan PO + Keterangan menampilkan REKAP SJ

## Notes
- Dialog hanya muncul untuk Recap SJ (item.isRecap === true)
- Regular SJ tetap print langsung tanpa dialog
- Template selection disimpan di state `selectedTemplate` untuk reference
- Pending item disimpan di `pendingPrintItem` untuk handle async operations
