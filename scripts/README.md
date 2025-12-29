# Seed Script

Script untuk mengisi data awal dari file Excel ke storage.

## File Excel yang Dibutuhkan

1. **Karyawan.xls** - Data karyawan/staff untuk HR
2. **Master_Customer_Supplier.xls** - Data customer dan supplier
3. **merged_data_all_final.xlsx** - Data produk dari sheet "daftar item sales"

## Instalasi

```bash
npm install
```

## Penggunaan

### Seed ke Local Storage (JSON files)

```bash
npm run seed
```

Script akan:
1. Membaca file Excel dari folder `data/`
2. Mengkonversi data ke format yang sesuai
3. Menyimpan ke file JSON di folder `data/` (jika server tidak tersedia)
4. Atau menyimpan ke server Docker (jika server berjalan di `http://localhost:3001`)

### Seed ke Server Docker

Pastikan Docker server berjalan:

```bash
cd docker
docker-compose up -d
```

Kemudian jalankan seed:

```bash
npm run seed
```

Script akan otomatis mendeteksi server dan menyimpan data ke server.

## Format Data

### Staff (Karyawan)
- NIP, Nama Lengkap, Departemen, Section, Jabatan
- Tanggal Lahir, Alamat, Alamat KTP
- No. HP, No. KTP, No. Paspor, No. SIM A/C
- No. BPJSTEK, No. BPJSKES, No. NPWP
- No. Rekening, Nama Bank
- Gaji Pokok, Premi Hadir, Tunjangan Transport, Tunjangan Makan

### Customers
- Kode, Nama (Company Name), Kontak (PIC Name)
- NPWP, Email, Telepon, Alamat, Kategori

### Suppliers
- Kode, Nama (Company Name), Kontak (PIC Name)
- NPWP, Email, Telepon, Alamat, Kategori

### Products
- Kode (SKU/ID), Nama, Satuan (Unit)
- Stock Aman, Stock Minimum
- Kategori, Supplier

## Troubleshooting

Jika ada error:
1. Pastikan file Excel ada di folder `data/`
2. Pastikan format kolom sesuai dengan yang diharapkan
3. Cek console output untuk melihat sheet yang digunakan
4. Pastikan server Docker berjalan jika ingin seed ke server

