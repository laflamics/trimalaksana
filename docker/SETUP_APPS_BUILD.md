# Setup Apps Build - Panduan Lengkap

Panduan setup setelah build aplikasi menjadi .exe dan diinstall di PC utama.

## 📋 Daftar Isi
1. [Persiapan](#1-persiapan)
2. [Install Docker](#2-install-docker)
3. [Install Tailscale](#3-install-tailscale)
4. [Setup Docker Server](#4-setup-docker-server)
5. [Konfigurasi di Apps](#5-konfigurasi-di-apps)
6. [Testing & Verifikasi](#6-testing--verifikasi)

---

## 1. Persiapan

### Yang Perlu Disiapkan
- ✅ Apps sudah di-build (file .exe)
- ✅ Apps sudah diinstall di PC utama
- ✅ Akun Tailscale (gratis) - daftar di https://tailscale.com
- ✅ Folder `docker/` sudah ter-bundle di aplikasi (ada di `resources/docker/` setelah install)

---

## 2. Install Docker

### Windows

#### Step 1: Download Docker Desktop
1. Buka browser, kunjungi: https://www.docker.com/products/docker-desktop/
2. Klik "Download for Windows"
3. Install file `Docker Desktop Installer.exe`

#### Step 2: Install & Start Docker
1. Double-click installer
2. Centang "Use WSL 2" (jika muncul)
3. Klik "Ok" dan tunggu install
4. Restart PC jika diminta
5. Buka "Docker Desktop" dari Start Menu
6. Tunggu sampai icon di system tray jadi hijau (Docker running)

#### Step 3: Verify Docker
1. Buka **PowerShell** atau **Command Prompt**
2. Ketik: `docker --version`
3. Harus muncul versi Docker
4. Ketik: `docker ps`
5. Harus muncul list container (kosong jika belum ada)

✅ **Docker sudah siap!**

---

## 3. Install Tailscale

### Windows

#### Step 1: Download & Install
1. Buka: https://tailscale.com/download
2. Download "Windows"
3. Install file `Tailscale-Setup.exe`
4. Tailscale akan otomatis terbuka

#### Step 2: Login
1. Klik "Log in"
2. Pilih "Sign in with Google" atau buat akun baru
3. Login dengan akun kamu

#### Step 3: Catat IP Tailscale
1. Di jendela Tailscale, lihat "Your IP address"
2. **CATAT IP-nya!** (contoh: `100.64.1.2`)
3. Atau buka PowerShell, ketik: `tailscale ip`

✅ **Tailscale sudah terhubung!**

---

## 4. Setup Docker Server

### Step 1: Buka Terminal
- Buka **PowerShell** atau **Command Prompt**
- Atau buka **Terminal** di VS Code

### Step 2: Masuk ke Folder Docker

**Lokasi folder docker setelah install aplikasi:**

Folder `docker/` sudah ter-bundle di aplikasi dan ada di:
- **Default:** `C:\Users\<Username>\AppData\Local\Programs\PT.Trima Laksana Jaya Pratama\resources\docker\`
- Atau: `C:\Program Files\PT.Trima Laksana Jaya Pratama\resources\docker\` (jika install di Program Files)

**Cara cepat menemukan folder docker:**
1. Buka File Explorer
2. Cari folder aplikasi di lokasi install
3. Masuk ke folder `resources\docker\`

**Atau pakai PowerShell untuk cari lokasi:**
```powershell
# Cari lokasi install aplikasi
$appName = "PT.Trima Laksana Jaya Pratama"
$appPath = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" | Where-Object { $_.DisplayName -like "*$appName*" }).InstallLocation

# Masuk ke folder docker
cd "$appPath\resources\docker"
```

**Opsi 1: Copy folder docker ke lokasi yang mudah diakses (RECOMMENDED)**

Lebih mudah jika copy folder docker ke lokasi yang mudah diakses, misalnya `C:\docker-server`:

```powershell
# Copy folder docker dari resources ke C:\docker-server
$appPath = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" | Where-Object { $_.DisplayName -like "*Trima Laksana*" }).InstallLocation
$dockerPath = "$appPath\resources\docker"

# Copy ke lokasi baru
xcopy "$dockerPath" "C:\docker-server" /E /I /Y
cd C:\docker-server
```

**Opsi 2: Langsung pakai folder docker dari resources**

Jika tidak mau copy, bisa langsung pakai:
```powershell
$appPath = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" | Where-Object { $_.DisplayName -like "*Trima Laksana*" }).InstallLocation
cd "$appPath\resources\docker"
```

**Opsi 3: Buat folder docker baru di lokasi lain**

Boleh juga buat folder docker baru di lokasi yang kamu suka, misalnya:
- `C:\docker-server\`
- `D:\docker\`
- `C:\Program Files\Docker Server\`

Tapi pastikan copy semua file dari folder docker yang ter-bundle:
- `Dockerfile`
- `docker-compose.yml`
- `package.json`
- `server.js`
- `README.md`
- File dokumentasi lainnya

### Step 3: Build Docker Image
```powershell
docker build -t packaging-erp-server .
```

**Tunggu sampai selesai** (bisa beberapa menit pertama kali)

### Step 4: Jalankan Docker Container
```powershell
# RECOMMENDED: Pakai docker-compose
docker-compose up -d

# Atau manual (bind ke semua interface):
docker run -d -p 0.0.0.0:3001:3001 -v "${PWD}/data:/app/data" --name packaging-server --restart unless-stopped packaging-erp-server
```

**Penjelasan:**
- `-d` = jalan di background
- `-p 3001:3001` = expose port 3001
- `-v` = mount folder data (data tetap aman)
- `--restart unless-stopped` = auto restart

### Step 5: Cek Container Running
```powershell
docker ps
```

**Harus muncul:**
```
CONTAINER ID   IMAGE                  STATUS         PORTS                    NAMES
abc123def456   packaging-erp-server   Up 2 minutes   0.0.0.0:3001->3001/tcp   packaging-server
```

### Step 6: Test Server
```powershell
# Test health check dari localhost
curl http://localhost:3001/health
```

**Harus return:** `{"status":"ok"}`

### Step 7: Setup Firewall (PENTING untuk akses dari laptop lain)

**Windows Firewall perlu allow port 3001:**

```powershell
# Allow port 3001 di Windows Firewall
New-NetFirewallRule -DisplayName "Docker Storage Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Atau pakai GUI:**
1. Buka **Windows Defender Firewall** (cari di Start Menu)
2. Klik **Advanced settings**
3. Klik **Inbound Rules** → **New Rule**
4. Pilih **Port** → Next
5. Pilih **TCP**, masukkan **3001** → Next
6. Pilih **Allow the connection** → Next
7. Centang semua (Domain, Private, Public) → Next
8. Nama: "Docker Storage Server" → Finish

### Step 8: Test dari Laptop Lain

**Dari laptop lain (yang sudah install Tailscale):**
```powershell
# Test dengan IP Tailscale (ganti dengan IP server yang benar)
curl http://100.81.50.37:3001/health
```

**Harus return:** `{"status":"ok"}`

**⚠️ Jika curl timeout atau error:**
1. Pastikan IP Tailscale benar (cek di PC utama dengan `tailscale ip`)
2. Pastikan kedua device sudah login ke akun Tailscale yang sama
3. Test ping dulu: `ping 100.81.50.37` (harus berhasil)
4. Jika ping berhasil tapi curl gagal → masalah di Docker/firewall
5. Jika ping gagal → masalah di Tailscale connection

**Jika masih tidak connect (timeout), cek step by step:**

**Step 1: Test dari browser di laptop lain**
Buka browser, ketik: `http://100.81.50.37:3001/health`
- ✅ Jika muncul `{"status":"ok"}` → Server OK, masalah di aplikasi
- ❌ Jika timeout/error → Masalah di server/firewall/network

**Step 2: Cek Docker di PC utama**
```powershell
# Cek container running
docker ps

# Cek port listening (harus muncul 0.0.0.0:3001, bukan 127.0.0.1:3001)
netstat -an | findstr 3001
```

**Step 3: Cek Firewall di PC utama (PENTING!)**
```powershell
# Cek firewall rules untuk port 3001
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*3001*" -or $_.DisplayName -like "*Docker*" } | Format-Table DisplayName, Enabled, Direction

# Jika belum ada, buat rule untuk allow port 3001:
New-NetFirewallRule -DisplayName "Docker Storage Server Port 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Atau allow semua dari Tailscale network (100.x.x.x) - RECOMMENDED:
New-NetFirewallRule -DisplayName "Tailscale Network Inbound" -Direction Inbound -RemoteAddress 100.0.0.0/8 -Protocol TCP -Action Allow

# Cek apakah rule sudah aktif
Get-NetFirewallRule -DisplayName "*Tailscale*" | Format-Table DisplayName, Enabled, Direction
```

**Step 4: Cek Tailscale Connection (PENTING!)**

**Di PC Utama (Server):**
```powershell
# Cek Tailscale status
tailscale status

# Cek IP Tailscale server
tailscale ip

# Harus muncul IP seperti: 100.81.50.37 (catat IP ini!)
```

**Di Laptop Lain (Client):**
```powershell
# Cek apakah Tailscale sudah install dan login
tailscale status

# Jika belum install, install dulu:
# 1. Download dari https://tailscale.com/download
# 2. Install dan login dengan akun Tailscale yang SAMA dengan server

# Setelah login, cek IP Tailscale client
tailscale ip

# Test ping ke server (ganti dengan IP server yang benar)
ping 100.81.50.37
```

**⚠️ Jika ping gagal dengan "TTL expired" atau timeout:**

**PENTING:** Ping bisa di-block oleh firewall, tapi HTTP mungkin masih bisa! **Test HTTP dulu, bukan ping!**

1. **Test HTTP dari browser (PENTING!):**
   - Buka browser di laptop lain
   - Ketik: `http://100.81.50.37:3001/health`
   - ✅ Jika muncul `{"status":"ok"}` → **Server OK, firewall hanya block ping!**
   - ❌ Jika timeout → Lanjut ke step 2-5

2. **Pastikan kedua device sudah login ke akun Tailscale yang SAMA**
   - Buka Tailscale app di kedua device
   - Pastikan email/akun yang login sama

3. **Cek Tailscale admin panel:**
   - Buka: https://login.tailscale.com/admin/machines
   - Pastikan kedua device muncul dan status "Online"
   - Catat IP Tailscale yang benar untuk server

4. **Cek Firewall Windows di PC Utama (Server):**
   ```powershell
   # Cek apakah port 3001 sudah di-allow
   Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*3001*" -or $_.DisplayName -like "*Docker*" }
   
   # Jika belum ada, buat rule untuk allow port 3001:
   New-NetFirewallRule -DisplayName "Docker Storage Server Port 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   
   # Atau allow semua dari Tailscale network (100.x.x.x):
   New-NetFirewallRule -DisplayName "Tailscale Network" -Direction Inbound -RemoteAddress 100.0.0.0/8 -Protocol TCP -Action Allow
   ```

5. **Restart Tailscale di server:**
   ```powershell
   # Di Windows
   # Buka Tailscale app → klik menu → Exit
   # Buka lagi Tailscale app → Login ulang
   
   # Atau via command:
   tailscale down
   tailscale up
   ```

6. **Test HTTP lagi dari browser:**
   ```powershell
   # Dari browser di laptop lain
   # Buka: http://100.81.50.37:3001/health
   # Harus muncul: {"status":"ok"}
   ```

**Step 5: Restart Docker container**
```powershell
cd C:\docker-server  # atau lokasi docker kamu
docker-compose down
docker-compose up -d

# Cek logs
docker-compose logs -f
```

✅ **Docker server sudah jalan dan bisa diakses dari laptop lain!**

---

## 5. Konfigurasi di Apps

### Step 1: Buka Apps
1. Buka aplikasi yang sudah diinstall
2. Login dengan akun kamu

### Step 2: Masuk ke Settings
1. Klik menu **Settings** (atau **⚙️ Settings**)
2. Scroll ke bagian **Storage Configuration**

### Step 3: Konfigurasi Server
1. Pilih **"Server"** (bukan "Local")
2. Masukkan:
   - **Server URL**: `100.64.1.2` (ganti dengan IP Tailscale kamu)
   - **Server Port**: `3001`
3. Klik **"Check Connection"**
4. Harus muncul **"✓ Connected"**
5. Klik **"Save Settings"**

### Step 4: Verifikasi Sync
1. Setelah save, data akan otomatis sync
2. Lihat status sync di Settings
3. Harus muncul **"Synced"** atau **"Syncing..."**

✅ **Konfigurasi selesai!**

---

## 6. Testing & Verifikasi

### Test 1: Cek Server dari Browser
1. Buka browser di PC utama
2. Ketik: `http://localhost:3001/health`
3. Harus muncul: `{"status":"ok"}`

### Test 2: Cek dari Device Lain (via Tailscale)
1. Di device lain (PC/HP), buka browser
2. Ketik: `http://100.64.1.2:3001/health` (ganti dengan IP Tailscale kamu)
3. Harus muncul: `{"status":"ok"}`

### Test 3: Test Sync Data
1. Di apps PC utama, buat data baru (misal: tambah customer)
2. Tunggu 5 detik (auto-sync interval)
3. Di device lain, buka apps dan cek data
4. Data harus muncul (sudah tersinkron)

### Test 4: Test Offline Mode
1. Matikan internet/WiFi di device
2. Data tetap bisa dibaca (dari local storage)
3. Buat perubahan data
4. Nyalakan internet lagi
5. Data akan otomatis sync ke server

✅ **Semua test berhasil!**

---

## 7. Command Penting

### Cek Status
```powershell
# Cek Docker container
docker ps

# Cek Tailscale IP
tailscale ip

# Test server
curl http://localhost:3001/health
```

### View Logs
```powershell
# View logs real-time
docker logs -f packaging-server

# View last 100 lines
docker logs --tail 100 packaging-server
```

### Restart Server
```powershell
# Restart container
docker restart packaging-server

# Atau stop dan start lagi
docker-compose restart
```

### Stop Server
```powershell
# Stop container
docker-compose down

# Atau
docker stop packaging-server
```

### Start Server
```powershell
# Start container
docker-compose up -d

# Atau
docker start packaging-server
```

---

## 8. Troubleshooting

### Problem: Docker tidak jalan
**Solusi:**
```powershell
# Cek Docker status
docker ps

# Restart Docker Desktop
# Klik kanan icon Docker di system tray → Restart
```

### Problem: Container tidak bisa start
**Solusi:**
```powershell
# Stop container lama
docker stop packaging-server
docker rm packaging-server

# Build ulang
docker build -t packaging-erp-server .

# Run lagi
docker-compose up -d
```

### Problem: Port 3001 sudah dipakai
**Solusi:**
```powershell
# Cek apa yang pakai port 3001
netstat -ano | findstr :3001

# Stop process yang pakai port 3001
# Atau ubah port di docker-compose.yml
```

### Problem: Tailscale tidak bisa konek
**Solusi:**
1. Pastikan Tailscale sudah login
2. Restart Tailscale
3. Cek IP: `tailscale ip`
4. Pastikan semua device login ke akun yang sama

### Problem: Data tidak sync
**Solusi:**
1. Cek koneksi: `curl http://100.64.1.2:3001/health`
2. Cek sync status di Settings → Storage
3. Cek browser console untuk error (F12)
4. Restart Docker: `docker restart packaging-server`

### Problem: Firewall block port 3001
**Solusi Windows:**
1. Buka "Windows Defender Firewall"
2. Klik "Advanced settings"
3. Klik "Inbound Rules" → "New Rule"
4. Pilih "Port" → Next
5. Pilih "TCP", masukkan "3001" → Next
6. Pilih "Allow the connection" → Next
7. Centang semua → Next
8. Nama: "Docker Server" → Finish

---

## 9. Checklist Setup

Gunakan checklist ini:

- [ ] Docker terinstall dan running
- [ ] Tailscale terinstall dan login
- [ ] IP Tailscale sudah dicatat
- [ ] Docker container sudah running (`docker ps`)
- [ ] Health check berhasil (`curl http://localhost:3001/health`)
- [ ] Test dari device lain berhasil
- [ ] Firewall sudah allow port 3001
- [ ] Konfigurasi di Settings sudah benar
- [ ] Connection test berhasil
- [ ] Data sudah mulai sync

---

## 10. Quick Reference

### URL Penting
- **Health Check Local**: `http://localhost:3001/health`
- **Health Check Tailscale**: `http://100.64.1.2:3001/health` (ganti dengan IP kamu)
- **Tailscale Admin**: https://login.tailscale.com/admin/machines

### Path Penting
- **Docker Data**: `D:\trimalaksana2\docker\data\` (data tersimpan di sini)
- **Docker Compose**: `D:\trimalaksana2\docker\docker-compose.yml`

### Auto-Sync
- Sync otomatis setiap **5 detik**
- Data di localStorage akan sync ke Docker
- Data di Docker akan sync ke semua device
- Conflict resolution otomatis (last-write-wins)

---

## 11. Catatan Penting

### Data Persistence
✅ **Data aman karena:**
- Setiap device punya local copy
- Server punya backup di `docker/data/`
- Sync merge, tidak overwrite
- Data tetap aman meski server mati

### Offline Mode
✅ **Bekerja offline:**
- Data tetap bisa dibaca (dari local storage)
- Perubahan disimpan lokal
- Akan sync otomatis saat online

### Multi-Device
✅ **Multi-device sync:**
- Semua device sync ke server yang sama
- Data tersinkron real-time (setiap 5 detik)
- Conflict resolution otomatis

---

**Selamat! Setup selesai! Data akan otomatis sync ke semua device! 🎉**

