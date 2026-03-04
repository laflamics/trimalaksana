# ✅ Ready to Send to PC Utama

## 📦 What to Copy

Copy **only** the `docker` folder to PC Utama:

```
docker/
├── docker-compose-migration.yml
├── init-db.sql
├── server.js
├── Dockerfile
├── package.json
├── start-services.bat          ← Double-click this!
├── README_PC_UTAMA.md
├── nginx-ws.conf
├── monitor-services.ps1
├── diagnose-server.ps1
└── data/                       (will be created)
```

---

## 🚀 PC Utama - 2 Steps

### Step 1: Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Install & restart PC

### Step 2: Double-click `start-services.bat`
- Starts PostgreSQL, MinIO, pgAdmin, Node.js
- Wait 2-3 minutes
- Done!

---

## 💻 Laptop Dev - 2 Steps

### Step 1: Update API Endpoint
```typescript
// src/services/api-client.ts
const API_BASE_URL = 'http://192.168.1.100:8888';
// Replace 192.168.1.100 with PC Utama IP
```

### Step 2: Start Frontend
```bash
npm run dev
```

---

## 🔑 Credentials

| Service | Port | User | Password |
|---------|------|------|----------|
| PostgreSQL | 5432 | trimalaksana | trimalaksana123 |
| MinIO | 9000 | minioadmin | minioadmin123 |
| pgAdmin | 5050 | admin@trimalaksana.local | admin123 |

---

## ✅ Verification

### PC Utama
```powershell
# Check services
docker-compose -f docker-compose-migration.yml ps

# Test API
curl http://localhost:8888/health
```

### Laptop Dev
```bash
# Test connection
curl http://192.168.1.100:8888/health

# Open browser
http://localhost:5173
```

---

## 📊 Architecture

```
Laptop Dev (Linux)
    ↓ HTTP (Port 8888)
PC Utama (Windows)
    ├─→ PostgreSQL (5432) - Empty database
    ├─→ MinIO (9000/9001) - Empty storage
    └─→ Node.js (8888) - API server
```

---

## 🎯 Fresh Setup

- Database: Empty (ready for data)
- Storage: Empty (ready for files)
- Server: Ready to receive requests
- No migration needed!

---

## 📝 Files Included

| File | Purpose |
|------|---------|
| `docker-compose-migration.yml` | Services config |
| `init-db.sql` | Database schema |
| `server.js` | Node.js server |
| `Dockerfile` | Docker image |
| `package.json` | Dependencies |
| `start-services.bat` | Start script |
| `README_PC_UTAMA.md` | Instructions |

---

## 🎉 That's It!

**PC Utama**: Copy folder → Double-click script → Done!
**Laptop Dev**: Update endpoint → `npm run dev` → Done!

---

**Status**: ✅ Ready to send! 🚀

