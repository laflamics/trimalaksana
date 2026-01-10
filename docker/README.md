# Docker Storage Server

Server storage untuk Packaging ERP yang berjalan di Docker.

> **📖 Panduan lengkap setup PC utama dari A sampai Z: [SETUP_PC_UTAMA.md](./SETUP_PC_UTAMA.md)**

## Quick Start

```bash
# Masuk ke folder docker
cd docker

# Build dan run dengan docker-compose
docker-compose up -d

# Atau build manual
docker build -t packaging-erp-server .
docker run -d -p 3001:3001 -v "$(pwd)/data:/app/data" --name packaging-server --restart unless-stopped packaging-erp-server
```

## Koneksi ke Server

### Opsi 1: Local Network (WiFi sama)
- Server URL: `http://192.168.x.x:3001` (ganti dengan IP lokal PC server)
- **Keuntungan**: Cepat, tidak perlu internet
- **Kekurangan**: Harus dalam WiFi yang sama

### Opsi 2: Tailscale (RECOMMENDED - Tidak perlu domain!)
- Install Tailscale di server (PC utama)
- Dapat IP Tailscale (contoh: `100.64.1.2`)
- Server URL: `http://100.64.1.2:3001`
- **Keuntungan**: 
  - ✅ Gratis (hingga 100 devices)
  - ✅ Tidak perlu domain
  - ✅ Tidak perlu port forwarding
  - ✅ Bekerja di WiFi berbeda, beda negara
  - ✅ End-to-end encryption
- **Setup lengkap**: Lihat [TAILSCALE_SETUP.md](./TAILSCALE_SETUP.md)

### Opsi 3: Domain Publik
- Server URL: `http://yourdomain.com:3001` atau `https://yourdomain.com:3001`
- **Keuntungan**: Mudah diingat
- **Kekurangan**: Perlu bayar domain, setup DNS, port forwarding

## API Endpoints

- `GET /health` - Health check
- `GET /api/storage/:key` - Get storage value
- `POST /api/storage/:key` - Set storage value
- `DELETE /api/storage/:key` - Delete storage value
- `POST /api/storage/sync` - Sync all data
- `GET /api/storage/all` - Get all storage

## Data Persistence

Data disimpan di `./data` directory yang di-mount sebagai volume. Data tetap aman meskipun container di-restart atau di-rebuild.

