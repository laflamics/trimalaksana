# Backup & Restore - UPDATED dengan Business Unit Selector

**Status**: ✅ Selesai  
**Update**: Restore tab sekarang punya business unit selector  
**Tanggal**: Maret 2026  

---

## 🎯 Update Terbaru

### Restore Tab - Sekarang Ada Business Unit Selector!

**Sebelumnya:**
- Upload file → Auto-detect business unit dari file

**Sekarang:**
- Pilih business unit terlebih dahulu
- Upload file → Validasi business unit harus sesuai
- Jika tidak sesuai → Error message yang jelas

---

## 🚀 Cara Kerja Restore

### Step 1: Pilih Business Unit
```
Restore Data tab → Pilih salah satu:
- 📦 Packaging
- 🏪 General Trading
- 🚚 Trucking
```

### Step 2: Upload File Backup
```
Upload file backup JSON
(File harus untuk business unit yang dipilih)
```

### Step 3: Validasi
```
Sistem cek:
✓ File format valid
✓ Business unit di file = business unit yang dipilih
✓ Jika tidak sesuai → Error message
```

### Step 4: Preview
```
Lihat preview data yang akan di-restore
(Jumlah items dari SEMUA key)
```

### Step 5: Restore
```
Klik "♻️ Restore Sekarang"
Konfirmasi warning
SEMUA data di-restore completely
```

---

## 📝 Validasi Business Unit

### Error Handling:
```
Jika file backup untuk Packaging tapi user pilih General Trading:
❌ Error: File backup adalah untuk 📦 Packaging, 
   tapi Anda memilih 🏪 General Trading. 
   Silakan pilih business unit yang sesuai atau upload file yang benar.
```

### Success Message:
```
✓ Restore untuk: 📦 Packaging
(Ditampilkan setelah pilih business unit)
```

---

## 🔧 Implementasi

### File yang Diupdate:
- `src/pages/SuperAdmin/BackupRestore.tsx`

### Perubahan:
1. Tambah `selectedUnit` state (default: 'packaging')
2. Tambah business unit selector buttons
3. Update `handleFileSelect()` untuk validasi business unit
4. Update `handleRestore()` untuk include selected unit
5. Clear form saat ganti business unit

### Validasi:
```typescript
if (backup.businessUnit !== selectedUnit) {
  throw new Error(
    `File backup adalah untuk ${businessUnitLabels[backup.businessUnit]}, ` +
    `tapi Anda memilih ${businessUnitLabels[selectedUnit]}. ` +
    `Silakan pilih business unit yang sesuai atau upload file yang benar.`
  );
}
```

---

## ✅ Checklist

- ✅ Business unit selector di restore tab
- ✅ Validasi business unit sebelum restore
- ✅ Error message yang jelas
- ✅ Form reset saat ganti business unit
- ✅ UI user-friendly
- ✅ Type-safe

---

## 🎓 Contoh Penggunaan

### Restore Packaging Data
```
1. Super Admin → Backup & Restore
2. Klik tab "♻️ Restore Data"
3. Klik button "📦 Packaging" (selected)
4. Upload file "backup-packaging-2026-03-12.json"
5. Preview data
6. Klik "♻️ Restore Sekarang"
7. Konfirmasi
8. SEMUA Packaging data di-restore
```

### Restore General Trading Data
```
1. Super Admin → Backup & Restore
2. Klik tab "♻️ Restore Data"
3. Klik button "🏪 General Trading" (selected)
4. Upload file "backup-general-trading-2026-03-12.json"
5. Preview data
6. Klik "♻️ Restore Sekarang"
7. Konfirmasi
8. SEMUA GT data di-restore
```

### Error Case - Business Unit Mismatch
```
1. Super Admin → Backup & Restore
2. Klik tab "♻️ Restore Data"
3. Klik button "📦 Packaging" (selected)
4. Upload file "backup-general-trading-2026-03-12.json"
5. ❌ Error: File backup adalah untuk 🏪 General Trading, 
   tapi Anda memilih 📦 Packaging
6. Pilih business unit yang benar atau upload file yang sesuai
```

---

**Fitur Restore sekarang lebih aman dengan business unit selector!** 🎉
