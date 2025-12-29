# Build Aplikasi dengan Data Bundle

## Cara Build Aplikasi dengan Data LocalStorage

Data dari `data/` (termasuk `data/localStorage/`) akan otomatis di-bundle ke dalam aplikasi saat build.

### Command Build:

```bash
npm run build:app
```

Command ini akan:
1. ✅ Build aplikasi (main + renderer)
2. ✅ Bundle aplikasi dengan Electron Builder (termasuk semua data JSON)

### Lokasi Data di Bundle:

- **Development**: `data/` dan `data/localStorage/` (project root)
- **Production**: `resources/data/` dan `resources/data/localStorage/` (di dalam bundle app)

### Catatan:

- ✅ Semua file JSON dari folder `data/` akan otomatis di-bundle
- ✅ Termasuk data master: customers, suppliers, products, inventory, accounts, dll
- ✅ Termasuk data localStorage: semua file JSON dari `data/localStorage/` dan subfolder-nya
- ✅ Data akan tersedia saat aplikasi pertama kali diinstall
- ✅ User bisa tetap menambah/edit data setelah install
- ✅ Rekomendasi: jalankan `npm run seed` dulu untuk regenerate data dari Excel sebelum build

### Struktur Data yang di-Bundle:

Semua file JSON dari:
- `data/*.json` (data master di root)
- `data/localStorage/*.json` (data aplikasi)
- `data/localStorage/general-trading/*.json` (data General Trading)
- `data/localStorage/tracking/*.json` (jika ada, untuk Tracking module)

### Testing Build:

Setelah build, cek di folder `release/` untuk installer aplikasi.
Data akan tersedia di `resources/data/` setelah aplikasi diinstall.

