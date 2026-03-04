# PostgreSQL + MinIO Migration - Setup Checklist

## 🎯 Quick Overview

```
Laptop Dev (Sekarang)          PC Utama (Production)
├── Frontend (React)            ├── PostgreSQL (5432)
├── Dev Server                  ├── MinIO (9000/9001)
└── Testing                     ├── pgAdmin (5050)
                                └── Node.js Server (8888)
```

---

## 📋 PC Utama Setup Checklist

### Phase 1: Prerequisites (30 minutes)

- [ ] Install Docker Desktop / Docker Engine
- [ ] Install Docker Compose
- [ ] Create data directories:
  - [ ] `/data/trimalaksana/postgres`
  - [ ] `/data/trimalaksana/minio`
  - [ ] `/data/trimalaksana/server`
- [ ] Set proper permissions on directories
- [ ] Verify Docker installation: `docker --version`

### Phase 2: Copy Project Files (15 minutes)

- [ ] Copy project folder to PC Utama
- [ ] Verify folder structure:
  - [ ] `docker/` folder exists
  - [ ] `data/localStorage/` exists
  - [ ] `scripts/` folder exists
- [ ] Verify files:
  - [ ] `docker/docker-compose-migration.yml`
  - [ ] `docker/init-db.sql`
  - [ ] `scripts/migrate-json-to-postgresql.js`

### Phase 3: Start Services (10 minutes)

- [ ] Start PostgreSQL: `docker-compose -f docker-compose-migration.yml up -d postgres`
- [ ] Wait for PostgreSQL to be healthy (check logs)
- [ ] Start MinIO: `docker-compose -f docker-compose-migration.yml up -d minio`
- [ ] Wait for MinIO to be healthy
- [ ] Start pgAdmin: `docker-compose -f docker-compose-migration.yml up -d pgadmin`
- [ ] Verify all services: `docker-compose -f docker-compose-migration.yml ps`

### Phase 4: Verify Services (15 minutes)

- [ ] Test PostgreSQL:
  ```bash
  psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT version();"
  ```
- [ ] Test MinIO:
  ```bash
  curl http://localhost:9000/minio/health/live
  ```
- [ ] Test pgAdmin:
  - [ ] Open http://localhost:5050
  - [ ] Login: admin@trimalaksana.local / admin123
  - [ ] Add PostgreSQL server connection

### Phase 5: Migrate Data (20 minutes)

- [ ] Install pg package: `npm install pg`
- [ ] Set environment variables:
  ```bash
  export DB_HOST=localhost
  export DB_PORT=5432
  export DB_USER=trimalaksana
  export DB_PASSWORD=trimalaksana123
  export DB_NAME=trimalaksana_db
  ```
- [ ] Run migration script: `node scripts/migrate-json-to-postgresql.js`
- [ ] Wait for completion (should see "✅ Migration completed!")
- [ ] Verify record counts in PostgreSQL

### Phase 6: Start Node.js Server (10 minutes)

- [ ] Create `.env` file with database credentials
- [ ] Start server: `docker-compose -f docker-compose-migration.yml up -d storage-server`
- [ ] Check logs: `docker-compose -f docker-compose-migration.yml logs -f storage-server`
- [ ] Test server: `curl http://localhost:8888/health`

### Phase 7: Setup Auto-Start (15 minutes)

**Linux:**
- [ ] Create systemd service file
- [ ] Enable service: `sudo systemctl enable trimalaksana`
- [ ] Start service: `sudo systemctl start trimalaksana`
- [ ] Verify: `sudo systemctl status trimalaksana`

**Windows:**
- [ ] Create batch script
- [ ] Add to Task Scheduler
- [ ] Set to run at startup
- [ ] Test by restarting PC

### Phase 8: Setup Monitoring & Backups (20 minutes)

- [ ] Create backup directory: `/data/trimalaksana/backups`
- [ ] Create backup script: `/home/trimalaksana/backup.sh`
- [ ] Add to crontab (Linux) or Task Scheduler (Windows)
- [ ] Test backup script manually
- [ ] Verify backup files created

---

## 💻 Laptop Dev Setup Checklist

### Phase 1: Update Frontend Config (5 minutes)

- [ ] Get PC Utama IP address
- [ ] Update API endpoint in frontend:
  ```typescript
  // src/services/api-client.ts
  const API_BASE_URL = 'http://<PC_UTAMA_IP>:8888';
  ```
- [ ] Example: `http://192.168.1.100:8888`

### Phase 2: Test Connection (10 minutes)

- [ ] Test from laptop dev:
  ```bash
  curl http://<PC_UTAMA_IP>:8888/health
  ```
- [ ] Should return: `{"status":"ok",...}`
- [ ] Test from browser: `http://<PC_UTAMA_IP>:8888/health`

### Phase 3: Test Frontend Integration (15 minutes)

- [ ] Start frontend dev server: `npm run dev`
- [ ] Open browser: `http://localhost:5173`
- [ ] Test data loading (should come from PC Utama PostgreSQL)
- [ ] Test file upload (should go to PC Utama MinIO)
- [ ] Check browser console for errors
- [ ] Check network tab for API calls

### Phase 4: Verify Data Sync (10 minutes)

- [ ] Create test data in frontend
- [ ] Verify in PostgreSQL on PC Utama:
  ```bash
  psql -h <PC_UTAMA_IP> -U trimalaksana -d trimalaksana_db -c "SELECT * FROM packaging_products LIMIT 5;"
  ```
- [ ] Verify file upload in MinIO console
- [ ] Test data retrieval from frontend

---

## 🔄 Migration Timeline

| Phase | PC Utama | Laptop Dev | Duration |
|-------|----------|-----------|----------|
| Prerequisites | ✅ | - | 30 min |
| Copy Files | ✅ | - | 15 min |
| Start Services | ✅ | - | 10 min |
| Verify Services | ✅ | - | 15 min |
| Migrate Data | ✅ | - | 20 min |
| Start Server | ✅ | - | 10 min |
| Auto-Start | ✅ | - | 15 min |
| Backups | ✅ | - | 20 min |
| **Subtotal** | | | **2 hours** |
| Update Config | - | ✅ | 5 min |
| Test Connection | - | ✅ | 10 min |
| Integration Test | - | ✅ | 15 min |
| Data Sync Test | - | ✅ | 10 min |
| **Subtotal** | | | **40 min** |
| **TOTAL** | | | **~3 hours** |

---

## 📊 Service Ports

### PC Utama
| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| PostgreSQL | 5432 | `psql -h localhost` | trimalaksana / trimalaksana123 |
| MinIO API | 9000 | `http://localhost:9000` | minioadmin / minioadmin123 |
| MinIO Console | 9001 | `http://localhost:9001` | minioadmin / minioadmin123 |
| pgAdmin | 5050 | `http://localhost:5050` | admin@trimalaksana.local / admin123 |
| Node.js Server | 8888 | `http://localhost:8888` | - |

### Laptop Dev
| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| API Server | `http://<PC_UTAMA_IP>:8888` |
| pgAdmin | `http://<PC_UTAMA_IP>:5050` |
| MinIO Console | `http://<PC_UTAMA_IP>:9001` |

---

## 🚨 Common Issues & Solutions

### PC Utama

| Issue | Solution |
|-------|----------|
| Docker not found | Install Docker Desktop / Docker Engine |
| Port already in use | Change port in docker-compose.yml or kill process |
| Permission denied | Run with sudo or fix directory permissions |
| PostgreSQL won't start | Check logs: `docker logs trimalaksana-postgres` |
| MinIO won't start | Check logs: `docker logs trimalaksana-minio` |
| Migration fails | Check if pg package installed: `npm install pg` |
| Server won't connect to DB | Check credentials in .env file |

### Laptop Dev

| Issue | Solution |
|-------|----------|
| Can't reach PC Utama | Check IP address, firewall, network connection |
| API returns 404 | Check API endpoint URL in config |
| CORS error | Check CORS settings in Node.js server |
| Data not syncing | Check network tab in browser DevTools |
| File upload fails | Check MinIO is running and accessible |

---

## 📝 Important Notes

### PC Utama
1. **Keep running 24/7** - This is your production server
2. **Regular backups** - Setup automated backups
3. **Monitor resources** - Check CPU, memory, disk usage
4. **Update regularly** - Keep Docker images updated
5. **Security** - Use firewall, strong passwords, HTTPS (production)

### Laptop Dev
1. **Development only** - Don't use for production
2. **Test thoroughly** - Before deploying to PC Utama
3. **Keep in sync** - Pull latest changes from git
4. **Document changes** - Commit to git regularly
5. **Use .env** - Don't hardcode credentials

---

## ✅ Success Criteria

### PC Utama
- [x] All services running and healthy
- [x] PostgreSQL accessible and populated
- [x] MinIO accessible and working
- [x] Node.js server running
- [x] Auto-start configured
- [x] Backups running

### Laptop Dev
- [x] Frontend connects to PC Utama
- [x] Data loads from PostgreSQL
- [x] Files upload to MinIO
- [x] No errors in console
- [x] All features working

---

## 🎯 Next Steps After Setup

1. **Performance Testing**
   - Load test with multiple users
   - Monitor resource usage
   - Optimize if needed

2. **Security Hardening**
   - Setup HTTPS/SSL
   - Add authentication
   - Configure firewall rules
   - Setup VPN access

3. **Monitoring & Alerting**
   - Setup monitoring dashboard
   - Configure alerts
   - Setup log aggregation
   - Monitor uptime

4. **Disaster Recovery**
   - Test backup restoration
   - Document recovery procedures
   - Setup redundancy
   - Plan for failover

---

## 📞 Quick Reference

### PC Utama Commands

```bash
# Check all services
docker-compose -f docker-compose-migration.yml ps

# View logs
docker-compose -f docker-compose-migration.yml logs -f

# Restart services
docker-compose -f docker-compose-migration.yml restart

# Stop services
docker-compose -f docker-compose-migration.yml down

# Connect to PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db

# Access MinIO console
# http://localhost:9001
```

### Laptop Dev Commands

```bash
# Start frontend dev server
npm run dev

# Test API connection
curl http://<PC_UTAMA_IP>:8888/health

# Check network requests
# Open DevTools → Network tab

# View console errors
# Open DevTools → Console tab
```

---

**Status**: Ready to setup! 🚀

