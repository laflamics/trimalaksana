# Trucking Edit Functionality - User Guide

## 📋 Ringkasan Perubahan

Semua dokumen di Trucking sekarang bisa di-edit kapan saja:

### ✅ Delivery Order (DO)
- Bisa edit kapan saja
- Bisa ubah customer, items, vehicle, driver, route
- Bisa ubah status Open ↔ Close

### ✅ Petty Cash Request
- Bisa edit kapan saja
- Bisa ubah amount, purpose, description
- Bisa ubah status Open → Close
- **Bisa edit bahkan setelah generate memo**

### ✅ Delivery Note (DN)
- Bisa edit kapan saja
- Bisa ubah items, driver, vehicle, route
- **Bisa upload SJ kapan saja (button selalu muncul)**
- **Bisa re-upload SJ (ganti dokumen)**
- **Bisa tambah upload dokumen (append)**

---

## 🎯 Workflow Contoh

### Scenario 1: Edit DO setelah dibuat
1. Buka Delivery Order
2. Klik **Edit** button
3. Ubah data (customer, items, dll)
4. Klik **Save**
5. ✅ DO berhasil diupdate

### Scenario 2: Edit Petty Cash setelah generate memo
1. Buka Petty Cash Request
2. Generate memo dari request
3. Klik **Edit** button (button masih ada)
4. Ubah amount atau purpose
5. Klik **Save**
6. ✅ Request berhasil diupdate
7. ⚠️ Memo tetap sama (snapshot dari saat dibuat)
8. Jika perlu update memo: Generate memo baru

### Scenario 3: Upload SJ berkali-kali
1. Buka Delivery Note
2. Klik **Upload SJ** button
3. Upload dokumen pertama
4. ✅ Dokumen tersimpan
5. Klik **Upload SJ** button lagi (button masih ada)
6. Upload dokumen kedua (append)
7. ✅ Kedua dokumen tersimpan
8. Klik **View** untuk lihat semua dokumen

---

## 📝 Petty Cash Memo - Important Note

### Memo adalah Snapshot
Ketika Anda generate memo dari request, memo menyimpan **snapshot** (copy) dari data request saat itu.

**Jika request di-edit setelah memo dibuat:**
- ✅ Request berhasil di-edit
- ⚠️ Memo tetap menampilkan data lama (tidak auto-update)
- ✅ Bisa generate memo baru jika ada perubahan

**Alasan**: Memo harus mencerminkan data saat memo dibuat (untuk audit trail dan compliance)

### Contoh:
```
1. Create Request: Amount = Rp 1.000.000
2. Generate Memo: Memo menampilkan Rp 1.000.000
3. Edit Request: Amount = Rp 1.500.000
4. Memo masih menampilkan Rp 1.000.000 (tidak berubah)
5. Generate Memo Baru: Memo baru menampilkan Rp 1.500.000
```

---

## 🔄 Delivery Note Upload - Multiple Documents

### Upload Pertama
1. Buka Delivery Note
2. Klik **Upload SJ** button
3. Pilih dokumen
4. Klik **Upload**
5. ✅ Dokumen tersimpan

### Upload Kedua (Re-upload atau Tambah)
1. Klik **Upload SJ** button lagi (button masih ada)
2. Pilih dokumen baru
3. Klik **Upload**
4. ✅ Dokumen baru ditambahkan (dokumen lama tetap ada)

### View Semua Dokumen
1. Klik **View** button
2. Lihat semua dokumen yang sudah di-upload
3. Bisa navigate dengan arrow buttons
4. Bisa download dokumen

---

## ⚠️ Important Notes

### Status Delivery Note
- Setelah upload SJ, status otomatis berubah menjadi **Close**
- Jika perlu edit lagi, bisa klik **Reopen** untuk ubah status ke Open

### Edit Setelah Close
- Delivery Note bisa di-edit bahkan setelah status Close
- Tidak ada pembatasan status untuk edit

### Delete
- Hanya bisa delete jika status Open
- Jika status Close, harus Reopen dulu baru bisa delete

---

## 🆘 Troubleshooting

### Upload SJ button tidak muncul
- **Solusi**: Refresh halaman (F5)
- Jika masih tidak muncul, hubungi admin

### Tidak bisa edit setelah upload
- **Solusi**: Klik **Reopen** button untuk ubah status ke Open
- Kemudian klik **Edit** button

### Dokumen tidak tersimpan setelah upload
- **Solusi**: Cek koneksi ke server
- Pastikan server PC Utama sedang berjalan
- Coba upload lagi

---

## 📞 Support

Jika ada masalah atau pertanyaan, hubungi admin atau technical support.
