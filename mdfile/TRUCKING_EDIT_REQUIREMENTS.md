# Trucking Edit Requirements - DO, Petty Cash, Delivery Note

## 📋 User Requirements (dari Mba Nia)

### 1. **Delivery Order (DO)** ✅
- Harus bisa di-edit kapan saja
- Tidak ada pembatasan status

### 2. **Petty Cash Request** ✅
- Harus bisa di-edit kapan saja
- Bahkan setelah generate memo
- Memo harus auto-update jika ada perubahan di request

### 3. **Delivery Note (DN)** ❌ ADA MASALAH
- Harus bisa di-edit kapan saja
- **MASALAH**: Upload SJ button hilang setelah upload pertama kali
- **REQUIREMENT**: Harus bisa re-upload atau tambah upload SJ meskipun sudah ada yang di-upload sebelumnya

---

## 🔍 MASALAH YANG DITEMUKAN

### Trucking Delivery Note - Upload SJ Button Hilang

**File**: `src/pages/Trucking/Shipments/DeliveryNote.tsx`

**Masalah**: Line 1413
```typescript
onUploadSigned={!item.signedDocumentId ? () => handleUploadSignedDocument(item) : undefined}
```

**Penjelasan**:
- Upload button hanya muncul jika `signedDocumentId` kosong
- Setelah upload pertama kali, `signedDocumentId` terisi
- Button upload hilang dan tidak bisa re-upload atau tambah upload

**Dampak**:
- User tidak bisa upload ulang jika ada kesalahan
- User tidak bisa tambah upload dokumen tambahan
- User terjebak dengan upload pertama

---

## ✅ SOLUSI

### 1. **Ubah kondisi upload button** (Line 1413)
```typescript
// BEFORE:
onUploadSigned={!item.signedDocumentId ? () => handleUploadSignedDocument(item) : undefined}

// AFTER:
onUploadSigned={() => handleUploadSignedDocument(item)}
```

**Alasan**: 
- Upload button harus selalu muncul
- User bisa re-upload atau tambah upload kapan saja

### 2. **Update handleUploadSignedDocument** (Line 1039)
- Perlu handle multiple uploads (append, bukan replace)
- Perlu handle re-upload (replace existing)

### 3. **Update handleEdit** (Line 831)
- Pastikan tidak ada pembatasan status untuk edit
- Sudah OK, tidak ada pembatasan

---

## 📊 STATUS CHECKLIST

| Item | Status | Notes |
|---|---|---|
| DO Edit | ✅ OK | Bisa edit kapan saja, tidak ada pembatasan |
| Petty Cash Edit | ✅ OK | Bisa edit kapan saja, tidak ada pembatasan |
| Petty Cash Memo Auto-Update | ⚠️ PERLU CEK | Perlu verifikasi apakah memo auto-update saat request di-edit |
| DN Edit | ✅ OK | Bisa edit kapan saja, tidak ada pembatasan |
| DN Upload SJ | ❌ MASALAH | Button hilang setelah upload pertama |
| DN Re-upload SJ | ❌ MASALAH | Tidak bisa re-upload |
| DN Tambah Upload SJ | ❌ MASALAH | Tidak bisa tambah upload |

---

## 🎯 NEXT STEPS

1. Fix upload button condition di Trucking DN (Line 1413)
2. Update handleUploadSignedDocument untuk support multiple uploads
3. Verifikasi Petty Cash memo auto-update
4. Test semua scenario:
   - Edit DO
   - Edit Petty Cash
   - Edit DN
   - Upload SJ
   - Re-upload SJ
   - Tambah upload SJ
