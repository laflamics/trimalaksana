# ✅ Setup Final - All Ready

## 🎯 Situasi

**PC Utama (Windows)**: Copy folder `docker` → Double-click `start-services.bat` → Done!
**Laptop Dev (Linux)**: Update API endpoint → `npm run dev` → Done!

---

## 📁 What to Copy to PC Utama

Copy **only** the `docker` folder:
```
docker/
├── docker-compose-migration.yml
├── init-db.sql
├── server.js
├── start-services.bat          ← Double-click this!
├── migrate-data.bat            ← Then double-click this!
└── README_PC_UTAMA.md
```

---

## 🚀 PC Utama (Windows) - 3 Steps

### 1. Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Install & restart

### 2. Double-click `start-services.bat`
- Starts PostgreSQL, MinIO, pgAdmin, Node.js
- Wait 2-3 minutes

### 3. Double-click `migrate-data.bat`
- Migrates JSON data to PostgreSQL
- Wait 1-2 minutes

**Done!** Services running on:
- PostgreSQL: localhost:5432
- MinIO: localhost:9000/9001
- pgAdmin: http://localhost:5050
- Node.js: http://localhost:8888

---

## 💻 Laptop Dev (Linux) - 2 Steps

### 1. Update API Endpoint
Edit: `src/services/api-client.ts`
```typescript
const API_BASE_URL = 'http://192.168.1.100:8888';
// Replace 192.168.1.100 with PC Utama IP
```

### 2. Start Frontend
```bash
npm run dev
```

Open: http://localhost:5173

**Done!** Frontend connected to PC Utama!

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
# http://localhost:5173
```

---

## 📚 Documentation

| File | For |
|------|-----|
| `docker/README_PC_UTAMA.md` | PC Utama setup |
| `LAPTOP_DEV_SETUP.md` | Laptop Dev setup |
| `QUICK_REFERENCE.md` | Daily commands |

---

## 🎉 That's It!

**PC Utama**: Copy folder → Double-click 2 scripts → Done!
**Laptop Dev**: Update endpoint → `npm run dev` → Done!

---

**Status**: ✅ Ready to setup! 🚀

