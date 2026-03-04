# Panduan Pengguna - Modul Keuangan & Akuntansi

---

## Keuangan & Akuntansi

### Gambaran Umum

Modul Keuangan menangani:
- Faktur dan pembayaran
- Piutang Usaha (AR)
- Utang Usaha (AP)
- Manajemen pajak
- Laporan keuangan

### Piutang Usaha (AR)

#### Melihat Piutang Usaha

1. Pergi ke **Keuangan** → **Piutang Usaha**
2. Lihat semua faktur pelanggan:
   - **Outstanding**: Belum dibayar
   - **Overdue**: Melewati tanggal jatuh tempo
   - **Paid**: Pembayaran diterima

#### Mengirim Pengingat Pembayaran

1. Buka Faktur
2. Klik **Kirim Pengingat**
3. Masukkan pesan pengingat
4. Klik **Kirim**
5. Pelanggan menerima email pengingat

#### Mencatat Pembayaran

1. Buka Faktur
2. Klik **Catat Pembayaran**
3. Masukkan:
   - **Jumlah**: Jumlah pembayaran
   - **Tanggal**: Tanggal pembayaran
   - **Metode**: Tunai, Transfer Bank, Cek
   - **Referensi**: Nomor cek atau referensi bank
4. Klik **Simpan**

### Utang Usaha (AP)

#### Melihat Utang Usaha

1. Pergi ke **Keuangan** → **Utang Usaha**
2. Lihat semua faktur pemasok:
   - **Outstanding**: Belum dibayar
   - **Overdue**: Melewati tanggal jatuh tempo
   - **Paid**: Pembayaran sudah dilakukan

#### Membayar Pemasok

1. Buka Faktur Pemasok
2. Klik **Bayar Faktur**
3. Masukkan:
   - **Jumlah**: Jumlah pembayaran
   - **Tanggal**: Tanggal pembayaran
   - **Metode**: Transfer Bank, Cek, Tunai
   - **Referensi**: Referensi bank atau nomor cek
4. Klik **Konfirmasi**
5. Status berubah menjadi **PAID**

### Manajemen Pajak

#### Mencatat Pajak

1. Pergi ke **Keuangan** → **Manajemen Pajak**
2. Klik **Catatan Pajak Baru**
3. Masukkan:
   - **Tipe**: PPN, PPh, dll
   - **Jumlah**: Jumlah pajak
   - **Tanggal**: Tanggal pajak
   - **Referensi**: Nomor faktur atau dokumen
4. Klik **Simpan**

#### Laporan Pajak

1. Pergi ke **Keuangan** → **Laporan Pajak**
2. Pilih **Periode** (bulanan, triwulanan, tahunan)
3. Klik **Buat Laporan**
4. Lihat atau unduh sebagai PDF

### Laporan Keuangan

#### Melihat Laporan

1. Pergi ke **Keuangan** → **Laporan**
2. Laporan yang tersedia:
   - **Laporan Laba Rugi**: Pendapatan dan biaya
   - **Neraca**: Aset, kewajiban, ekuitas
   - **Arus Kas**: Uang masuk dan keluar
   - **Neraca Saldo**: Ringkasan semua akun

#### Membuat Laporan

1. Pilih jenis laporan
2. Pilih **Periode** (rentang tanggal)
3. Klik **Buat**
4. Lihat di layar atau unduh sebagai PDF/Excel

### Data Master Keuangan

#### Menambahkan Produk

1. Pergi ke **Data Master** → **Produk**
2. Klik **Tambah Produk**
3. Masukkan detail:
   - **Kode**: Kode produk unik
   - **Nama**: Nama produk
   - **Kategori**: Kategori produk
   - **Satuan**: Satuan pengukuran (pcs, kg, dll)
   - **Harga**: Harga jual
   - **Biaya**: Biaya pembelian
   - **Stok**: Level stok saat ini
4. Klik **Simpan**

#### Menambahkan Pelanggan

1. Pergi ke **Data Master** → **Pelanggan**
2. Klik **Tambah Pelanggan**
3. Masukkan detail:
   - **Kode**: Kode pelanggan unik
   - **Nama**: Nama perusahaan/orang
   - **Kontak**: Nama kontak
   - **Telepon**: Nomor telepon
   - **Email**: Alamat email
   - **Alamat**: Alamat lengkap
   - **Kota**: Nama kota
   - **Syarat Pembayaran**: Net 30, Net 60, dll
4. Klik **Simpan**

#### Menambahkan Pemasok

1. Pergi ke **Data Master** → **Pemasok**
2. Klik **Tambah Pemasok**
3. Masukkan detail:
   - **Kode**: Kode pemasok unik
   - **Nama**: Nama perusahaan
   - **Kontak**: Nama kontak
   - **Telepon**: Nomor telepon
   - **Email**: Alamat email
   - **Alamat**: Alamat lengkap
   - **Syarat Pembayaran**: Net 30, Net 60, dll
4. Klik **Simpan**

---

## Laporan & Analitik

### Laporan Penjualan

- **Penjualan per Pelanggan**: Total penjualan per pelanggan
- **Penjualan per Produk**: Total penjualan per produk
- **Tren Penjualan**: Penjualan dari waktu ke waktu
- **Pelanggan Terbaik**: Pelanggan dengan performa terbaik

### Laporan Pembelian

- **Pembelian per Pemasok**: Total pembelian per pemasok
- **Tren Pembelian**: Pembelian dari waktu ke waktu
- **Pemasok Terbaik**: Pemasok terbaik

### Laporan Inventaris

- **Level Stok**: Stok saat ini semua produk
- **Pergerakan Stok**: Riwayat stok masuk/keluar
- **Peringatan Stok Rendah**: Produk di bawah level pemesanan ulang
- **Valuasi Inventaris**: Nilai total inventaris

### Membuat Laporan

1. Pergi ke bagian **Laporan**
2. Pilih jenis laporan
3. Pilih **Periode** (rentang tanggal)
4. Klik **Buat**
5. Lihat di layar atau unduh

### Mengekspor Data

1. Buka laporan apa pun
2. Klik **Ekspor**
3. Pilih format:
   - **PDF**: Untuk mencetak
   - **Excel**: Untuk analisis
   - **CSV**: Untuk impor data
4. File diunduh secara otomatis
