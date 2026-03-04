# Step-by-Step Setup Guide

## 🎯 Tujuan
Setup PostgreSQL + MinIO di PC Utama, connect dari Laptop Dev

---

## 📍 PART 1: PC UTAMA SETUP (2 jam)

### Step 1: Install Docker (15 menit)

**Windows:**
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install dan ikuti wizard
3. Restart PC
4. Buka PowerShell, ketik:
   ```powershell
   docker --version
   docker-compose --version
   ```
5. Harus muncul versi, contoh: `Docker version 20.10.x`

**Linux:**
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
# Logout dan login kembali
docker --version
```

---

### Step 2: Prepare Folders (5 menit)

**Windows:**
```powershell
# Buat folder untuk data
mkdir C:\trimalaksana\data\postgres
mkdir C:\trimalaksana\data\minio
mkdir C:\trimalaksana\data\server
mkdir C:\trimalaksana\backups
```

**Linux:**
```bash
# Buat folder untuk data
sudo mkdir -p /data/trimalaksana/postgres
sudo mkdir -p /data/trimalaksana/minio
sudo mkdir -p /data/trimalaksana/server
sudo mkdir -p /data/trimalaksana/backups

# Set permissions
sudo chown -R 999:999 /data/trimalaksana/postgres
sudo chown -R 1000:1000 /data/trimalaksana/minio
```

---

### Step 3: Copy Project Files (10 menit)

**Option A: Via Git (Recommended)**
```bash
# Di PC Utama
git clone <repo-url> C:\trimalaksana\app
# atau
git clone <repo-url> /home/trimalaksana/app
```

**Option B: Via USB/Network**
- Copy folder project ke PC Utama
- Pastikan struktur folder:
  ```
  C:\trimalaksana\app\
  ├── docker/
  ├── data/
  ├── scripts/
  └── package.json
  ```

---

### Step 4: Start PostgreSQL (10 menit)

**Windows:**
```powershell
cd C:\trimalaksana\app\docker

# Start PostgreSQL
docker-compose -f docker-compose-migration.yml up -d postgres

# Wait 30 seconds, then check
docker-compose -f docker-compose-migration.yml ps

# Should show: postgres - Up (healthy)
```

**Linux:**
```bash
cd /home/trimalaksana/app/docker

# Start PostgreSQL
docker-compose -f docker-compose-migration.yml up -d postgres

# Wait 30 seconds, then check
docker-compose -f docker-compose-migration.yml ps

# Should show: postgres - Up (healthy)
```

**Verify PostgreSQL:**
```bash
# Test connection
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT version();"

# Should show PostgreSQL version
```

---

### Step 5: Start MinIO (10 menit)

```bash
# Start MinIO
docker-compose -f docker-compose-migration.yml up -d minio

# Wait 10 seconds, then check
docker-compose -f docker-compose-migration.yml ps

# Should show: minio - Up (healthy)
```

**Verify MinIO:**
```bash
# Test health
curl http://localhost:9000/minio/health/live

# Should return: {"status":"ok"}
```

---

### Step 6: Start pgAdmin (5 menit)

```bash
# Start pgAdmin
docker-compose -f docker-compose-migration.yml up -d pgadmin

# Check
docker-compose -f docker-compose-migration.yml ps

# Should show: pgadmin - Up
```

**Access pgAdmin:**
1. Open browser: http://localhost:5050
2. Login: admin@trimalaksana.local / admin123
3. Add PostgreSQL server:
   - Host: postgres
   - Port: 5432
   - User: trimalaksana
   - Password: trimalaksana123

---

### Step 7: Migrate Data (20 menit)

```bash
# Go to project root
cd C:\trimalaksana\app
# atau
cd /home/trimalaksana/app

# Install pg package
npm install pg

# Set environment variables
# Windows:
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=trimalaksana
set DB_PASSWORD=trimalaksana123
set DB_NAME=trimalaksana_db

# Linux:
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=trimalaksana
export DB_PASSWORD=trimalaksana123
export DB_NAME=trimalaksana_db

# Run migration
node scripts/migrate-json-to-postgresql.js

# Wait for completion, should see:
# ✅ Migration completed!
# 📊 Total records migrated: 5000+
```

**Verify Migration:**
```bash
# Check record counts
psql -h localhost -U trimalaksana -d trimalaksana_db << EOF
SELECT 'packaging_products' as table_name, COUNT(*) as count FROM packaging_products
UNION ALL
SELECT 'packaging_customers', COUNT(*) FROM packaging_customers
UNION ALL
SELECT 'packaging_suppliers', COUNT(*) FROM packaging_suppliers;
EOF

# Should show counts > 0
```

---

### Step 8: Create .env File (5 menit)

**Windows:**
```powershell
# Create file: C:\trimalaksana\app\.env
# Content:
DB_HOST=localhost
DB_PORT=5432
DB_USER=trimalaksana
DB_PASSWORD=trimalaksana123
DB_NAME=trimalaksana_db

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

NODE_ENV=production
PORT=8888
```

**Linux:**
```bash
# Create file: /home/trimalaksana/app/.env
cat > /home/trimalaksana/app/.env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USER=trimalaksana
DB_PASSWORD=trimalaksana123
DB_NAME=trimalaksana_db

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

NODE_ENV=production
PORT=8888
EOF
```

---

### Step 9: Start Node.js Server (10 menit)

```bash
cd docker

# Start server
docker-compose -f docker-compose-migration.yml up -d storage-server

# Check logs
docker-compose -f docker-compose-migration.yml logs -f storage-server

# Wait for "Server running on port 8888"
# Press Ctrl+C to exit logs
```

**Verify Server:**
```bash
# Test health endpoint
curl http://localhost:8888/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

### Step 10: Setup Auto-Start (15 menit)

**Windows - Task Scheduler:**

1. Create batch file: `C:\trimalaksana\start-services.bat`
   ```batch
   @echo off
   cd C:\trimalaksana\app\docker
   docker-compose -f docker-compose-migration.yml up -d
   ```

2. Open Task Scheduler:
   - Press Win+R, type `taskschd.msc`
   - Click "Create Basic Task"
   - Name: "Trimalaksana Services"
   - Trigger: "At startup"
   - Action: "Start a program"
   - Program: `C:\trimalaksana\start-services.bat`
   - Check "Run with highest privileges"
   - Click Finish

3. Test by restarting PC

**Linux - Systemd:**

1. Create service file: `/etc/systemd/system/trimalaksana.service`
   ```bash
   sudo nano /etc/systemd/system/trimalaksana.service
   ```

2. Paste:
   ```ini
   [Unit]
   Description=Trimalaksana Services
   After=network.target docker.service
   Requires=docker.service

   [Service]
   Type=oneshot
   RemainAfterExit=yes
   WorkingDirectory=/home/trimalaksana/app/docker
   ExecStart=/usr/bin/docker-compose -f docker-compose-migration.yml up -d
   ExecStop=/usr/bin/docker-compose -f docker-compose-migration.yml down
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable trimalaksana
   sudo systemctl start trimalaksana
   sudo systemctl status trimalaksana
   ```

---

### Step 11: Setup Backups (15 menit)

**Windows - Batch Script:**

1. Create: `C:\trimalaksana\backup.bat`
   ```batch
   @echo off
   setlocal enabledelayedexpansion
   
   set BACKUP_DIR=C:\trimalaksana\backups
   for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
   for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
   
   REM PostgreSQL backup
   pg_dump -h localhost -U trimalaksana -d trimalaksana_db > %BACKUP_DIR%\db_%mydate%_%mytime%.sql
   
   REM MinIO backup
   tar -czf %BACKUP_DIR%\minio_%mydate%_%mytime%.tar.gz C:\trimalaksana\data\minio
   
   echo Backup completed: %mydate% %mytime%
   ```

2. Add to Task Scheduler:
   - Create Basic Task
   - Name: "Trimalaksana Backup"
   - Trigger: "Daily" at 2:00 AM
   - Action: `C:\trimalaksana\backup.bat`

**Linux - Bash Script:**

1. Create: `/home/trimalaksana/backup.sh`
   ```bash
   #!/bin/bash
   
   BACKUP_DIR="/data/trimalaksana/backups"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # PostgreSQL backup
   pg_dump -h localhost -U trimalaksana -d trimalaksana_db > $BACKUP_DIR/db_$DATE.sql
   
   # MinIO backup
   tar -czf $BACKUP_DIR/minio_$DATE.tar.gz /data/trimalaksana/minio
   
   # Keep only last 7 days
   find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
   find $BACKUP_DIR -name "minio_*.tar.gz" -mtime +7 -delete
   
   echo "✅ Backup completed: $DATE"
   ```

2. Make executable:
   ```bash
   chmod +x /home/trimalaksana/backup.sh
   ```

3. Add to crontab:
   ```bash
   crontab -e
   # Add line: 0 2 * * * /home/trimalaksana/backup.sh >> /var/log/trimalaksana-backup.log 2>&1
   ```

---

## ✅ PC Utama Verification

```bash
# Check all services
docker-compose -f docker-compose-migration.yml ps

# Should show:
# postgres   - Up (healthy)
# minio      - Up (healthy)
# pgadmin    - Up (healthy)
# storage-server - Up

# Test each service
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT COUNT(*) FROM packaging_products;"
curl http://localhost:9000/minio/health/live
curl http://localhost:8888/health
```

---

## 📍 PART 2: LAPTOP DEV SETUP (40 menit)

### Step 1: Get PC Utama IP Address (5 menit)

**Windows (PC Utama):**
```powershell
ipconfig

# Look for "IPv4 Address" under your network adapter
# Example: 192.168.1.100
```

**Linux (PC Utama):**
```bash
hostname -I

# Example: 192.168.1.100
```

---

### Step 2: Update Frontend Config (5 menit)

**Laptop Dev:**

1. Open: `src/services/api-client.ts` (or create if doesn't exist)

2. Update API endpoint:
   ```typescript
   // Replace with PC Utama IP
   const API_BASE_URL = 'http://192.168.1.100:8888';
   // Example: http://192.168.1.100:8888
   ```

3. Save file

---

### Step 3: Test Connection (10 menit)

**Laptop Dev - Terminal:**

```bash
# Test API connection
curl http://192.168.1.100:8888/health

# Should return:
# {"status":"ok","timestamp":"2026-02-09T..."}
```

**Laptop Dev - Browser:**

1. Open: http://192.168.1.100:8888/health
2. Should show JSON response

---

### Step 4: Start Frontend Dev Server (5 menit)

**Laptop Dev:**

```bash
# Go to project root
cd /path/to/project

# Start dev server
npm run dev

# Should show:
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

---

### Step 5: Test Frontend Integration (15 menit)

**Laptop Dev - Browser:**

1. Open: http://localhost:5173
2. Navigate to Packaging module
3. Try to load data (should come from PC Utama PostgreSQL)
4. Open DevTools (F12):
   - Network tab: Check API calls to http://192.168.1.100:8888
   - Console tab: Check for errors
5. Try to upload a file (should go to PC Utama MinIO)

**Verify in PC Utama:**

```bash
# Check if data was created
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT * FROM packaging_products LIMIT 5;"

# Check MinIO console
# http://localhost:9001
# Login: minioadmin / minioadmin123
# Check if files were uploaded
```

---

## ✅ Laptop Dev Verification

```bash
# 1. Test API connection
curl http://192.168.1.100:8888/health

# 2. Check frontend loads
# Open http://localhost:5173 in browser

# 3. Check DevTools
# F12 → Network tab → should see API calls to 192.168.1.100:8888

# 4. Check console
# F12 → Console tab → should have no errors
```

---

## 🎉 Success Checklist

### PC Utama
- [ ] Docker installed and running
- [ ] PostgreSQL running and healthy
- [ ] MinIO running and healthy
- [ ] pgAdmin accessible
- [ ] Data migrated to PostgreSQL
- [ ] Node.js server running
- [ ] Auto-start configured
- [ ] Backups configured

### Laptop Dev
- [ ] API endpoint updated
- [ ] Can reach PC Utama (curl works)
- [ ] Frontend starts without errors
- [ ] Data loads from PostgreSQL
- [ ] Files upload to MinIO
- [ ] No errors in console

---

## 🚨 Troubleshooting

### PC Utama - PostgreSQL won't start
```bash
# Check logs
docker-compose -f docker-compose-migration.yml logs postgres

# Restart
docker-compose -f docker-compose-migration.yml restart postgres

# Check port
netstat -an | grep 5432
```

### PC Utama - MinIO won't start
```bash
# Check logs
docker-compose -f docker-compose-migration.yml logs minio

# Check disk space
df -h

# Restart
docker-compose -f docker-compose-migration.yml restart minio
```

### Laptop Dev - Can't reach PC Utama
```bash
# Check IP address
# Make sure you're using correct IP from PC Utama

# Check firewall
# Make sure port 8888 is open on PC Utama

# Test ping
ping 192.168.1.100

# Test port
curl http://192.168.1.100:8888/health
```

### Laptop Dev - Data not loading
```bash
# Check DevTools Network tab
# F12 → Network → should see API calls

# Check console for errors
# F12 → Console → look for error messages

# Check API endpoint
# Make sure it's correct in api-client.ts
```

---

## 📞 Quick Reference

### PC Utama Commands

```bash
# Start all services
docker-compose -f docker-compose-migration.yml up -d

# Stop all services
docker-compose -f docker-compose-migration.yml down

# Check status
docker-compose -f docker-compose-migration.yml ps

# View logs
docker-compose -f docker-compose-migration.yml logs -f

# Connect to PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db

# Backup database
pg_dump -h localhost -U trimalaksana -d trimalaksana_db > backup.sql
```

### Laptop Dev Commands

```bash
# Start frontend
npm run dev

# Build for production
npm run build

# Test API
curl http://192.168.1.100:8888/health

# View network requests
# DevTools → Network tab

# View console errors
# DevTools → Console tab
```

---

## 🎯 Next Steps

1. ✅ Verify everything working
2. ✅ Test with real data
3. ✅ Performance testing
4. ✅ Security hardening
5. ✅ Production deployment

---

**Total Time**: ~3 hours

**Status**: Ready to setup! 🚀

