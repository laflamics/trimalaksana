# Setup Summary: PostgreSQL + MinIO Migration

## 🎯 Situasi Sekarang

```
LAPTOP DEV (Kamu sekarang)          PC UTAMA (Production)
┌─────────────────────────┐         ┌──────────────────────────┐
│  React Frontend         │         │  PostgreSQL (5432)       │
│  Dev Server (5173)      │◄────────┤  MinIO (9000/9001)       │
│  Testing                │  HTTP   │  pgAdmin (5050)          │
│                         │  8888   │  Node.js Server (8888)   │
└─────────────────────────┘         └──────────────────────────┘
```

---

## 📋 Yang Perlu Dilakukan

### Di PC Utama (Production Server)

**Total waktu: ~2 jam**

1. **Install Docker** (15 min)
   - Download Docker Desktop
   - Install & restart

2. **Setup Folders** (5 min)
   ```bash
   mkdir -p /data/trimalaksana/postgres
   mkdir -p /data/trimalaksana/minio
   mkdir -p /data/trimalaksana/server
   ```

3. **Copy Project** (10 min)
   - Copy folder ke PC Utama
   - Verify struktur folder

4. **Start Services** (10 min)
   ```bash
   cd docker
   docker-compose -f docker-compose-migration.yml up -d postgres minio pgadmin
   ```

5. **Migrate Data** (20 min)
   ```bash
   npm install pg
   node scripts/migrate-json-to-postgresql.js
   ```

6. **Start Server** (10 min)
   ```bash
   docker-compose -f docker-compose-migration.yml up -d storage-server
   ```

7. **Setup Auto-Start** (15 min)
   - Linux: Create systemd service
   - Windows: Add to Task Scheduler

8. **Setup Backups** (15 min)
   - Create backup script
   - Add to cron/scheduler

### Di Laptop Dev (Development)

**Total waktu: ~40 min**

1. **Update Config** (5 min)
   - Get PC Utama IP address
   - Update API endpoint

2. **Test Connection** (10 min)
   ```bash
   curl http://<PC_UTAMA_IP>:8888/health
   ```

3. **Test Frontend** (15 min)
   - Start dev server
   - Test data loading
   - Test file upload

4. **Verify Sync** (10 min)
   - Check PostgreSQL
   - Check MinIO
   - Check browser console

---

## 🔑 Key Information

### PC Utama Credentials

| Service | Host | Port | User | Password |
|---------|------|------|------|----------|
| PostgreSQL | localhost | 5432 | trimalaksana | trimalaksana123 |
| MinIO | localhost | 9000 | minioadmin | minioadmin123 |
| pgAdmin | localhost | 5050 | admin@trimalaksana.local | admin123 |
| Node.js | localhost | 8888 | - | - |

### Laptop Dev Config

```typescript
// src/services/api-client.ts
const API_BASE_URL = 'http://<PC_UTAMA_IP>:8888';
// Example: http://192.168.1.100:8888
```

---

## 📚 Documentation Files

### Untuk PC Utama
- **`docker/SETUP_PC_UTAMA_POSTGRESQL_MINIO.md`** - Detailed setup guide
- **`MIGRATION_QUICKSTART.md`** - Quick reference
- **`MIGRATION_SETUP_CHECKLIST.md`** - Step-by-step checklist

### Untuk Laptop Dev
- **`FRONTEND_BACKEND_INTEGRATION.md`** - Integration guide
- **`MIGRATION_SETUP_CHECKLIST.md`** - Laptop dev section

---

## ✅ Verification Steps

### PC Utama

```bash
# 1. Check services running
docker-compose -f docker-compose-migration.yml ps

# 2. Test PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT COUNT(*) FROM packaging_products;"

# 3. Test MinIO
curl http://localhost:9000/minio/health/live

# 4. Test Node.js Server
curl http://localhost:8888/health
```

### Laptop Dev

```bash
# 1. Test API connection
curl http://<PC_UTAMA_IP>:8888/health

# 2. Start frontend
npm run dev

# 3. Open browser
# http://localhost:5173

# 4. Check console for errors
# DevTools → Console tab
```

---

## 🚀 Quick Start Commands

### PC Utama - First Time Setup

```bash
# 1. Go to project folder
cd /home/trimalaksana/app

# 2. Start services
cd docker
docker-compose -f docker-compose-migration.yml up -d postgres minio pgadmin

# 3. Wait for services to be healthy
docker-compose -f docker-compose-migration.yml ps

# 4. Migrate data
cd ..
npm install pg
node scripts/migrate-json-to-postgresql.js

# 5. Start server
cd docker
docker-compose -f docker-compose-migration.yml up -d storage-server

# 6. Verify
curl http://localhost:8888/health
```

### PC Utama - Daily Operations

```bash
# Start all services
docker-compose -f docker-compose-migration.yml up -d

# Check status
docker-compose -f docker-compose-migration.yml ps

# View logs
docker-compose -f docker-compose-migration.yml logs -f

# Stop all services
docker-compose -f docker-compose-migration.yml down
```

### Laptop Dev - Daily Operations

```bash
# Start frontend dev server
npm run dev

# Test API connection
curl http://<PC_UTAMA_IP>:8888/health

# Build for production
npm run build
```

---

## 🎯 Architecture After Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│              (Laptop Dev - Port 5173)                        │
│  - Packaging Module                                          │
│  - General Trading Module                                    │
│  - Trucking Module                                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
                     │ (Port 8888)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Express Server                          │
│           (PC Utama - Port 8888)                             │
│  - Storage API (GET/POST/DELETE)                             │
│  - File upload/download                                      │
│  - Blob storage (MinIO)                                      │
│  - Health checks                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │PostgreSQL│ │ MinIO  │  │ pgAdmin  │
    │(5432)   │ │(9000)  │  │ (5050)   │
    └────────┘  └────────┘  └──────────┘
```

---

## 📊 Data Flow

### Create/Update Data

```
Frontend (Laptop Dev)
    ↓
API Server (PC Utama:8888)
    ↓
PostgreSQL (PC Utama:5432)
    ↓
✅ Data saved
```

### Upload File

```
Frontend (Laptop Dev)
    ↓
API Server (PC Utama:8888)
    ↓
MinIO (PC Utama:9000)
    ↓
✅ File stored
```

### Retrieve Data

```
Frontend (Laptop Dev)
    ↓
API Server (PC Utama:8888)
    ↓
PostgreSQL (PC Utama:5432)
    ↓
✅ Data returned
```

---

## 🔒 Security Notes

### Current Setup (Development)
- ✅ Local network only
- ✅ No authentication
- ✅ No HTTPS
- ✅ Default credentials

### For Production
- [ ] Setup HTTPS/SSL
- [ ] Add authentication (JWT)
- [ ] Configure firewall
- [ ] Use strong passwords
- [ ] Setup VPN access
- [ ] Enable backups
- [ ] Monitor access logs

---

## 📈 Performance Expectations

### After Setup
- **Data Load**: ~100-500ms
- **File Upload**: ~500ms-2s (depends on file size)
- **File Download**: ~200-1000ms
- **Concurrent Users**: 100+
- **Max File Size**: 100MB+

### Optimization (Future)
- Add caching layer
- Optimize database queries
- Add CDN for files
- Load balancing
- Database replication

---

## 🆘 Troubleshooting Quick Links

### PC Utama Issues
- Docker not starting → Check Docker Desktop/Engine installation
- Port in use → Change port in docker-compose.yml
- PostgreSQL won't connect → Check credentials in .env
- MinIO won't start → Check disk space
- Server won't start → Check logs: `docker logs <container>`

### Laptop Dev Issues
- Can't reach PC Utama → Check IP address, firewall, network
- API returns 404 → Check endpoint URL
- CORS error → Check server CORS config
- Data not loading → Check network tab in DevTools
- File upload fails → Check MinIO is running

---

## 📞 Support Resources

### Documentation
- `docker/SETUP_PC_UTAMA_POSTGRESQL_MINIO.md` - Detailed setup
- `MIGRATION_QUICKSTART.md` - Quick reference
- `MIGRATION_SETUP_CHECKLIST.md` - Checklist
- `EXISTING_SERVER_ANALYSIS.md` - Server details
- `FRONTEND_BACKEND_INTEGRATION.md` - Integration guide

### Commands
- Check services: `docker-compose ps`
- View logs: `docker-compose logs -f`
- Connect to DB: `psql -h localhost -U trimalaksana -d trimalaksana_db`
- Test API: `curl http://localhost:8888/health`

---

## ✨ What's Next

### Immediate (After Setup)
1. ✅ Verify all services running
2. ✅ Test data migration
3. ✅ Test frontend integration
4. ✅ Test file upload/download

### This Week
1. ✅ Performance testing
2. ✅ Load testing
3. ✅ Security hardening
4. ✅ Setup monitoring

### This Month
1. ✅ Production deployment
2. ✅ User training
3. ✅ Documentation
4. ✅ Optimization

---

**Status**: Ready to setup! 🚀

**Estimated Total Time**: ~3 hours (2 hours PC Utama + 1 hour Laptop Dev)

