# Quick Reference Card

## 🎯 Setup Overview

| Component | Location | Port | Status |
|-----------|----------|------|--------|
| PostgreSQL | PC Utama | 5432 | ✅ Ready |
| MinIO | PC Utama | 9000/9001 | ✅ Ready |
| pgAdmin | PC Utama | 5050 | ✅ Ready |
| Node.js Server | PC Utama | 8888 | ✅ Ready |
| Frontend | Laptop Dev | 5173 | ✅ Ready |

---

## 🔑 Credentials

### PostgreSQL
```
Host: localhost (PC Utama)
Port: 5432
User: trimalaksana
Password: trimalaksana123
Database: trimalaksana_db
```

### MinIO
```
Endpoint: localhost:9000 (PC Utama)
Console: localhost:9001 (PC Utama)
Access Key: minioadmin
Secret Key: minioadmin123
```

### pgAdmin
```
URL: http://localhost:5050 (PC Utama)
Email: admin@trimalaksana.local
Password: admin123
```

---

## 📋 PC Utama - Essential Commands

### Start Services
```bash
cd docker
docker-compose -f docker-compose-migration.yml up -d
```

### Stop Services
```bash
cd docker
docker-compose -f docker-compose-migration.yml down
```

### Check Status
```bash
cd docker
docker-compose -f docker-compose-migration.yml ps
```

### View Logs
```bash
cd docker
docker-compose -f docker-compose-migration.yml logs -f
```

### Connect to PostgreSQL
```bash
psql -h localhost -U trimalaksana -d trimalaksana_db
```

### Test API
```bash
curl http://localhost:8888/health
```

### Backup Database
```bash
pg_dump -h localhost -U trimalaksana -d trimalaksana_db > backup.sql
```

---

## 💻 Laptop Dev - Essential Commands

### Start Frontend
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Test API Connection
```bash
curl http://<PC_UTAMA_IP>:8888/health
```

### Update API Endpoint
```typescript
// src/services/api-client.ts
const API_BASE_URL = 'http://<PC_UTAMA_IP>:8888';
```

---

## 🔍 Troubleshooting Quick Fixes

### PostgreSQL Connection Failed
```bash
# Restart PostgreSQL
docker-compose -f docker-compose-migration.yml restart postgres

# Check logs
docker-compose -f docker-compose-migration.yml logs postgres
```

### MinIO Connection Failed
```bash
# Restart MinIO
docker-compose -f docker-compose-migration.yml restart minio

# Check logs
docker-compose -f docker-compose-migration.yml logs minio
```

### Node.js Server Not Starting
```bash
# Check logs
docker-compose -f docker-compose-migration.yml logs storage-server

# Restart
docker-compose -f docker-compose-migration.yml restart storage-server
```

### Can't Reach PC Utama from Laptop Dev
```bash
# Check IP address
# Make sure using correct IP from PC Utama

# Test ping
ping <PC_UTAMA_IP>

# Test port
curl http://<PC_UTAMA_IP>:8888/health
```

### Frontend Not Loading Data
```bash
# Check DevTools Network tab (F12)
# Look for API calls to PC Utama

# Check Console tab (F12)
# Look for error messages

# Verify API endpoint in code
# Should be: http://<PC_UTAMA_IP>:8888
```

---

## 📊 Database Queries

### Count Records
```sql
SELECT COUNT(*) FROM packaging_products;
SELECT COUNT(*) FROM packaging_customers;
SELECT COUNT(*) FROM packaging_suppliers;
SELECT COUNT(*) FROM packaging_sales_orders;
SELECT COUNT(*) FROM packaging_invoices;
```

### List All Tables
```sql
\dt
```

### Show Table Structure
```sql
\d packaging_products
```

### Export Data
```bash
pg_dump -h localhost -U trimalaksana -d trimalaksana_db > backup.sql
```

### Import Data
```bash
psql -h localhost -U trimalaksana -d trimalaksana_db < backup.sql
```

---

## 🔄 Common Workflows

### First Time Setup (PC Utama)
```bash
# 1. Install Docker
# 2. Create folders
# 3. Copy project
# 4. Start services
docker-compose -f docker-compose-migration.yml up -d postgres minio pgadmin

# 5. Migrate data
npm install pg
node scripts/migrate-json-to-postgresql.js

# 6. Start server
docker-compose -f docker-compose-migration.yml up -d storage-server

# 7. Verify
curl http://localhost:8888/health
```

### Daily Operations (PC Utama)
```bash
# Start services
docker-compose -f docker-compose-migration.yml up -d

# Check status
docker-compose -f docker-compose-migration.yml ps

# View logs
docker-compose -f docker-compose-migration.yml logs -f

# Stop services
docker-compose -f docker-compose-migration.yml down
```

### Development (Laptop Dev)
```bash
# Start frontend
npm run dev

# Test API
curl http://<PC_UTAMA_IP>:8888/health

# Open browser
# http://localhost:5173

# Check DevTools
# F12 → Network & Console tabs
```

---

## 📁 Important Directories

### PC Utama
```
/data/trimalaksana/postgres/     - PostgreSQL data
/data/trimalaksana/minio/        - MinIO data
/data/trimalaksana/backups/      - Backup files
/home/trimalaksana/app/          - Project folder
/home/trimalaksana/app/docker/   - Docker files
/home/trimalaksana/app/data/     - JSON data
```

### Laptop Dev
```
./src/                           - Source code
./src/services/api-client.ts     - API configuration
./src/pages/                     - Pages
./docker/                        - Docker files
./data/                          - Data files
```

---

## 🔗 URLs

### PC Utama
| Service | URL |
|---------|-----|
| PostgreSQL | `psql -h localhost` |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |
| pgAdmin | `http://localhost:5050` |
| Node.js API | `http://localhost:8888` |

### Laptop Dev
| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| API Server | `http://<PC_UTAMA_IP>:8888` |
| pgAdmin | `http://<PC_UTAMA_IP>:5050` |
| MinIO Console | `http://<PC_UTAMA_IP>:9001` |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `SETUP_SUMMARY.md` | Overview & architecture |
| `STEP_BY_STEP_SETUP.md` | Detailed step-by-step guide |
| `MIGRATION_SETUP_CHECKLIST.md` | Checklist for setup |
| `docker/SETUP_PC_UTAMA_POSTGRESQL_MINIO.md` | PC Utama detailed guide |
| `MIGRATION_QUICKSTART.md` | Quick reference |
| `QUICK_REFERENCE.md` | This file |

---

## ✅ Verification Checklist

### PC Utama
- [ ] Docker running
- [ ] PostgreSQL healthy
- [ ] MinIO healthy
- [ ] pgAdmin accessible
- [ ] Node.js server running
- [ ] Data migrated
- [ ] Auto-start configured
- [ ] Backups configured

### Laptop Dev
- [ ] API endpoint updated
- [ ] Can reach PC Utama
- [ ] Frontend starts
- [ ] Data loads
- [ ] Files upload
- [ ] No console errors

---

## 🚀 Quick Start

### PC Utama (First Time)
```bash
cd docker
docker-compose -f docker-compose-migration.yml up -d postgres minio pgadmin
# Wait 30 seconds
npm install pg
node scripts/migrate-json-to-postgresql.js
docker-compose -f docker-compose-migration.yml up -d storage-server
curl http://localhost:8888/health
```

### Laptop Dev (First Time)
```bash
# Update API endpoint in src/services/api-client.ts
# Then:
npm run dev
# Open http://localhost:5173
```

---

## 🆘 Emergency Commands

### Restart Everything (PC Utama)
```bash
cd docker
docker-compose -f docker-compose-migration.yml down
docker-compose -f docker-compose-migration.yml up -d
```

### Check All Services (PC Utama)
```bash
docker-compose -f docker-compose-migration.yml ps
docker ps
netstat -an | grep LISTEN
```

### View All Logs (PC Utama)
```bash
docker-compose -f docker-compose-migration.yml logs -f
```

### Kill Process Using Port (PC Utama)
```bash
# Linux
lsof -i :8888
kill -9 <PID>

# Windows
netstat -ano | findstr :8888
taskkill /PID <PID> /F
```

---

## 📞 Support

### For PC Utama Issues
1. Check logs: `docker-compose logs -f`
2. Check status: `docker-compose ps`
3. Restart service: `docker-compose restart <service>`
4. Read: `docker/SETUP_PC_UTAMA_POSTGRESQL_MINIO.md`

### For Laptop Dev Issues
1. Check DevTools (F12)
2. Check API endpoint
3. Test connection: `curl http://<IP>:8888/health`
4. Read: `FRONTEND_BACKEND_INTEGRATION.md`

### For Data Issues
1. Check PostgreSQL: `psql -h localhost -U trimalaksana -d trimalaksana_db`
2. Check MinIO console: `http://localhost:9001`
3. Check pgAdmin: `http://localhost:5050`

---

## 💡 Tips & Tricks

### Monitor Services in Real-Time
```bash
watch -n 1 'docker-compose -f docker-compose-migration.yml ps'
```

### Backup Before Changes
```bash
pg_dump -h localhost -U trimalaksana -d trimalaksana_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:8888/health

# Get storage
curl http://localhost:8888/api/storage/packaging_products

# Post storage
curl -X POST http://localhost:8888/api/storage/packaging_products \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":{}}'
```

### View Docker Resource Usage
```bash
docker stats
```

### Clean Up Docker
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune
```

---

**Last Updated**: 2026-02-09

**Status**: Ready to use! 🚀

