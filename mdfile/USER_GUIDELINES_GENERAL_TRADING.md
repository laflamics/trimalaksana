# Panduan Pengguna - Modul General Trading

---

## Modul General Trading

### Gambaran Umum

General Trading menangani pembelian dan penjualan produk. Alur kerja utama:

**Alur Penjualan**: Pesanan Penjualan → Pengiriman → Faktur → Pembayaran  
**Alur Pembelian**: Permintaan Pembelian → Pesanan Pembelian → Penerimaan Barang → Pembayaran

### Pesanan Penjualan

#### Membuat Pesanan Penjualan

1. Pergi ke **Pesanan Penjualan** → **Pesanan Baru**
2. Isi detail:
   - **Pelanggan**: Pilih dari daftar
   - **Tanggal Pesanan**: Tanggal hari ini (terisi otomatis)
   - **Tanggal Pengiriman**: Kapan pelanggan mengharapkan pengiriman
   - **Item**: Tambahkan produk dan jumlah
3. Klik **Simpan**
4. Status berubah menjadi **DRAFT**

#### Mengkonfirmasi Pesanan Penjualan

1. Buka Pesanan Penjualan
2. Tinjau semua detail
3. Klik **Konfirmasi**
4. Status berubah menjadi **OPEN**
5. Sistem secara otomatis membuat Nota Pengiriman

#### Membatalkan Pesanan Penjualan

1. Buka Pesanan Penjualan (harus dalam status DRAFT)
2. Klik **Batalkan**
3. Status berubah menjadi **CANCELLED**
4. Tidak dapat dibatalkan

### Nota Pengiriman

#### Membuat Nota Pengiriman

1. Pergi ke **Nota Pengiriman** → **Nota Baru**
2. Pilih **Pesanan Penjualan** yang akan dikirim
3. Verifikasi item dan jumlah
4. Masukkan **Tanggal Pengiriman** dan **Info Pengemudi**
5. Klik **Simpan**

#### Menyelesaikan Pengiriman

1. Buka Nota Pengiriman
2. Klik **Tandai Sebagai Terkirim**
3. Masukkan **Tanggal Pengiriman Aktual**
4. Klik **Konfirmasi**
5. Sistem secara otomatis membuat Faktur

### Faktur

#### Melihat Faktur

1. Pergi ke **Keuangan** → **Faktur**
2. Lihat semua faktur dengan status:
   - **DRAFT**: Belum dikirim
   - **SENT**: Dikirim ke pelanggan
   - **PAID**: Pembayaran diterima
   - **OVERDUE**: Pembayaran melewati tanggal jatuh tempo

#### Mengirim Faktur

1. Buka Faktur
2. Klik **Kirim ke Pelanggan**
3. Masukkan email pelanggan (opsional)
4. Klik **Konfirmasi**
5. Status berubah menjadi **SENT**

#### Mencatat Pembayaran

1. Buka Faktur (status: SENT)
2. Klik **Catat Pembayaran**
3. Masukkan **Jumlah Pembayaran** dan **Tanggal**
4. Pilih **Metode Pembayaran** (Tunai, Transfer Bank, Cek)
5. Klik **Simpan**
6. Status berubah menjadi **PAID**

### Pesanan Pembelian

#### Membuat Pesanan Pembelian

1. Pergi ke **Pembelian** → **Pesanan Pembelian Baru**
2. Pilih **Pemasok**
3. Tambahkan item dan jumlah
4. Masukkan **Tanggal Pengiriman**
5. Klik **Simpan**

#### Mengkonfirmasi Pesanan Pembelian

1. Buka PO (status: DRAFT)
2. Tinjau detail
3. Klik **Konfirmasi**
4. Status berubah menjadi **OPEN**
5. Pemasok menerima notifikasi

#### Menerima Barang (GRN)

1. Pergi ke **Pembelian** → **Nota Penerimaan Barang**
2. Klik **GRN Baru**
3. Pilih **Pesanan Pembelian**
4. Verifikasi item dan jumlah yang diterima
5. Klik **Simpan**
6. Inventaris diperbarui secara otomatis

---

## Alur Kerja Penjualan Lengkap (General Trading)

**Langkah 1: Buat Pesanan Penjualan**
- Pergi ke Pesanan Penjualan → Baru
- Pilih pelanggan
- Tambahkan produk dan jumlah
- Simpan

**Langkah 2: Konfirmasi Pesanan Penjualan**
- Buka PO
- Tinjau detail
- Klik Konfirmasi
- Status: OPEN

**Langkah 3: Buat Nota Pengiriman**
- Pergi ke Nota Pengiriman → Baru
- Pilih PO
- Verifikasi item
- Simpan

**Langkah 4: Selesaikan Pengiriman**
- Buka Nota Pengiriman
- Klik Tandai Sebagai Terkirim
- Masukkan tanggal pengiriman aktual
- Konfirmasi

**Langkah 5: Kirim Faktur**
- Buka Faktur (dibuat otomatis)
- Klik Kirim ke Pelanggan
- Pelanggan menerima faktur

**Langkah 6: Catat Pembayaran**
- Buka Faktur
- Klik Catat Pembayaran
- Masukkan detail pembayaran
- Simpan
- Status: PAID
