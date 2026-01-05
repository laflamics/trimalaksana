# Setup Tailscale untuk Docker Server

> **📖 Untuk setup lengkap PC utama dari A sampai Z, lihat [SETUP_PC_UTAMA.md](./SETUP_PC_UTAMA.md)**

## Apa itu Tailscale?

Tailscale adalah VPN mesh yang memungkinkan koneksi antar device tanpa perlu:
- Domain publik
- Port forwarding
- Konfigurasi router/firewall yang rumit
- IP publik statis

Setiap device yang terhubung ke Tailscale akan mendapat IP virtual (100.x.x.x) yang bisa diakses dari device lain di jaringan Tailscale yang sama.

## Setup Tailscale

### 1. Install Tailscale di Server (PC Utama yang jalan Docker)

#### Windows:
1. Download Tailscale dari: https://tailscale.com/download
2. Install dan login dengan akun Tailscale (gratis)
3. Setelah login, catat IP Tailscale server (contoh: `100.64.1.2`)

#### Linux (jika server pakai Linux):
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 2. Konfigurasi Docker Server

Docker server sudah berjalan di port `3001`. Setelah Tailscale terpasang, server bisa diakses via:
- **IP Tailscale**: `http://100.64.1.2:3001` (ganti dengan IP Tailscale server kamu)
- **Hostname Tailscale**: `http://your-server-name:3001` (jika sudah set hostname di Tailscale)

### 3. Setup di Client Devices (PC/HP lain)

**OPSI A: Pakai IP Tailscale langsung (TIDAK perlu install Tailscale di client)**
- Client devices cukup akses via IP Tailscale server
- Contoh: `http://100.64.1.2:3001`
- **KELEMAHAN**: Hanya bisa akses server, tidak bisa device-to-device sync langsung

**OPSI B: Install Tailscale di semua device (RECOMMENDED)**
- Install Tailscale di semua device yang mau sync
- Login dengan akun Tailscale yang sama
- Setiap device dapat IP Tailscale sendiri
- Bisa akses server via IP atau hostname Tailscale
- **KELEBIHAN**: Bisa device-to-device sync, lebih aman, lebih fleksibel

### 4. Konfigurasi di Software

Di Settings → Storage, pilih "Server" dan masukkan:
- **Server URL**: `http://100.64.1.2:3001` (ganti dengan IP Tailscale server kamu)
- Atau: `http://your-server-name:3001` (jika pakai hostname)

## Keuntungan Tailscale

✅ **Gratis** untuk personal use (hingga 100 devices)
✅ **Tidak perlu domain** - pakai IP Tailscale langsung
✅ **Tidak perlu port forwarding** - Tailscale handle semua
✅ **Aman** - End-to-end encryption
✅ **Mudah setup** - Install, login, langsung bisa
✅ **Bekerja di mana saja** - WiFi berbeda, beda negara, tetap bisa konek

## Perbandingan Setup

| Metode | Domain | Port Forwarding | Setup | Biaya |
|--------|--------|-----------------|-------|-------|
| **Local IP (WiFi sama)** | ❌ Tidak perlu | ❌ Tidak perlu | ✅ Mudah | ✅ Gratis |
| **Domain Publik** | ✅ Perlu | ✅ Perlu | ⚠️ Sedang | 💰 Bayar domain |
| **Tailscale** | ❌ Tidak perlu | ❌ Tidak perlu | ✅ Mudah | ✅ Gratis |

## Troubleshooting

### Server tidak bisa diakses via Tailscale IP
1. Pastikan Tailscale sudah running di server
2. Cek IP Tailscale: `tailscale status` (Linux) atau lihat di Tailscale admin panel
3. Pastikan Docker container jalan: `docker ps`
4. Test koneksi: `curl http://100.64.1.2:3001/health` (ganti dengan IP Tailscale kamu)

### Client tidak bisa konek ke server
1. Pastikan server URL benar di Settings
2. Test dari browser: buka `http://100.64.1.2:3001/health` (harus return `{"status":"ok"}`)
3. Jika pakai OPSI A (tidak install Tailscale di client), pastikan client bisa akses internet
4. Jika pakai OPSI B (install Tailscale di client), pastikan semua device sudah login ke akun Tailscale yang sama

## Catatan Penting

⚠️ **IP Tailscale bisa berubah** jika device disconnect/reconnect Tailscale. Solusi:
- Pakai hostname Tailscale (lebih stabil)
- Atau set IP static di Tailscale admin panel (perlu Tailscale Pro)

⚠️ **Server harus selalu online** untuk sync bekerja. Jika server mati, data tetap aman di:
- Local storage setiap device
- Docker volume di server (file di `docker/data/`)

✅ **Data tetap aman** karena:
- Setiap device punya local copy
- Server punya backup di Docker volume
- Sync otomatis merge data, tidak overwrite

