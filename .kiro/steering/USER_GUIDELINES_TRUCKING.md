# Panduan Pengguna - Modul Trucking

---

## Modul Trucking

### Gambaran Umum

Trucking mengelola logistik dan transportasi. Fitur utama:

- Manajemen kendaraan
- Manajemen pengemudi
- Perencanaan rute
- Pesanan pengiriman
- Surat Jalan (dokumen pengiriman)

### Kendaraan

#### Menambahkan Kendaraan

1. Pergi ke **Data Master** → **Kendaraan**
2. Klik **Tambah Kendaraan**
3. Masukkan detail:
   - **Plat Nomor**: Registrasi kendaraan
   - **Tipe**: Truk, Van, Motor, dll
   - **Kapasitas**: Kapasitas beban maksimal
   - **Status**: Aktif/Tidak Aktif
4. Klik **Simpan**

#### Pelacakan Pemeliharaan

1. Buka Kendaraan
2. Pergi ke **Riwayat Pemeliharaan**
3. Klik **Tambah Catatan Pemeliharaan**
4. Masukkan:
   - **Tanggal**: Kapan pemeliharaan dilakukan
   - **Tipe**: Ganti oli, Penggantian ban, dll
   - **Biaya**: Biaya pemeliharaan
   - **Catatan**: Detail tambahan
5. Klik **Simpan**

### Pengemudi

#### Menambahkan Pengemudi

1. Pergi ke **Data Master** → **Pengemudi**
2. Klik **Tambah Pengemudi**
3. Masukkan detail:
   - **Nama**: Nama lengkap
   - **Nomor SIM**: Nomor surat izin mengemudi
   - **Telepon**: Nomor kontak
   - **Status**: Aktif/Tidak Aktif
4. Klik **Simpan**

#### Kinerja Pengemudi

1. Buka Pengemudi
2. Lihat **Metrik Kinerja**:
   - Total pengiriman
   - Tingkat pengiriman tepat waktu
   - Rating pelanggan
   - Insiden/keluhan

### Pesanan Pengiriman

#### Membuat Pesanan Pengiriman

1. Pergi ke **Pesanan Pengiriman** → **Pesanan Baru**
2. Pilih **Pelanggan** dan **Alamat Pengiriman**
3. Tambahkan item yang akan dikirim
4. Tugaskan **Pengemudi** dan **Kendaraan**
5. Atur **Tanggal Pengiriman** dan **Jendela Waktu**
6. Klik **Simpan**

#### Melacak Pengiriman

1. Buka Pesanan Pengiriman
2. Lihat **Status**:
   - 🟡 **PENDING**: Menunggu untuk dimulai
   - 🔵 **IN_TRANSIT**: Sedang dalam perjalanan
   - 🟢 **DELIVERED**: Selesai
3. Lihat **Lokasi Pengemudi** (jika GPS diaktifkan)
4. Lihat **Perkiraan Waktu Tiba**

### Surat Jalan (Dokumen Pengiriman)

#### Membuat Surat Jalan

1. Buka Pesanan Pengiriman
2. Klik **Buat Surat Jalan**
3. Tinjau detail dokumen
4. Klik **Cetak** atau **Simpan sebagai PDF**
5. Berikan kepada pengemudi sebelum keberangkatan

#### Menyelesaikan Pengiriman

1. Pengemudi menerima Surat Jalan
2. Mengirimkan barang ke pelanggan
3. Pelanggan menandatangani dokumen
4. Pengemudi mengembalikan dokumen yang ditandatangani
5. Unggah foto/scan di sistem
6. Status berubah menjadi **DELIVERED**

---

## Alur Kerja Pengiriman Lengkap (Trucking)

**Langkah 1: Buat Pesanan Pengiriman**
- Pergi ke Pesanan Pengiriman → Baru
- Pilih pelanggan dan alamat
- Tambahkan item
- Tugaskan pengemudi dan kendaraan
- Simpan

**Langkah 2: Buat Surat Jalan**
- Buka Pesanan Pengiriman
- Klik Buat Surat Jalan
- Tinjau detail
- Cetak atau simpan sebagai PDF

**Langkah 3: Mulai Pengiriman**
- Pengemudi menerima Surat Jalan
- Kendaraan berangkat
- Status berubah menjadi IN_TRANSIT

**Langkah 4: Lacak Pengiriman**
- Lihat lokasi pengemudi di peta
- Lihat perkiraan waktu tiba
- Terima notifikasi saat tiba

**Langkah 5: Selesaikan Pengiriman**
- Pengemudi tiba di lokasi
- Pelanggan menerima barang
- Pelanggan menandatangani Surat Jalan
- Pengemudi unggah bukti pengiriman
- Status berubah menjadi DELIVERED

**Langkah 6: Konfirmasi di Sistem**
- Buka Pesanan Pengiriman
- Verifikasi bukti pengiriman
- Klik Konfirmasi Pengiriman
- Pesanan selesai
