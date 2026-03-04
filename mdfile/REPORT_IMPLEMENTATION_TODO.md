# Report Implementation TODO - Lengkap

**Status**: Analisis kebutuhan  
**Tanggal**: Februari 2026  
**Total Reports**: 200+ (dari iPos Professional)  
**Sudah Implemented**: 12  
**Belum Implemented**: 188+  

---

## 📊 RINGKASAN IMPLEMENTASI

### ✅ SUDAH IMPLEMENTED (12 Reports)

#### General Trading (3)
- [x] Sales Orders Report
- [x] Purchase Orders Report  
- [x] Invoices Report

#### Packaging (2)
- [x] Production Report (SPK)
- [x] QC Report

#### Trucking (2)
- [x] Delivery Report (Surat Jalan)
- [x] Invoices Report

#### Master Data (2)
- [x] Products Report
- [x] Customers Report

#### Inventory (1)
- [x] Stock Report

#### Finance (2)
- [x] AR Report (Piutang)
- [x] AP Report (Hutang)

---

## ❌ BELUM IMPLEMENTED (188+)

### 1. MASTER DATA (9 reports)
- [ ] Daftar Supplier
- [ ] Daftar Karyawan/Sales
- [ ] Daftar Gudang
- [ ] Daftar Kategori Produk
- [ ] Daftar Satuan
- [ ] Daftar Merek
- [ ] Daftar Wilayah
- [ ] Daftar Grup Pelanggan
- [ ] Daftar Bank

**Storage Keys Needed**:
- `StorageKeys.PACKAGING.SUPPLIERS` (atau GENERAL_TRADING.SUPPLIERS)
- `StorageKeys.PACKAGING.EMPLOYEES`
- `StorageKeys.PACKAGING.WAREHOUSES`
- `StorageKeys.PACKAGING.CATEGORIES`
- `StorageKeys.PACKAGING.UNITS`
- `StorageKeys.PACKAGING.BRANDS`
- `StorageKeys.PACKAGING.REGIONS`
- `StorageKeys.PACKAGING.CUSTOMER_GROUPS`
- `StorageKeys.PACKAGING.BANKS`

---

### 2. PENJUALAN (22 reports)
- [ ] Pesanan Penjualan Per Item
- [ ] Penjualan
- [ ] Retur Penjualan
- [ ] Penjualan Per Item
- [ ] Retur Jual Per Item
- [ ] Penjualan Per Supplier
- [ ] Penjualan Per Wilayah Pelanggan
- [ ] Penjualan Per Wilayah (Format Jenis Merek)
- [ ] Penjualan Per Item Per Wilayah
- [ ] Penjualan Per Item Per Notransaksi
- [ ] Penjualan Per Grup Pelanggan
- [ ] Komisi Sales
- [ ] Pembayaran Komisi Sales
- [ ] Pembayaran dengan Kartu Bayar
- [ ] Pembayaran dengan E Money
- [ ] Tukar Tambah
- [ ] Point Pelanggan
- [ ] Analisa Pelanggan Aktif/Tidak Aktif
- [ ] Grafik Penjualan Item Terbaik
- [ ] Grafik Penjualan Harian
- [ ] Grafik Penjualan Bulanan
- [ ] Grafik Kadaluarsa Pelanggan
- [ ] CSV/XML Faktur Pajak Keluaran

**Storage Keys Needed**:
- `StorageKeys.GENERAL_TRADING.SALES_RETURNS`
- `StorageKeys.GENERAL_TRADING.SALES_COMMISSIONS`
- `StorageKeys.GENERAL_TRADING.PAYMENTS`
- `StorageKeys.GENERAL_TRADING.PROMOTIONS`

---

### 3. PEMBELIAN (13 reports)
- [ ] Pesanan Pembelian Per Item
- [ ] Pembelian
- [ ] Retur Pembelian
- [ ] Pembelian Per Item
- [ ] Retur Beli Per Item
- [ ] Pembelian Per Supplier
- [ ] Pembelian Per Gudang
- [ ] Pembelian Per Item Per Supplier
- [ ] Grafik Pembelian Item Terbesar
- [ ] Grafik Pembelian Harian
- [ ] Grafik Pembelian Bulanan
- [ ] CSV/XML Faktur Pajak Masukan

**Storage Keys Needed**:
- `StorageKeys.GENERAL_TRADING.PURCHASE_RETURNS`
- `StorageKeys.GENERAL_TRADING.WAREHOUSES`

---

### 4. PERALATAN/TRANSFER (5 reports)
- [ ] Transfer Barang
- [ ] Transfer Barang Per Item
- [ ] Mutasi Barang Antar Gudang
- [ ] Penerimaan Transfer
- [ ] Pengiriman Transfer

**Storage Keys Needed**:
- `StorageKeys.GENERAL_TRADING.TRANSFERS`
- `StorageKeys.GENERAL_TRADING.TRANSFER_RECEIPTS`

---

### 5. PERSEDIAAN (16 reports)
- [ ] Stok Barang Per Gudang
- [ ] Stok Minimum
- [ ] Stok Maksimum
- [ ] Kartu Stok
- [ ] Kartu Stok Per Item
- [ ] Mutasi Stok
- [ ] Penyesuaian Stok (Stock Opname)
- [ ] Stok Berdasarkan Harga Beli
- [ ] Stok Berdasarkan Harga Jual
- [ ] Nilai Persediaan
- [ ] Barang Kadaluarsa
- [ ] Barang Slow Moving
- [ ] Barang Fast Moving
- [ ] Analisa ABC
- [ ] Grafik Stok Per Gudang

**Storage Keys Needed**:
- `StorageKeys.PACKAGING.STOCK_ADJUSTMENTS`
- `StorageKeys.PACKAGING.STOCK_MOVEMENTS`

---

### 6. AKUNTANSI (14 reports)
- [ ] Neraca (Balance Sheet)
- [ ] Laba Rugi (Income Statement)
- [ ] Perubahan Modal
- [ ] Arus Kas (Cash Flow)
- [ ] Buku Besar
- [ ] Jurnal Umum
- [ ] Jurnal Penjualan
- [ ] Jurnal Pembelian
- [ ] Jurnal Kas Masuk
- [ ] Jurnal Kas Keluar
- [ ] Jurnal Memorial
- [ ] Trial Balance (Neraca Saldo)
- [ ] Rekening Koran
- [ ] Chart of Account (COA)

**Storage Keys Needed**:
- `StorageKeys.FINANCE.CHART_OF_ACCOUNTS`
- `StorageKeys.FINANCE.JOURNAL_ENTRIES`
- `StorageKeys.FINANCE.BANK_ACCOUNTS`

---

### 7. PIUTANG (AR) (9 reports)
- [ ] Piutang Per Faktur
- [ ] Aging Piutang (Umur Piutang)
- [ ] Pembayaran Piutang
- [ ] Sisa Piutang
- [ ] Piutang Jatuh Tempo
- [ ] Piutang Overdue
- [ ] Kartu Piutang
- [ ] Analisa Piutang

**Storage Keys Needed**:
- `StorageKeys.FINANCE.AR_PAYMENTS`
- `StorageKeys.FINANCE.AR_AGING`

---

### 8. HUTANG (AP) (9 reports)
- [ ] Hutang Per Faktur
- [ ] Aging Hutang (Umur Hutang)
- [ ] Pembayaran Hutang
- [ ] Sisa Hutang
- [ ] Hutang Jatuh Tempo
- [ ] Hutang Overdue
- [ ] Kartu Hutang
- [ ] Analisa Hutang

**Storage Keys Needed**:
- `StorageKeys.FINANCE.AP_PAYMENTS`
- `StorageKeys.FINANCE.AP_AGING`

---

### 9. KAS/BANK (11 reports)
- [ ] Kas Masuk
- [ ] Kas Keluar
- [ ] Saldo Kas
- [ ] Mutasi Kas
- [ ] Kas Per Akun
- [ ] Bank Masuk
- [ ] Bank Keluar
- [ ] Saldo Bank
- [ ] Mutasi Bank
- [ ] Rekonsiliasi Bank
- [ ] Petty Cash

**Storage Keys Needed**:
- `StorageKeys.FINANCE.CASH_TRANSACTIONS`
- `StorageKeys.FINANCE.BANK_TRANSACTIONS`
- `StorageKeys.FINANCE.PETTY_CASH`

---

### 10. DEPOSIT/UANG MUKA (5 reports)
- [ ] Deposit Pelanggan
- [ ] Penggunaan Deposit
- [ ] Saldo Deposit
- [ ] Deposit Supplier
- [ ] Mutasi Deposit

**Storage Keys Needed**:
- `StorageKeys.FINANCE.CUSTOMER_DEPOSITS`
- `StorageKeys.FINANCE.SUPPLIER_DEPOSITS`

---

### 11. PAJAK (11 reports)
- [ ] PPN Masukan
- [ ] PPN Keluaran
- [ ] SPT Masa PPN
- [ ] PPh 21
- [ ] PPh 22
- [ ] PPh 23
- [ ] PPh 25
- [ ] PPh 29
- [ ] PPh Final
- [ ] e-Faktur
- [ ] CSV Faktur Pajak

**Storage Keys Needed**:
- `StorageKeys.FINANCE.TAX_TRANSACTIONS`
- `StorageKeys.FINANCE.TAX_INVOICES`

---

### 12. PRODUKSI (7 reports)
- [ ] Bill of Material (BOM)
- [ ] Work Order (sudah ada template, tapi belum di-implement)
- [ ] Biaya Produksi
- [ ] Material Usage
- [ ] Waste/Scrap
- [ ] Kapasitas Produksi

**Storage Keys Needed**:
- `StorageKeys.PACKAGING.BOM`
- `StorageKeys.PACKAGING.PRODUCTION_COSTS`
- `StorageKeys.PACKAGING.MATERIAL_USAGE`
- `StorageKeys.PACKAGING.WASTE`

---

### 13. LABA RUGI DETAIL (8 reports)
- [ ] Laba Rugi Per Item
- [ ] Laba Rugi Per Pelanggan
- [ ] Laba Rugi Per Supplier
- [ ] Laba Rugi Per Sales
- [ ] Laba Rugi Per Wilayah
- [ ] Laba Rugi Per Kategori
- [ ] Margin Penjualan
- [ ] HPP (Harga Pokok Penjualan)

**Storage Keys Needed**:
- Kombinasi dari Sales, Purchase, Inventory

---

### 14. ANALISA & GRAFIK (11 reports)
- [ ] Analisa Penjualan
- [ ] Analisa Pembelian
- [ ] Analisa Pelanggan
- [ ] Analisa Supplier
- [ ] Analisa Produk
- [ ] Trend Penjualan
- [ ] Trend Pembelian
- [ ] Perbandingan Periode
- [ ] Dashboard Grafik Penjualan
- [ ] Dashboard Grafik Pembelian
- [ ] Dashboard Grafik Keuangan

**Note**: Ini butuh chart/grafik, bukan hanya Excel

---

### 15. AKTIVITAS/AUDIT (6 reports)
- [ ] User Activity Log
- [ ] Login History
- [ ] Perubahan Data
- [ ] Transaksi Void/Batal
- [ ] Approval History
- [ ] Backup History

**Storage Keys Needed**:
- `StorageKeys.SYSTEM.ACTIVITY_LOGS`
- `StorageKeys.SYSTEM.LOGIN_HISTORY`
- `StorageKeys.SYSTEM.DATA_CHANGES`

---

### 16. CUSTOM/KHUSUS (7 reports)
- [ ] Daftar Harga
- [ ] Promo/Diskon
- [ ] Bonus/Hadiah
- [ ] Konsinyasi
- [ ] Titipan
- [ ] Service/Reparasi
- [ ] Membership/Loyalty

**Storage Keys Needed**:
- `StorageKeys.GENERAL_TRADING.PRICE_LISTS`
- `StorageKeys.GENERAL_TRADING.PROMOTIONS`
- `StorageKeys.GENERAL_TRADING.CONSIGNMENTS`

---

## 🎯 PRIORITAS IMPLEMENTASI

### PHASE 1 - CRITICAL (Harus ada)
1. **Packaging Production** - Work Order (sudah ada template)
2. **Packaging QC** - QC Report (sudah ada template)
3. **Packaging Delivery** - Delivery Note
4. **Master Data** - Suppliers, Employees, Warehouses
5. **Inventory** - Stock per Warehouse, Stock Adjustments
6. **Finance** - AR/AP Aging, Cash Flow

### PHASE 2 - IMPORTANT (Penting)
1. **Sales** - Per Item, Per Customer, Per Region
2. **Purchase** - Per Item, Per Supplier
3. **Accounting** - Balance Sheet, Income Statement, Trial Balance
4. **Tax** - PPN, PPh reports
5. **Profit** - Profit & Loss per Item/Customer

### PHASE 3 - NICE TO HAVE (Bonus)
1. **Analysis** - Trend, Comparison, Dashboard
2. **Activity** - Audit logs, User activity
3. **Custom** - Price lists, Promotions, Loyalty

---

## 📋 CHECKLIST IMPLEMENTASI

### Untuk setiap report, perlu:
- [ ] Tentukan storage keys yang diperlukan
- [ ] Buat template di `report-template-engine.ts`
- [ ] Buat function di `report-service.ts`
- [ ] Update switch case di `FullReports.tsx`
- [ ] Test dengan data real
- [ ] Verify formatting (header, totals, etc)

---

## 🔧 STRUKTUR IMPLEMENTASI

### 1. Storage Keys (di `storage.ts`)
```typescript
StorageKeys.PACKAGING.SUPPLIERS = 'packaging_suppliers'
StorageKeys.PACKAGING.EMPLOYEES = 'packaging_employees'
// dst...
```

### 2. Template Engine (di `report-template-engine.ts`)
```typescript
suppliersReport: (data: any[]) => ReportTemplate {
  return {
    title: 'Daftar Supplier',
    headers: ['Kode', 'Nama', 'Kontak', 'Telepon', 'Email'],
    data: data.map(s => ({
      'Kode': s.code,
      'Nama': s.name,
      'Kontak': s.contact,
      'Telepon': s.phone,
      'Email': s.email,
    })),
    formatting: { headerBgColor: 'FFD966', alternateRowColor: true },
  }
}
```

### 3. Report Service (di `report-service.ts`)
```typescript
async generateSuppliersReport(): Promise<void> {
  const suppliers = await storageService.get(StorageKeys.PACKAGING.SUPPLIERS);
  const data = extractStorageValue(suppliers);
  const template = reportTemplateEngine.suppliersReport(data);
  const filename = excelFormatter.generateFilename('Daftar_Supplier');
  excelFormatter.exportReport(template, filename);
}
```

### 4. UI Integration (di `FullReports.tsx`)
```typescript
case 'master-suppliers':
  await reportService.generateSuppliersReport();
  break;
```

---

## 📊 ESTIMASI EFFORT

| Category | Reports | Effort | Priority |
|----------|---------|--------|----------|
| Master Data | 9 | 2 jam | HIGH |
| Sales | 22 | 4 jam | HIGH |
| Purchase | 13 | 3 jam | HIGH |
| Inventory | 16 | 3 jam | HIGH |
| Finance | 40+ | 8 jam | HIGH |
| Production | 7 | 2 jam | MEDIUM |
| Analysis | 11 | 4 jam | MEDIUM |
| Custom | 7 | 2 jam | LOW |
| **TOTAL** | **188+** | **~28 jam** | - |

---

## 🚀 NEXT STEPS

1. **Prioritas**: Fokus ke PHASE 1 dulu
2. **Storage Keys**: Verify semua keys di `storage.ts`
3. **Templates**: Buat template untuk setiap report
4. **Functions**: Implement report generation functions
5. **Testing**: Test dengan data real
6. **Documentation**: Update docs untuk setiap report

---

**Bro, ini banyak banget ya. Kita mulai dari mana dulu?**

