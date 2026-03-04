# Installation Instructions

## 📍 Path: `D:\trimalaksanaapps\possgresql\docker`

### Folder Structure

```
D:\trimalaksanaapps\possgresql\
├── docker/                          ← Copy this folder here
│   ├── docker-compose-migration.yml
│   ├── init-db.sql
│   ├── server.js
│   ├── Dockerfile
│   ├── package.json
│   ├── start-services.bat
│   ├── setup-auto-start.bat
│   └── SETUP.md
├── data/                            ← Created automatically
│   ├── media/                       (MinIO blob storage)
│   └── postgresql/                  (PostgreSQL data)
└── updates/                         ← Created automatically
```

---

## 🚀 Installation Steps

### Step 1: Create Folder Structure
```powershell
# Create main folder
mkdir D:\trimalaksanaapps\possgresql

# Copy docker folder into it
# Result: D:\trimalaksanaapps\possgresql\docker\
```

### Step 2: Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Install & restart PC

### Step 3: Start Services
```powershell
# Open PowerShell or Command Prompt
cd D:\trimalaksanaapps\possgresql\docker

# Double-click start-services.bat
# OR run from command line:
.\start-services.bat
```

Wait 2-3 minutes for services to start.

### Step 4 (Optional): Setup Auto-Start
```powershell
# Right-click setup-auto-start.bat
# Select "Run as administrator"

# OR run from PowerShell as admin:
.\setup-auto-start.bat
```

Services will now auto-start on PC restart.

---

## ✅ Verify Installation

### Check Services
```powershell
cd D:\trimalaksanaapps\possgresql\docker

# Check all services running
docker-compose -f docker-compose-migration.yml ps

# Should show:
# postgres       - Up (healthy)
# minio          - Up (healthy)
# pgadmin        - Up
# storage-server - Up
```

### Test Services
```powershell
# Test PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT version();"

# Test Node.js API
curl http://localhost:8888/health

# Test MinIO
curl http://localhost:9000/minio/health/live
```

### Access Services
- MinIO Console: http://localhost:9001
- pgAdmin: http://localhost:5050
- Node.js API: http://localhost:8888/health

---

## 🔑 Credentials

```
PostgreSQL:
  Host: localhost
  Port: 5432
  User: trimalaksana
  Password: trimalaksana123
  Database: trimalaksana_db

MinIO:
  Endpoint: localhost:9000
  Console: http://localhost:9001
  User: minioadmin
  Password: minioadmin123

pgAdmin:
  URL: http://localhost:5050
  Email: admin@trimalaksana.local
  Password: admin123
```

---

## 🛑 Stop Services

```powershell
cd D:\trimalaksanaapps\possgresql\docker

docker-compose -f docker-compose-migration.yml down
```

---

## 🔄 Restart Services

```powershell
cd D:\trimalaksanaapps\possgresql\docker

docker-compose -f docker-compose-migration.yml restart
```

---

## 📊 Data Locations

### PostgreSQL Data
```
D:\trimalaksanaapps\possgresql\data\postgresql\
```

### MinIO Data
```
D:\trimalaksanaapps\possgresql\data\media\
├── packaging/
├── trucking/
└── general-trading/
```

### Update Files
```
D:\trimalaksanaapps\possgresql\updates\
```

---

## 🆘 Troubleshooting

### Docker not found
- Install Docker Desktop
- Restart PC
- Verify: `docker --version`

### Port already in use
- Check what's using port 8888: `netstat -ano | findstr :8888`
- Or change port in `docker-compose-migration.yml`

### Services won't start
```powershell
# Check logs
docker-compose -f docker-compose-migration.yml logs

# Restart Docker
# Or restart PC
```

### PostgreSQL connection failed
```powershell
# Check if PostgreSQL is running
docker-compose -f docker-compose-migration.yml ps postgres

# Check logs
docker-compose -f docker-compose-migration.yml logs postgres
```

---

## 📱 Connect from Laptop Dev

### Step 1: Get PC Utama IP
```powershell
ipconfig
# Look for IPv4 Address, e.g., 192.168.1.100
```

### Step 2: Update API Endpoint (Laptop Dev)
```typescript
// src/services/api-client.ts
const API_BASE_URL = 'http://192.168.1.100:8888';
```

### Step 3: Start Frontend (Laptop Dev)
```bash
npm run dev
```

---

## ✨ Fresh Setup

- Database: Empty (ready for data)
- Storage: Empty (ready for files)
- Server: Ready to receive requests
- WebSocket: Ready for real-time sync

---

**Status**: ✅ Ready to install! 🚀

