# PC Utama Setup (Windows)

## 🚀 Quick Start

### Step 1: Install Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop
2. Install & restart PC

### Step 2: Copy Folder
Copy `docker` folder to PC Utama:
```
C:\trimalaksana\docker\
```

### Step 3: Start Services
Double-click: `start-services.bat`

Wait for all services to start (2-3 minutes).

### Step 4: Migrate Data
Double-click: `migrate-data.bat`

Wait for migration to complete (1-2 minutes).

### Step 5: Verify
Open browser:
- MinIO Console: http://localhost:9001
- pgAdmin: http://localhost:5050
- Node.js API: http://localhost:8888/health

---

## 📋 What's Inside

| File | Purpose |
|------|---------|
| `docker-compose-migration.yml` | Docker services config |
| `init-db.sql` | Database schema |
| `start-services.bat` | Start all services |
| `migrate-data.bat` | Migrate JSON to PostgreSQL |
| `server.js` | Node.js server |

---

## 🔑 Credentials

| Service | Port | User | Password |
|---------|------|------|----------|
| PostgreSQL | 5432 | trimalaksana | trimalaksana123 |
| MinIO | 9000 | minioadmin | minioadmin123 |
| pgAdmin | 5050 | admin@trimalaksana.local | admin123 |
| Node.js | 8888 | - | - |

---

## 📊 Services

After startup, you'll have:

```
PostgreSQL (5432)
    ↓
Node.js Server (8888)
    ├─→ MinIO (9000/9001)
    └─→ pgAdmin (5050)
```

---

## 🛑 Stop Services

Open PowerShell in `docker` folder:
```powershell
docker-compose -f docker-compose-migration.yml down
```

---

## 🔧 Troubleshooting

### Docker not found
- Install Docker Desktop
- Restart PC

### Port already in use
- Check what's using the port
- Or change port in `docker-compose-migration.yml`

### PostgreSQL won't start
```powershell
docker-compose -f docker-compose-migration.yml logs postgres
```

### Migration fails
```powershell
# Check PostgreSQL is running
docker-compose -f docker-compose-migration.yml ps

# Test connection
psql -h localhost -U trimalaksana -d trimalaksana_db
```

---

## 📱 Connect from Laptop Dev

1. Get PC Utama IP: `ipconfig` (look for IPv4 Address)
2. On Laptop Dev, update API endpoint:
   ```typescript
   // src/services/api-client.ts
   const API_BASE_URL = 'http://192.168.1.100:8888';
   ```
3. Start frontend: `npm run dev`

---

## ✅ Verification

### Check Services
```powershell
docker-compose -f docker-compose-migration.yml ps
```

### Test PostgreSQL
```powershell
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT COUNT(*) FROM packaging_products;"
```

### Test Node.js
```powershell
curl http://localhost:8888/health
```

---

## 📈 Next Steps

1. ✅ Start services
2. ✅ Migrate data
3. ✅ Verify services
4. ✅ Connect from Laptop Dev
5. ✅ Test frontend

---

**Status**: Ready to setup! 🚀

