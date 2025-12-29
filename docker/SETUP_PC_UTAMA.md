# Setup PC Utama - Panduan Lengkap dari A sampai Z

Panduan lengkap untuk setup Docker server di PC utama agar bisa diakses dari semua device.

## 📋 Daftar Isi
1. [Persiapan](#1-persiapan)
2. [Install Docker](#2-install-docker)
3. [Install Tailscale](#3-install-tailscale)
4. [Setup Docker Server](#4-setup-docker-server)
5. [Konfigurasi & Testing](#5-konfigurasi--testing)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Persiapan

### Sistem Requirements
- ✅ Windows 10/11 atau Linux
- ✅ Koneksi internet
- ✅ Minimal 2GB RAM tersedia
- ✅ Minimal 5GB storage kosong

### Yang Perlu Disiapkan
- [ ] Akun Tailscale (gratis) - daftar di https://tailscale.com
- [ ] File project sudah ada di PC utama

---

## 2. Install Docker

### Windows

#### Step 1: Download Docker Desktop
1. Buka browser, kunjungi: https://www.docker.com/products/docker-desktop/
2. Klik "Download for Windows"
3. File installer akan terdownload (Docker Desktop Installer.exe)

#### Step 2: Install Docker Desktop
1. Double-click file `Docker Desktop Installer.exe`
2. Centang "Use WSL 2 instead of Hyper-V" (jika muncul)
3. Klik "Ok" dan tunggu proses install
4. Setelah selesai, klik "Close and restart"

#### Step 3: Start Docker Desktop
1. Setelah restart, cari "Docker Desktop" di Start Menu
2. Klik untuk membuka Docker Desktop
3. Tunggu sampai Docker selesai starting (icon di system tray jadi hijau)
4. Jika muncul popup "WSL 2 installation is incomplete", ikuti instruksi untuk install WSL 2

#### Step 4: Verify Docker
1. Buka Command Prompt atau PowerShell
2. Ketik: `docker --version`
3. Harus muncul versi Docker (contoh: `Docker version 24.0.0`)
4. Ketik: `docker ps`
5. Harus muncul list container (kosong jika belum ada container)

✅ **Docker sudah terinstall!**

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (supaya tidak perlu sudo)
sudo usermod -aG docker $USER

# Logout dan login lagi, atau ketik:
newgrp docker

# Verify
docker --version
docker ps
```

✅ **Docker sudah terinstall!**

---

## 3. Install Tailscale

### Windows

#### Step 1: Download Tailscale
1. Buka browser, kunjungi: https://tailscale.com/download
2. Klik "Download for Windows"
3. File installer akan terdownload (Tailscale-Setup.exe)

#### Step 2: Install Tailscale
1. Double-click file `Tailscale-Setup.exe`
2. Klik "Install" dan tunggu proses install
3. Setelah selesai, Tailscale akan otomatis terbuka

#### Step 3: Login Tailscale
1. Di jendela Tailscale, klik "Log in"
2. Pilih "Sign in with Google" atau "Sign in with Microsoft" (atau buat akun baru)
3. Login dengan akun kamu
4. Setelah login, Tailscale akan terhubung

#### Step 4: Catat IP Tailscale
1. Di jendela Tailscale, lihat "Your IP address"
2. Catat IP-nya (contoh: `100.64.1.2`)
3. Atau buka Command Prompt, ketik: `tailscale ip`
4. IP yang muncul adalah IP Tailscale server kamu

✅ **Tailscale sudah terinstall dan terhubung!**

### Linux

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
sudo tailscale up

# Login (akan muncul link, buka di browser dan login)
# Setelah login, kembali ke terminal

# Cek IP Tailscale
tailscale ip
```

✅ **Tailscale sudah terinstall dan terhubung!**

---

## 4. Setup Docker Server

### Step 1: Buka Terminal/Command Prompt
- **Windows**: Buka PowerShell atau Command Prompt
- **Linux**: Buka Terminal

### Step 2: Masuk ke Folder Docker
```bash
# Masuk ke folder project
cd D:\trimalaksana2\docker

# Atau jika di Linux:
cd /path/to/trimalaksana2/docker
```

### Step 3: Build Docker Image
```bash
# Build image Docker
docker build -t packaging-erp-server .
```

**Tunggu sampai selesai** (bisa beberapa menit pertama kali)

### Step 4: Jalankan Docker Container
```bash
# Jalankan dengan docker-compose (RECOMMENDED)
docker-compose up -d

# Atau jalankan manual:
docker run -d -p 3001:3001 -v "$(pwd)/data:/app/data" --name packaging-server --restart unless-stopped packaging-erp-server
```

**Penjelasan:**
- `-d` = run di background (detached mode)
- `-p 3001:3001` = expose port 3001
- `-v` = mount folder data untuk persistence
- `--restart unless-stopped` = auto restart jika container crash

### Step 5: Verify Container Running
```bash
# Cek container status
docker ps

# Harus muncul container "packaging-server" atau "storage-server" dengan status "Up"
```

### Step 6: Test Server
```bash
# Test health check
curl http://localhost:3001/health

# Harus return: {"status":"ok"}
```

✅ **Docker server sudah jalan!**

---

## 5. Konfigurasi & Testing

### Step 1: Cek IP Tailscale Server
```bash
# Windows (PowerShell)
tailscale ip

# Linux
tailscale ip

# Atau lihat di Tailscale admin panel: https://login.tailscale.com/admin/machines
```

**Catat IP-nya!** (contoh: `100.64.1.2`)

### Step 2: Test dari Browser
1. Buka browser di PC utama
2. Ketik: `http://localhost:3001/health`
3. Harus muncul: `{"status":"ok"}`

### Step 3: Test dari Device Lain (via Tailscale)
1. Di device lain (PC/HP), pastikan bisa akses internet
2. Buka browser, ketik: `http://100.64.1.2:3001/health` (ganti dengan IP Tailscale server kamu)
3. Harus muncul: `{"status":"ok"}`

**Jika tidak bisa:**
- Pastikan Tailscale sudah running di server
- Pastikan Docker container sudah running
- Cek firewall Windows/Linux (port 3001 harus allow)

### Step 4: Konfigurasi di Software (Device Lain)
1. Buka aplikasi di device lain
2. Masuk ke **Settings → Storage**
3. Pilih **"Server"**
4. Masukkan:
   - **Server URL**: `100.64.1.2` (ganti dengan IP Tailscale server kamu)
   - **Server Port**: `3001`
5. Klik **"Check Connection"**
6. Harus muncul **"✓ Connected"**
7. Klik **"Save Settings"**

✅ **Setup selesai! Data akan otomatis sync setiap 5 detik.**

---

## 6. Troubleshooting

### Problem: Docker tidak jalan
**Solusi:**
```bash
# Cek Docker status
docker ps

# Restart Docker Desktop (Windows) atau:
sudo systemctl restart docker  # Linux

# Cek logs
docker logs packaging-server
```

### Problem: Container tidak bisa start
**Solusi:**
```bash
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
```bash
# Cek apa yang pakai port 3001
# Windows:
netstat -ano | findstr :3001

# Linux:
sudo lsof -i :3001

# Stop process yang pakai port 3001, atau ubah port di docker-compose.yml
```

### Problem: Tailscale tidak bisa konek
**Solusi:**
1. Pastikan Tailscale sudah login: `tailscale status`
2. Restart Tailscale: `tailscale down` lalu `tailscale up`
3. Cek IP Tailscale: `tailscale ip`
4. Pastikan semua device login ke akun Tailscale yang sama

### Problem: Firewall block port 3001
**Windows:**
1. Buka "Windows Defender Firewall"
2. Klik "Advanced settings"
3. Klik "Inbound Rules" → "New Rule"
4. Pilih "Port" → Next
5. Pilih "TCP", masukkan port "3001" → Next
6. Pilih "Allow the connection" → Next
7. Centang semua (Domain, Private, Public) → Next
8. Nama: "Docker Server" → Finish

**Linux:**
```bash
# Ubuntu/Debian
sudo ufw allow 3001/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### Problem: Data tidak sync
**Solusi:**
1. Cek koneksi: `curl http://100.64.1.2:3001/health`
2. Cek sync status di Settings → Storage
3. Cek browser console untuk error
4. Restart Docker container: `docker restart packaging-server`

---

## 7. Maintenance

### Backup Data
```bash
# Backup folder data
# Windows:
xcopy /E /I docker\data backup\data_$(date +%Y%m%d)

# Linux:
cp -r docker/data backup/data_$(date +%Y%m%d)
```

### Update Docker Image
```bash
# Stop container
docker-compose down

# Build ulang
docker build -t packaging-erp-server .

# Start lagi
docker-compose up -d
```

### View Logs
```bash
# View logs real-time
docker logs -f packaging-server

# View last 100 lines
docker logs --tail 100 packaging-server
```

### Restart Server
```bash
# Restart container
docker restart packaging-server

# Atau stop dan start lagi
docker-compose restart
```

---

## 8. Checklist Setup

Gunakan checklist ini untuk memastikan semua sudah benar:

- [ ] Docker terinstall dan running
- [ ] Tailscale terinstall dan login
- [ ] IP Tailscale sudah dicatat
- [ ] Docker container sudah running (`docker ps`)
- [ ] Health check berhasil (`curl http://localhost:3001/health`)
- [ ] Test dari device lain berhasil (`http://100.64.1.2:3001/health`)
- [ ] Firewall sudah allow port 3001
- [ ] Konfigurasi di Settings sudah benar
- [ ] Connection test berhasil
- [ ] Data sudah mulai sync

---

## 9. Quick Reference

### Command Penting

```bash
# Cek Docker status
docker ps

# Cek Tailscale IP
tailscale ip

# Test server
curl http://localhost:3001/health

# View logs
docker logs -f packaging-server

# Restart server
docker restart packaging-server

# Stop server
docker-compose down

# Start server
docker-compose up -d
```

### URL Penting
- **Health Check**: `http://localhost:3001/health` (local) atau `http://100.64.1.2:3001/health` (via Tailscale)
- **Tailscale Admin**: https://login.tailscale.com/admin/machines
- **Docker Docs**: https://docs.docker.com

---

## 10. Support

Jika masih ada masalah:
1. Cek logs: `docker logs packaging-server`
2. Cek Tailscale status: `tailscale status`
3. Test koneksi: `curl http://100.64.1.2:3001/health`
4. Cek firewall settings
5. Restart semua: Docker + Tailscale

**Selamat! PC utama sudah siap untuk sync data ke semua device! 🎉**

