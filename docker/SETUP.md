# Docker Setup - Fresh Installation

## 📦 What's Included

```
docker/
├── docker-compose-migration.yml  - Services config
├── init-db.sql                   - Database schema (empty)
├── server.js                     - Node.js server (with WSS support)
├── Dockerfile                    - Docker image
├── package.json                  - Dependencies
├── start-services.bat            - Start all services
├── setup-auto-start.bat          - Setup auto-start on PC restart
└── README_PC_UTAMA.md            - Instructions
```

---

## 🚀 Quick Start (Windows PC Utama)

### Step 1: Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Install & restart PC

### Step 2: Double-click `start-services.bat`
- Starts PostgreSQL, MinIO, pgAdmin, Node.js
- Wait 2-3 minutes
- Done!

### Step 3 (Optional): Setup Auto-Start
- Right-click `setup-auto-start.bat`
- Select "Run as administrator"
- Services will auto-start on PC restart

---

## 🔑 Services & Credentials

| Service | Port | User | Password |
|---------|------|------|----------|
| PostgreSQL | 5432 | trimalaksana | trimalaksana123 |
| MinIO API | 9000 | minioadmin | minioadmin123 |
| MinIO Console | 9001 | minioadmin | minioadmin123 |
| pgAdmin | 5050 | admin@trimalaksana.local | admin123 |
| Node.js | 8888 | - | - |

---

## 🌐 WebSocket (WSS) Support

Server supports WebSocket connections for real-time sync:
- **HTTP**: `http://localhost:8888`
- **WebSocket**: `ws://localhost:8888/ws`
- **WSS (Secure)**: `wss://server-tljp.tail75a421.ts.net/ws` (Tailscale Funnel)

---

## 💻 Laptop Dev Setup (Linux)

### Step 1: Get PC Utama IP
```bash
# From PC Utama
ipconfig
# Look for IPv4 Address, e.g., 192.168.1.100
```

### Step 2: Update API Endpoint
```typescript
// src/services/api-client.ts
const API_BASE_URL = 'http://192.168.1.100:8888';
```

### Step 3: Start Frontend
```bash
npm run dev
```

---

## ✅ Verification

### PC Utama
```powershell
# Check services
docker-compose -f docker-compose-migration.yml ps

# Test API
curl http://localhost:8888/health

# Test WebSocket
# Open browser DevTools → Console
# ws = new WebSocket('ws://localhost:8888/ws')
```

### Laptop Dev
```bash
# Test connection
curl http://192.168.1.100:8888/health

# Open browser
http://localhost:5173
```

---

## 🛑 Stop Services

```powershell
docker-compose -f docker-compose-migration.yml down
```

---

## 📊 Architecture

```
Laptop Dev (Linux)
    ↓ HTTP/WebSocket
PC Utama (Windows)
    ├─→ PostgreSQL (5432)
    ├─→ MinIO (9000/9001)
    └─→ Node.js (8888)
```

---

## 🎯 Fresh Setup

- Database: Empty (ready for data)
- Storage: Empty (ready for files)
- Server: Ready to receive requests
- WebSocket: Ready for real-time sync

---

**Status**: ✅ Ready to use! 🚀

