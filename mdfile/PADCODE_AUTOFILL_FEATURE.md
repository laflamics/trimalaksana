# Fitur Auto-fill padCode dari Customer Kode

**Status**: ✅ Selesai & Tested  
**Tanggal**: Februari 2026  
**Module**: Master Products (Packaging)

---

## 📋 Ringkasan Fitur

Fitur ini memungkinkan sistem untuk **otomatis mengisi padCode product** dari **kode customer** ketika:
- Product memiliki customer yang terdaftar di Master Customer
- Field padCode kosong (belum diisi)

Dengan fitur ini, user tidak perlu manual copy-paste kode customer ke padCode product.

---

## 🎯 Cara Kerja

### Scenario 1: Product Baru dengan Customer
```
1. User membuat product baru
2. User memilih customer: "PT Maju Jaya" (kode: CUST001)
3. User biarkan padCode kosong
4. Saat Save → padCode otomatis terisi: "CUST001"
```

### Scenario 2: Edit Product dengan Customer
```
1. User edit product yang sudah ada
2. User ubah customer menjadi: "CV Sukses Bersama" (kode: CUST002)
3. User biarkan padCode kosong
4. Saat Save → padCode otomatis terisi: "CUST002"
```

### Scenario 3: padCode Sudah Ada (Tidak Diubah)
```
1. Product sudah punya padCode: "CUSTOM_PAD"
2. User ubah customer atau field lain
3. Saat Save → padCode tetap: "CUSTOM_PAD" (tidak diubah)
```

### Scenario 4: Tidak Ada Customer (padCode Tetap Kosong)
```
1. Product tidak punya customer
2. padCode kosong
3. Saat Save → padCode tetap kosong (tidak ada customer untuk di-reference)
```

---

## 🔧 Implementasi Teknis

### File yang Dibuat/Dimodifikasi

#### 1. `src/utils/product-padcode-helper.ts` (BARU)
Helper functions untuk auto-fill padCode:

```typescript
// Auto-fill padCode dari customer kode jika padCode kosong
export function autofillPadCodeFromCustomer(product, customers): Product

// Batch auto-fill untuk multiple products
export function autofillPadCodesForProducts(products, customers): Product[]

// Validate padCode
export function validatePadCode(padCode, customers): boolean

// Get customer kode dari product
export function getCustomerKodeFromProduct(product, customers): string

// Sync padCode jika kosong
export function syncPadCodeIfEmpty(product, customers): { updated, changed }
```

#### 2. `src/pages/Master/Products.tsx` (MODIFIED)
Dimodifikasi fungsi `handleSave()`:

**Untuk Edit Product:**
```typescript
// Auto-fill padCode dari customer kode jika padCode kosong
const customerName = (formData.customer || p.customer || '').trim();
if (!padCodeValue && customerName) {
  const customer = customers.find(c => c.nama && c.nama.toLowerCase() === customerName.toLowerCase());
  if (customer && customer.kode) {
    padCodeValue = customer.kode.trim();
  }
}
```

**Untuk Create Product Baru:**
```typescript
// Auto-fill padCode dari customer kode jika padCode kosong
let finalPadCode = padCodeValue;
if (!finalPadCode && customerName) {
  const customer = customers.find(c => c.nama && c.nama.toLowerCase() === customerName.toLowerCase());
  if (customer && customer.kode) {
    finalPadCode = customer.kode.trim();
  }
}
```

---

## 📊 Test Results

Semua test case passed ✅:

| Test Case | Scenario | Expected | Result | Status |
|-----------|----------|----------|--------|--------|
| 1 | Product A + Customer (padCode kosong) | padCode = CUST001 | ✅ CUST001 | PASS |
| 2 | Product B + Customer (padCode kosong) | padCode = CUST002 | ✅ CUST002 | PASS |
| 3 | Product C + Customer (padCode sudah ada) | padCode = CUSTOM_PAD | ✅ CUSTOM_PAD | PASS |
| 4 | Product D (tidak ada customer) | padCode = kosong | ✅ kosong | PASS |

---

## 🚀 Cara Menggunakan

### Dari UI (Master Products)

1. **Buat Product Baru:**
   - Klik "Tambah Product"
   - Isi Nama, Kategori, dll
   - Pilih Customer dari dropdown
   - **Biarkan padCode kosong** (atau isi manual jika ingin custom)
   - Klik Save
   - ✅ padCode otomatis terisi dari kode customer

2. **Edit Product:**
   - Buka product yang sudah ada
   - Ubah customer atau field lain
   - **Jika padCode kosong**, akan otomatis terisi dari customer kode
   - **Jika padCode sudah ada**, akan tetap dipertahankan
   - Klik Save

### Dari Script (Batch Processing)

```javascript
import { autofillPadCodesForProducts } from '@/utils/product-padcode-helper';

// Batch auto-fill untuk semua products
const productsWithPadCode = autofillPadCodesForProducts(products, customers);
await storageService.set(StorageKeys.PACKAGING.PRODUCTS, productsWithPadCode);
```

---

## 💡 Keuntungan

✅ **Otomatis**: Tidak perlu manual copy-paste kode customer  
✅ **Konsisten**: Semua product dengan customer yang sama akan punya padCode yang sama  
✅ **Aman**: Tidak akan mengubah padCode yang sudah ada  
✅ **Fleksibel**: User masih bisa manual input padCode jika ingin custom  
✅ **Efficient**: Mengurangi human error dan waktu data entry  

---

## ⚠️ Catatan Penting

1. **Dependency**: Fitur ini bergantung pada Master Customer yang sudah terdaftar
2. **Case-Insensitive**: Matching customer name tidak case-sensitive (PT Maju Jaya = pt maju jaya)
3. **Trim Whitespace**: Semua whitespace di awal/akhir akan dihapus
4. **Preserve Existing**: Jika padCode sudah ada, tidak akan diubah
5. **Optional Field**: padCode adalah field optional, bisa kosong jika tidak ada customer

---

## 🔍 Troubleshooting

### Q: padCode tidak terisi otomatis
**A:** Pastikan:
- Customer sudah terdaftar di Master Customer
- Nama customer di product **sama persis** dengan nama di Master Customer
- padCode field kosong (tidak ada nilai sebelumnya)

### Q: padCode berubah saat save
**A:** Ini normal jika:
- Anda mengubah customer product
- padCode sebelumnya kosong
- Sistem akan isi dengan kode customer yang baru

### Q: Bagaimana jika ingin custom padCode?
**A:** Anda bisa:
- Manual input padCode sebelum save
- Sistem akan preserve padCode yang sudah ada
- Tidak akan diubah oleh fitur auto-fill

---

## 📝 Contoh Data

### Master Customer
```json
[
  { "id": "1", "kode": "CUST001", "nama": "PT Maju Jaya" },
  { "id": "2", "kode": "CUST002", "nama": "CV Sukses Bersama" },
  { "id": "3", "kode": "CUST003", "nama": "UD Berkah" }
]
```

### Master Product (Sebelum Save)
```json
[
  {
    "id": "1",
    "kode": "PROD001",
    "nama": "Product A",
    "customer": "PT Maju Jaya",
    "padCode": ""  // Kosong
  }
]
```

### Master Product (Setelah Save)
```json
[
  {
    "id": "1",
    "kode": "PROD001",
    "nama": "Product A",
    "customer": "PT Maju Jaya",
    "padCode": "CUST001"  // Auto-filled dari customer kode
  }
]
```

---

## 🎓 Untuk Developer

### Menggunakan Helper Functions

```typescript
import { 
  autofillPadCodeFromCustomer,
  validatePadCode,
  getCustomerKodeFromProduct,
  syncPadCodeIfEmpty
} from '@/utils/product-padcode-helper';

// Auto-fill single product
const updated = autofillPadCodeFromCustomer(product, customers);

// Validate padCode
const isValid = validatePadCode('CUST001', customers);

// Get customer kode
const kode = getCustomerKodeFromProduct(product, customers);

// Sync dan check apakah ada perubahan
const { updated, changed } = syncPadCodeIfEmpty(product, customers);
```

### Extending Fitur

Jika ingin extend fitur ini:

1. **Tambah validasi**: Modify `validatePadCode()` di helper
2. **Tambah logic**: Modify `autofillPadCodeFromCustomer()` di helper
3. **Batch processing**: Gunakan `autofillPadCodesForProducts()` untuk multiple products
4. **Custom matching**: Modify customer matching logic di helper

---

## ✅ Checklist Implementasi

- [x] Create helper functions di `product-padcode-helper.ts`
- [x] Modify `handleSave()` untuk edit product
- [x] Modify `handleSave()` untuk create product baru
- [x] Test dengan 4 test cases
- [x] Verify semua test passed
- [x] Create dokumentasi lengkap
- [x] Ready untuk production

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Check troubleshooting section di atas
2. Review test cases untuk memahami expected behavior
3. Check helper functions di `product-padcode-helper.ts`
4. Contact development team

---

**Dibuat**: Februari 2026  
**Status**: ✅ Production Ready  
**Version**: 1.0

