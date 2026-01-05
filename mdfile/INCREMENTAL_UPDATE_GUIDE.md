# Panduan Incremental Update (Differential Package)

## Cara Kerja

Dengan `differentialPackage: true`, electron-builder akan membuat 2 file saat build:
1. **Full Installer** (`Setup 1.0.7.exe`) - untuk user baru atau install ulang
2. **Patch File** (`Setup 1.0.7.exe.patch`) - untuk update dari versi sebelumnya

## Cara Build & Deploy Update

### 1. Pastikan Versi Sebelumnya Ada di Server

**PENTING:** Untuk generate patch file, versi sebelumnya HARUS ada di folder `release-build/` saat build.

**Cara:**
- Copy installer versi sebelumnya ke folder `release-build/`
- Contoh: Jika mau build v1.0.7, pastikan `Setup 1.0.6.exe` ada di `release-build/`

### 2. Build Aplikasi

```bash
npm run build:app
```

Command ini akan:
- Build aplikasi (main + renderer)
- Generate installer dengan electron-builder
- **Otomatis generate patch file** jika versi sebelumnya ada
- Generate `latest.yml` dengan info patch file

### 3. Upload ke Server

Upload ke folder `docker/updates/`:
- `Setup 1.0.7.exe` (full installer)
- `Setup 1.0.7.exe.patch` (patch file) - **jika ada**
- `latest.yml` (update manifest)

**Struktur folder di server:**
```
docker/
  updates/
    latest.yml
    Setup 1.0.6.exe          # Versi sebelumnya (tetap simpan)
    Setup 1.0.7.exe          # Versi baru (full installer)
    Setup 1.0.7.exe.patch    # Patch file (untuk update dari 1.0.6)
```

### 4. User Update

**User yang sudah install v1.0.6:**
- Aplikasi check update → menemukan v1.0.7
- Download **patch file** saja (misal 10-30 MB)
- Apply patch → jadi v1.0.7

**User baru atau install ulang:**
- Download **full installer** (misal 100 MB)
- Install seperti biasa

## Keuntungan

✅ **Update lebih cepat** - hanya download file yang berubah
✅ **Menghemat bandwidth** - patch file jauh lebih kecil
✅ **User experience lebih baik** - update tidak perlu download ulang semua

## Catatan Penting

⚠️ **Versi sebelumnya harus ada** di `release-build/` saat build untuk generate patch
⚠️ **Simpan semua versi** di server (untuk generate patch versi berikutnya)
⚠️ **Patch hanya untuk versi sebelumnya** - tidak bisa skip versi (misal 1.0.5 → 1.0.7 harus download full)

## Troubleshooting

**Q: Patch file tidak ter-generate?**
A: Pastikan versi sebelumnya ada di folder `release-build/` saat build

**Q: User tetap download full installer?**
A: Cek `latest.yml` apakah patch file sudah di-include. Pastikan versi sebelumnya masih ada di server.

**Q: Update gagal?**
A: User bisa download full installer sebagai fallback. electron-updater akan otomatis fallback ke full installer jika patch gagal.

