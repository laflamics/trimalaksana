# Panduan Pengguna - Modul Packaging

---

## Modul Packaging

### Gambaran Umum

Packaging menangani operasi manufaktur. Alur kerja utama:

**Alur Produksi**: Pesanan Penjualan → PPIC → SPK → Produksi → QA/QC → Pengiriman

### Pesanan Penjualan (Packaging)

Sama seperti General Trading, tetapi memicu alur kerja produksi.

### PPIC (Perencanaan Produksi & Kontrol Inventaris)

#### Melihat PPIC

1. Pergi ke **PPIC**
2. Lihat semua pesanan penjualan yang menunggu produksi
3. Indikator status menunjukkan:
   - 🟡 **PENDING**: Menunggu untuk dimulai
   - 🔵 **IN_PROGRESS**: Sedang diproduksi
   - 🟢 **COMPLETED**: Siap untuk QC

#### Merencanakan Produksi

1. Buka Pesanan Penjualan di PPIC
2. Klik **Rencanakan Produksi**
3. Atur **Tanggal Mulai Produksi**
4. Atur **Tanggal Penyelesaian yang Diharapkan**
5. Tugaskan **Tim Produksi**
6. Klik **Simpan**

### SPK (Surat Perintah Kerja - Work Order)

#### Membuat Surat Perintah Kerja

1. Pergi ke **Produksi** → **Surat Perintah Kerja**
2. Klik **SPK Baru**
3. Pilih **Pesanan Penjualan**
4. Sistem secara otomatis mengisi:
   - Detail produk
   - Bill of Materials (BOM)
   - Material yang diperlukan
5. Klik **Buat**

#### Memulai Produksi

1. Buka Surat Perintah Kerja
2. Klik **Mulai Produksi**
3. Masukkan **Waktu Mulai**
4. Klik **Konfirmasi**
5. Status berubah menjadi **IN_PROGRESS**

#### Menyelesaikan Produksi

1. Buka Surat Perintah Kerja (status: IN_PROGRESS)
2. Masukkan **Jumlah Aktual yang Diproduksi**
3. Masukkan **Waktu Selesai**
4. Klik **Selesai**
5. Status berubah menjadi **COMPLETED**

### QA/QC (Jaminan Kualitas/Kontrol Kualitas)

#### Memeriksa Produk

1. Pergi ke **QA/QC** → **Inspeksi**
2. Klik **Inspeksi Baru**
3. Pilih **Surat Perintah Kerja**
4. Lakukan pemeriksaan kualitas:
   - Inspeksi visual
   - Verifikasi dimensi
   - Tes fungsionalitas
5. Tandai item sebagai **PASS** atau **FAIL**

#### Menolak Produk

1. Buka Inspeksi
2. Tandai item sebagai **FAIL**
3. Masukkan **Alasan Penolakan**
4. Klik **Kirim**
5. Surat Perintah Kerja kembali ke produksi

#### Menyetujui Produk

1. Buka Inspeksi
2. Tandai semua item sebagai **PASS**
3. Klik **Setujui**
4. Produk siap untuk pengiriman

### Pengiriman Produksi

1. Pergi ke **Nota Pengiriman**
2. Klik **Nota Pengiriman Baru**
3. Pilih **Surat Perintah Kerja** (harus sudah disetujui QC)
4. Verifikasi jumlah
5. Klik **Simpan**
6. Ikuti proses yang sama seperti pengiriman General Trading

---

## Alur Kerja Produksi Lengkap (Packaging)

**Langkah 1: Buat Pesanan Penjualan**
- Pergi ke Pesanan Penjualan → Baru
- Pilih pelanggan
- Tambahkan produk
- Simpan dan Konfirmasi

**Langkah 2: Rencanakan Produksi (PPIC)**
- Pergi ke PPIC
- Pilih Pesanan Penjualan
- Klik Rencanakan Produksi
- Atur tanggal dan tim
- Simpan

**Langkah 3: Buat Surat Perintah Kerja (SPK)**
- Pergi ke Produksi → Surat Perintah Kerja
- Klik Baru
- Pilih Pesanan Penjualan
- Sistem secara otomatis mengisi BOM
- Buat

**Langkah 4: Mulai Produksi**
- Buka Surat Perintah Kerja
- Klik Mulai Produksi
- Masukkan waktu mulai
- Konfirmasi

**Langkah 5: Selesaikan Produksi**
- Buka Surat Perintah Kerja
- Masukkan jumlah yang diproduksi
- Masukkan waktu selesai
- Klik Selesai

**Langkah 6: Inspeksi Kualitas (QA/QC)**
- Pergi ke QA/QC → Inspeksi
- Klik Baru
- Pilih Surat Perintah Kerja
- Lakukan pemeriksaan
- Tandai sebagai PASS atau FAIL

**Langkah 7: Buat Nota Pengiriman**
- Pergi ke Nota Pengiriman → Baru
- Pilih Surat Perintah Kerja
- Verifikasi jumlah
- Simpan

**Langkah 8: Selesaikan Pengiriman & Faktur**
- Tandai pengiriman sebagai selesai
- Faktur dibuat otomatis
- Catat pembayaran
