# Daftar Wilayah Report - Quick Start Guide

## 🚀 Cara Menggunakan

### Step 1: Buka Full Reports
1. Pergi ke **Settings** (⚙️)
2. Klik **Full Reports**

### Step 2: Cari Laporan
- Cari: "Daftar Wilayah" atau "Region"
- Atau filter kategori: **Master Data** (📋)

### Step 3: Export ke Excel
- Klik tombol **Excel** (🟢) di sebelah "Daftar Wilayah"
- Tunggu proses generate (biasanya < 5 detik)
- File akan otomatis download

### Step 4: Buka File Excel
- File: `Daftar_Wilayah_YYYY-MM-DD.xlsx`
- Lokasi: Downloads folder
- Format: Professional dengan header berwarna merah

---

## 📊 Apa yang Ditampilkan

| Kolom | Deskripsi |
|-------|-----------|
| NO | Nomor urut |
| WILAYAH | Nama kota/wilayah |
| JUMLAH PELANGGAN | Berapa pelanggan di wilayah ini |
| JUMLAH SUPPLIER | Berapa supplier di wilayah ini |
| TOTAL ENTITAS | Total pelanggan + supplier |
| ALAMAT CONTOH | Contoh alamat dari wilayah |

---

## ✅ Prasyarat

- ✅ Data pelanggan sudah diimport
- ✅ Data supplier sudah diimport
- ✅ Server mode sudah dikonfigurasi
- ✅ Koneksi internet stabil

---

## ❌ Troubleshooting

### Error: "Report harus menggunakan server mode"
**Solusi**: 
1. Pergi ke Settings → Server Data
2. Masukkan Server URL
3. Klik Save
4. Coba export lagi

### Error: "Tidak ada data pelanggan atau supplier"
**Solusi**:
1. Pastikan data sudah diimport ke PostgreSQL
2. Cek di Master Data → Customers/Suppliers
3. Jika kosong, import data terlebih dahulu

### File tidak download
**Solusi**:
1. Check browser download settings
2. Disable popup blocker
3. Coba browser lain (Chrome/Firefox)

---

## 💡 Tips

- **Sorting**: Wilayah sudah diurutkan A-Z
- **Totals**: Lihat baris terakhir untuk ringkasan
- **Freeze Header**: Header tetap terlihat saat scroll
- **Print**: Bisa langsung print dari Excel

---

## 📞 Support

Jika ada masalah:
1. Check console logs (F12 → Console)
2. Lihat error message yang muncul
3. Hubungi IT support dengan screenshot error

---

**Laporan Daftar Wilayah siap digunakan!** ✨

