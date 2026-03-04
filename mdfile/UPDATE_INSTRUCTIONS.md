# Cara Upload Update ke Server

## ✨ Otomatis Upload (Recommended)

**File akan otomatis di-upload ke server setelah build!**

Setelah menjalankan `npm run build:app`, script akan:
1. ✅ Generate `latest.yml`
2. ✅ **Otomatis copy/upload file ke `docker/data/`** (folder yang sama dengan storage lainnya)
3. ✅ Server langsung serve file dari path tersebut

**Tidak perlu manual copy lagi!** 🎉

### ⚠️ Penting: Build di Mesin Berbeda dengan Server

**Jika build di Arch Linux tapi server di PC utama (Windows):**

File hanya akan di-copy lokal di Arch Linux, **TIDAK akan masuk ke PC utama!**

**Solusi:** Set environment variable untuk SCP upload:

```bash
# Quick setup (gunakan helper script)
source scripts/setup-remote-upload.sh

# Atau manual:
export UPDATE_SERVER_METHOD=scp
export UPDATE_SERVER_HOST=server-tljp.tail75a421.ts.net
export UPDATE_SERVER_USER=zelwar  # Ganti dengan username di PC utama
export UPDATE_SERVER_PATH=/run/media/zelwar/Data2/Trimalaksana/trimalaksana2/docker/data

# Lalu build
npm run build:app
```

**Untuk permanent, tambahkan ke `~/.bashrc`:**
```bash
echo 'export UPDATE_SERVER_METHOD=scp' >> ~/.bashrc
echo 'export UPDATE_SERVER_HOST=server-tljp.tail75a421.ts.net' >> ~/.bashrc
echo 'export UPDATE_SERVER_USER=zelwar' >> ~/.bashrc
echo 'export UPDATE_SERVER_PATH=/run/media/zelwar/Data2/Trimalaksana/trimalaksana2/docker/data' >> ~/.bashrc
source ~/.bashrc
```

## File yang Perlu Di-upload

Setelah build aplikasi dengan `npm run build:app`, file berikut akan ada di folder `release-build/`:

1. **latest.yml** - File info versi (wajib)
2. **PT.Trima Laksana Jaya Pratama Setup X.X.X.exe** - Installer utama (wajib)
3. **PT.Trima Laksana Jaya Pratama Setup X.X.X.exe.patch** - Patch file untuk incremental update (opsional, auto-generated)

## Upload Manual (Jika Perlu)

Jika otomatis upload tidak bekerja atau server di remote:

1. **Local Copy** (default - kalau build di PC yang sama dengan server):
   - File otomatis di-copy ke `docker/data/` (folder yang sama dengan storage lainnya)
   - Bisa dilihat langsung di folder data seperti file storage lainnya
   - Tidak perlu action tambahan

2. **Remote Upload via SCP** (jika server di PC lain - **WAJIB untuk build di Arch Linux**):
   ```bash
   # Set environment variables sebelum build
   export UPDATE_SERVER_METHOD=scp
   export UPDATE_SERVER_HOST=server-tljp.tail75a421.ts.net
   export UPDATE_SERVER_USER=zelwar  # Ganti dengan username di PC utama
   export UPDATE_SERVER_PATH=/run/media/zelwar/Data2/Trimalaksana/trimalaksana2/docker/data
   
   # Build dan upload otomatis
   npm run build:app
   ```
   
   **Atau bisa juga set di `~/.bashrc` untuk permanent:**
   ```bash
   echo 'export UPDATE_SERVER_METHOD=scp' >> ~/.bashrc
   echo 'export UPDATE_SERVER_HOST=server-tljp.tail75a421.ts.net' >> ~/.bashrc
   echo 'export UPDATE_SERVER_USER=zelwar' >> ~/.bashrc
   echo 'export UPDATE_SERVER_PATH=/run/media/zelwar/Data2/Trimalaksana/trimalaksana2/docker/data' >> ~/.bashrc
   source ~/.bashrc
   ```
   
   **Note:** Script akan auto-detect dari `storage_config.json` kalau server URL pakai Tailscale, tapi lebih baik set manual untuk pastikan.

3. **Manual Copy** (jika otomatis tidak jalan):
   ```bash
   # Dari folder project root
   copy release-build\latest.yml docker\data\
   copy "release-build\PT.Trima Laksana Jaya Pratama Setup *.exe" docker\data\
   copy "release-build\PT.Trima Laksana Jaya Pratama Setup *.exe.patch" docker\data\
   ```

4. **Restart Docker server** (jika perlu):
   ```bash
   cd docker
   docker-compose restart
   ```

## Struktur Folder di Server

```
docker/
  data/
    latest.yml                    # Version info (bisa dilihat seperti file storage lainnya)
    PT.Trima Laksana Setup 1.0.6.exe          # Full installer
    PT.Trima Laksana Setup 1.0.6.exe.patch    # Patch file (incremental)
    accounts.json                 # File storage lainnya
    customers.json
    ...
```

**File update disimpan di `docker/data/` folder seperti file storage lainnya, jadi lebih praktis dan bisa dilihat langsung!** 📁

## Cara Kerja Update

1. **User klik "Check for Updates"** di Settings
2. **App check** `/api/updates/latest.yml` dari server
3. **Jika ada versi baru**, app download:
   - **Patch file** (jika ada) - hanya untuk user yang update dari versi sebelumnya
   - **Full installer** (jika tidak ada patch atau user baru)
4. **App install update** dan restart

## Catatan Penting

- **Incremental Update**: electron-updater otomatis pakai patch file jika tersedia
- **File otomatis di-copy** ke `docker/data/` setelah build (tidak perlu manual)
- **Server serve file** dari `/api/updates/` path (file ada di `docker/data/`)
- **latest.yml** harus ada, kalau tidak user akan dapat error "No updates available"
- **File update bisa dilihat** di `docker/data/` folder seperti file storage lainnya (accounts.json, customers.json, dll)
