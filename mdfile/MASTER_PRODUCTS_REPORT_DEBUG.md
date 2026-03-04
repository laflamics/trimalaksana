# Master Products Report - Debug Guide

**Status**: ✅ Updated dengan logging lengkap  
**Date**: February 2026  

---

## Masalah: Export Kosong

Jika export Excel kosong, ikuti langkah debug ini:

---

## Step 1: Check Browser Console

1. Open **DevTools** (F12)
2. Go to **Console** tab
3. Click **Export Excel** untuk "Daftar Item/Produk"
4. Lihat console logs:

```
[ReportService] 🔄 Generating master products report...
[ReportService] 📡 Storage config: { type: 'server', serverUrl: 'http://...' }
[ReportService] 📊 Fetched data: { productsCount: 0, customersCount: 0, ... }
```

---

## Step 2: Diagnose Data Source

### Jika `productsCount: 0` dan `customersCount: 0`

**Penyebab**: Data tidak ada di storage

**Solusi**:
1. Go to **Settings** → **Server Data**
2. Check apakah ada data di server
3. Jika kosong, import data terlebih dahulu

### Jika `storageType: 'local'`

**Penyebab**: Menggunakan localStorage, bukan server

**Solusi**:
1. Go to **Settings** → **Server Data**
2. Configure server URL
3. Switch ke server mode

### Jika `serverUrl: undefined`

**Penyebab**: Server URL tidak dikonfigurasi

**Solusi**:
1. Go to **Settings** → **Server Data**
2. Enter server URL (e.g., `http://localhost:3000`)
3. Save configuration

---

## Step 3: Check Storage Keys

Buka browser console dan jalankan:

```javascript
// Check products
const products = await storageService.get('products');
console.log('Products:', products);

// Check customers
const customers = await storageService.get('customers');
console.log('Customers:', customers);
```

**Expected Output**:
```javascript
Products: [
  { id: '1', kode: 'KRT001', nama: 'Kemasan Karton', customer: 'PT Maju Jaya', ... },
  { id: '2', kode: 'KRT002', nama: 'Kemasan Plastik', customer: 'PT Sukses', ... },
  ...
]

Customers: [
  { id: '1', kode: 'CUST001', nama: 'PT Maju Jaya', ... },
  { id: '2', kode: 'CUST002', nama: 'PT Sukses', ... },
  ...
]
```

---

## Step 4: Check Customer Code Map

Buka browser console dan jalankan:

```javascript
// Simulate customer code map creation
const customers = await storageService.get('customers');
const customersData = customers || [];

const customerCodeMap = new Map();
customersData.forEach((cust) => {
  if (cust.nama && cust.kode) {
    customerCodeMap.set(cust.nama.toLowerCase().trim(), cust.kode.trim());
  }
});

console.log('Customer Code Map:', {
  size: customerCodeMap.size,
  entries: Array.from(customerCodeMap.entries()),
});
```

**Expected Output**:
```javascript
Customer Code Map: {
  size: 2,
  entries: [
    ['pt maju jaya', 'CUST001'],
    ['pt sukses', 'CUST002'],
  ]
}
```

---

## Step 5: Check Template Generation

Buka browser console dan jalankan:

```javascript
// Simulate template generation
const products = await storageService.get('products');
const customers = await storageService.get('customers');

const productsData = products || [];
const customersData = customers || [];

// Build customer code map
const customerCodeMap = new Map();
customersData.forEach((cust) => {
  if (cust.nama && cust.kode) {
    customerCodeMap.set(cust.nama.toLowerCase().trim(), cust.kode.trim());
  }
});

// Generate template
const template = reportTemplateEngine.masterProductsReport(productsData, customerCodeMap);

console.log('Template:', {
  title: template.title,
  headers: template.headers,
  dataRows: template.data.length,
  sample: template.data.slice(0, 2),
  totals: template.totals,
});
```

**Expected Output**:
```javascript
Template: {
  title: 'DAFTAR PRODUK',
  headers: ['NO', 'KODE', 'NAMA PRODUK', 'KATEGORI', 'UNIT', 'HARGA JUAL', 'HARGA BELI', 'STOK', 'PAD CODE', 'PELANGGAN', 'NILAI STOK'],
  dataRows: 2,
  sample: [
    { NO: 1, KODE: 'KRT001', 'NAMA PRODUK': 'Kemasan Karton', ..., 'PAD CODE': 'CUST001', ... },
    { NO: 2, KODE: 'KRT002', 'NAMA PRODUK': 'Kemasan Plastik', ..., 'PAD CODE': 'CUST002', ... },
  ],
  totals: { 'TOTAL STOK': 150, 'TOTAL NILAI': 1600000 },
}
```

---

## Step 6: Check Excel Export

Jika template OK tapi Excel masih kosong:

1. Check browser console untuk error di `excelFormatter.exportReport()`
2. Verify XLSX library loaded: `console.log(XLSX)`
3. Check file download di browser downloads folder

---

## Common Issues & Solutions

### Issue 1: "Tidak ada data produk"

**Penyebab**: Products storage kosong

**Solusi**:
```javascript
// Import test data
const testProducts = [
  { id: '1', kode: 'KRT001', nama: 'Kemasan Karton', kategori: 'Packaging', satuan: 'pcs', hargaFg: 5000, harga: 3000, stockAman: 100, customer: 'PT Maju Jaya' },
  { id: '2', kode: 'KRT002', nama: 'Kemasan Plastik', kategori: 'Packaging', satuan: 'pcs', hargaFg: 4000, harga: 2000, stockAman: 50, customer: 'PT Sukses' },
];

await storageService.set('products', testProducts);
```

### Issue 2: PAD Code menunjukkan "-"

**Penyebab**: Customer name tidak match

**Solusi**:
1. Check product.customer name (case-sensitive)
2. Check customer.nama di master (harus sama)
3. Pastikan customer master sudah diimport

### Issue 3: Excel file tidak download

**Penyebab**: XLSX library error atau browser block

**Solusi**:
1. Check browser console untuk error
2. Check browser download settings
3. Try different browser

### Issue 4: Header tidak UPPERCASE

**Penyebab**: Template engine tidak update

**Solusi**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Check report-template-engine.ts headers

---

## Debug Checklist

- [ ] Browser console tidak ada error
- [ ] Storage config: type = 'server' atau 'local'
- [ ] Server URL configured (jika server mode)
- [ ] Products data ada di storage (count > 0)
- [ ] Customers data ada di storage (count > 0)
- [ ] Customer code map created (size > 0)
- [ ] Template generated dengan data
- [ ] Excel file downloaded
- [ ] Excel file buka dengan data
- [ ] Header UPPERCASE
- [ ] PAD CODE populated
- [ ] NILAI STOK calculated

---

## Quick Test Script

Jalankan di browser console untuk test lengkap:

```javascript
async function testMasterProductsReport() {
  console.log('=== TESTING MASTER PRODUCTS REPORT ===');
  
  // 1. Check storage config
  const config = storageService.getConfig();
  console.log('1. Storage Config:', config);
  
  // 2. Fetch data
  const products = await storageService.get('products');
  const customers = await storageService.get('customers');
  console.log('2. Data Fetched:', {
    productsCount: (products || []).length,
    customersCount: (customers || []).length,
  });
  
  // 3. Build customer code map
  const customerCodeMap = new Map();
  (customers || []).forEach((cust) => {
    if (cust.nama && cust.kode) {
      customerCodeMap.set(cust.nama.toLowerCase().trim(), cust.kode.trim());
    }
  });
  console.log('3. Customer Code Map:', {
    size: customerCodeMap.size,
    entries: Array.from(customerCodeMap.entries()),
  });
  
  // 4. Generate template
  const template = reportTemplateEngine.masterProductsReport(products || [], customerCodeMap);
  console.log('4. Template Generated:', {
    title: template.title,
    headers: template.headers,
    dataRows: template.data.length,
    sample: template.data.slice(0, 1),
  });
  
  // 5. Export
  const filename = excelFormatter.generateFilename('Daftar_Produk');
  excelFormatter.exportReport(template, filename);
  console.log('5. Export Complete:', filename);
  
  console.log('=== TEST COMPLETE ===');
}

// Run test
testMasterProductsReport();
```

---

## Contact Support

Jika masih error setelah debug:

1. **Screenshot console log** (F12 → Console)
2. **Screenshot storage data** (Settings → Server Data)
3. **Check server logs** (jika server mode)
4. **Contact support** dengan screenshot

---

**Happy Debugging!** 🔍
