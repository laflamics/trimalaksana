# Packaging ERP - Lab Management System

ERP profesional dan futuristik untuk lab packaging dengan Electron, React, dan TypeScript.

## Fitur

- ✅ Local Storage & Docker Server (user bisa pilih)
- ✅ Sync otomatis antara local storage dan server
- ✅ UI futuristik minimal dengan hover effects
- ✅ Semua module sesuai struktur menu

## Tech Stack

- **Electron** - Desktop application
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management (optional)

## Installation

```bash
# Install dependencies
npm install

# Development mode (dengan hot reload, pakai Vite dev server)
npm run dev

# Production mode (build dulu, lalu jalan sebagai desktop app standalone)
npm run prod
# atau
npm run start

# Build jadi installer/executable
npm run build:app
```

**Catatan:**
- `npm run dev` = Development mode dengan hot reload (load dari localhost:3000)
- `npm run prod` = Production mode (build dulu, lalu jalan sebagai desktop app standalone, TIDAK perlu server)
- `npm run build:app` = Build jadi installer (.exe untuk Windows, .dmg untuk Mac, dll)

## Docker Server Setup

Untuk menggunakan Docker server storage:

```bash
cd docker
docker-compose up -d
```

Server akan berjalan di `http://localhost:3001`

## Storage Configuration

1. Buka Settings di aplikasi
2. Pilih storage type: Local Storage atau Docker Server
3. Jika pilih Docker Server, masukkan URL dan port
4. Klik "Check Connection" untuk test koneksi
5. Save settings

## Project Structure

```
├── electron/          # Electron main process
├── src/
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── services/      # Storage & API services
│   └── styles/        # CSS files
├── docker/            # Docker server files
└── dist/              # Build output
```

## Modules

### 1. MASTER
- Products
- Materials
- Customers
- Suppliers

### 2. PACKAGING
- Workflow
- Sales Orders
- PPIC
- Purchasing
- Production
- QA/QC
- Delivery Note

### 3. FINANCE
- Finance
- Accounting
- AR
- COA

### 4. HR
- HRD (Dashboard, Attendance, Staff, Settings)

### 5. SETTINGS
- Company Settings
- Report
- DB Activity

## License

MIT

