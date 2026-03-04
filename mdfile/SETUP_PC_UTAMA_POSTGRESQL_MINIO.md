# Setup PostgreSQL + MinIO di PC Utama

## 📋 Overview

Ini adalah setup untuk **PC Utama** (production server). Kamu di laptop dev, jadi ini untuk server yang akan jalan 24/7.

### Arsitektur
```
PC Utama (Production)
├── PostgreSQL (Port 5432) - Database
├── MinIO (Port 9000/9001) - Blob Storage
├── pgAdmin (Port 5050) - Database UI
└── Node.js Server (Port 8888) - API Server
```

---

## 🔧 Prerequisites di PC Utama

### 1. Install Docker & Docker Compose

**Windows (PC Utama):**
```powershell
# Download Docker Desktop dari https://www.docker.com/products/docker-desktop
# Install dan restart PC

# Verify installation
docker --version
docker-compose --version
```

**Linux (jika PC Utama pakai Linux):**
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
# Restart terminal atau logout/login
```

### 2. Prepare Directories

```bash
# Di PC Utama, buat folder untuk data persistence
mkdir -p /data/trimalaksana/postgres
mkdir -p /data/trimalaksana/minio
mkdir -p /data/trimalaksana/server

# Set permissions (Linux)
sudo chown -R 999:999 /data/trimalaksana/postgres
sudo chown -R 1000:1000 /data/trimalaksana/minio
```

---

## 🚀 Step 1: Copy Files ke PC Utama

### Option A: Via Git (Recommended)
```bash
# Di PC Utama
git clone <repo-url> /home/trimalaksana/app
cd /home/trimalaksana/app
```

### Option B: Via USB/Network
```bash
# Copy folder ke PC Utama:
# - docker/
# - data/localStorage/
# - scripts/
```

---

## 🐳 Step 2: Start PostgreSQL + MinIO

### Edit docker-compose-migration.yml untuk PC Utama

Buka `docker/docker-compose-migration.yml` dan update paths:

```yaml
# Ganti bagian volumes untuk persistent storage
volumes:
  postgres:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/trimalaksana/postgres
  
  minio:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/trimalaksana/minio
```

### Start Services

```bash
cd /home/trimalaksana/app/docker

# Start PostgreSQL, MinIO, pgAdmin
docker-compose -f docker-compose-migration.yml up -d postgres minio pgadmin

# Check status
docker-compose -f docker-compose-migration.yml ps

# Should show:
# postgres   - Up (healthy)
# minio      - Up (healthy)
# pgadmin    - Up (healthy)
```

### Verify Services

```bash
# PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT version();"

# MinIO
curl http://localhost:9000/minio/health/live

# pgAdmin
# Open browser: http://localhost:5050
# Login: admin@trimalaksana.local / admin123
```

---

## 📥 Step 3: Migrate Data

### Install Dependencies

```bash
cd /home/trimalaksana/app

# Install pg package
npm install pg
```

### Run Migration Script

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=trimalaksana
export DB_PASSWORD=trimalaksana123
export DB_NAME=trimalaksana_db

# Run migration
node scripts/migrate-json-to-postgresql.js

# Output:
# ✅ Database connection successful
# 📂 Reading JSON files...
# 📥 Migrating products → packaging_products
# ✅ 150 records inserted
# ... (more tables)
# ✅ Migration completed!
# 📊 Total records migrated: 5000+
```

### Verify Migration

```bash
# Check record counts
psql -h localhost -U trimalaksana -d trimalaksana_db << EOF
SELECT 'packaging_products' as table_name, COUNT(*) as count FROM packaging_products
UNION ALL
SELECT 'packaging_customers', COUNT(*) FROM packaging_customers
UNION ALL
SELECT 'packaging_suppliers', COUNT(*) FROM packaging_suppliers
UNION ALL
SELECT 'packaging_sales_orders', COUNT(*) FROM packaging_sales_orders
UNION ALL
SELECT 'packaging_invoices', COUNT(*) FROM packaging_invoices
UNION ALL
SELECT 'packaging_delivery_notes', COUNT(*) FROM packaging_delivery_notes
UNION ALL
SELECT 'packaging_journal_entries', COUNT(*) FROM packaging_journal_entries;
EOF
```

---

## 🔄 Step 4: Update Node.js Server

### Create .env File

```bash
# /home/trimalaksana/app/.env
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

### Update docker/server.js

Tambahkan PostgreSQL connection pool di awal file:

```javascript
const { Pool } = require('pg');

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'trimalaksana',
  password: process.env.DB_PASSWORD || 'trimalaksana123',
  database: process.env.DB_NAME || 'trimalaksana_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err);
  } else {
    console.log('✅ PostgreSQL connected:', res.rows[0]);
  }
});
```

### Start Node.js Server

```bash
cd /home/trimalaksana/app/docker

# Start server
docker-compose -f docker-compose-migration.yml up -d storage-server

# Check logs
docker-compose -f docker-compose-migration.yml logs -f storage-server

# Test server
curl http://localhost:8888/health
```

---

## 🔐 Step 5: Setup Auto-Start (Linux)

### Create Systemd Service

```bash
# /etc/systemd/system/trimalaksana.service
[Unit]
Description=Trimalaksana App Services
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/trimalaksana/app/docker
ExecStart=/usr/bin/docker-compose -f docker-compose-migration.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose-migration.yml down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable Auto-Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable trimalaksana
sudo systemctl start trimalaksana

# Check status
sudo systemctl status trimalaksana
```

---

## 🔐 Step 6: Setup Auto-Start (Windows)

### Create Batch Script

```batch
REM C:\trimalaksana\start-services.bat
@echo off
cd C:\Users\Admin\app\docker
docker-compose -f docker-compose-migration.yml up -d
```

### Add to Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Trimalaksana Services"
4. Trigger: "At startup"
5. Action: "Start a program"
6. Program: `C:\trimalaksana\start-services.bat`
7. Check "Run with highest privileges"

---

## 📊 Step 7: Monitoring

### Check All Services

```bash
# Status
docker-compose -f docker-compose-migration.yml ps

# Logs
docker-compose -f docker-compose-migration.yml logs -f

# Specific service
docker-compose -f docker-compose-migration.yml logs -f postgres
docker-compose -f docker-compose-migration.yml logs -f minio
docker-compose -f docker-compose-migration.yml logs -f storage-server
```

### Database Monitoring

```bash
# Connect to PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db

# Useful commands
\dt                    # List tables
\d packaging_products  # Show table structure
SELECT COUNT(*) FROM packaging_products;  # Count records
```

### MinIO Monitoring

```bash
# Access MinIO Console
# http://localhost:9001
# Login: minioadmin / minioadmin123

# Or use mc CLI
mc ls minio/
mc du minio/
```

---

## 🔄 Step 8: Backup Strategy

### Daily Backup

```bash
#!/bin/bash
# /home/trimalaksana/backup.sh

BACKUP_DIR="/data/trimalaksana/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL backup
pg_dump -h localhost -U trimalaksana -d trimalaksana_db > $BACKUP_DIR/db_$DATE.sql

# MinIO backup (tar the data directory)
tar -czf $BACKUP_DIR/minio_$DATE.tar.gz /data/trimalaksana/minio

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "minio_*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $DATE"
```

### Schedule Backup

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * /home/trimalaksana/backup.sh >> /var/log/trimalaksana-backup.log 2>&1
```

---

## 🚨 Troubleshooting

### PostgreSQL Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose-migration.yml ps postgres

# Check logs
docker-compose -f docker-compose-migration.yml logs postgres

# Restart
docker-compose -f docker-compose-migration.yml restart postgres

# Check port
netstat -an | grep 5432
```

### MinIO Connection Failed

```bash
# Check if MinIO is running
docker-compose -f docker-compose-migration.yml ps minio

# Check logs
docker-compose -f docker-compose-migration.yml logs minio

# Restart
docker-compose -f docker-compose-migration.yml restart minio

# Check port
netstat -an | grep 9000
```

### Node.js Server Not Starting

```bash
# Check logs
docker-compose -f docker-compose-migration.yml logs storage-server

# Check if port 8888 is in use
netstat -an | grep 8888

# Kill process using port 8888
lsof -i :8888
kill -9 <PID>
```

### Migration Script Errors

```bash
# Check if pg package is installed
npm list pg

# Install if missing
npm install pg

# Run with debug
DEBUG=* node scripts/migrate-json-to-postgresql.js
```

---

## 📱 Step 9: Connect from Laptop Dev

### Update Frontend Config

Di laptop dev, update API endpoint:

```typescript
// src/services/api-client.ts
const API_BASE_URL = 'http://<PC_UTAMA_IP>:8888';

// Example: http://192.168.1.100:8888
```

### Test Connection

```bash
# From laptop dev
curl http://<PC_UTAMA_IP>:8888/health

# Should return:
# {"status":"ok","timestamp":"2026-02-09T..."}
```

---

## ✅ Verification Checklist

- [ ] Docker & Docker Compose installed
- [ ] Directories created with proper permissions
- [ ] PostgreSQL running and accessible
- [ ] MinIO running and accessible
- [ ] pgAdmin accessible
- [ ] Migration script completed successfully
- [ ] Record counts match JSON files
- [ ] Node.js server running
- [ ] Server accessible from laptop dev
- [ ] Auto-start configured
- [ ] Backup script configured

---

## 📈 Performance Tuning

### PostgreSQL Optimization

```sql
-- Increase shared buffers (edit postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 64MB

-- Create indexes for common queries
CREATE INDEX idx_packaging_products_kode ON packaging_products(kode);
CREATE INDEX idx_packaging_customers_kode ON packaging_customers(kode);
```

### MinIO Optimization

```bash
# Increase concurrent requests
export MINIO_API_REQUESTS_MAX=1000

# Enable compression
export MINIO_COMPRESS=true
export MINIO_COMPRESS_EXTENSIONS=.txt,.log,.csv,.json
```

---

## 🎯 Next Steps

1. ✅ Setup PostgreSQL + MinIO on PC Utama
2. ✅ Migrate data from JSON
3. ✅ Update Node.js server to use PostgreSQL
4. ✅ Test from laptop dev
5. ✅ Setup monitoring & backups
6. ✅ Deploy to production

---

## 📞 Support

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change port in docker-compose.yml |
| Permission denied | Run with sudo or fix directory permissions |
| Connection refused | Check if service is running: `docker ps` |
| Out of disk space | Check: `df -h` and clean up old backups |
| High memory usage | Reduce PostgreSQL shared_buffers |

### Logs Location

```bash
# Docker logs
docker-compose logs -f

# PostgreSQL logs
docker exec trimalaksana-postgres tail -f /var/log/postgresql/postgresql.log

# MinIO logs
docker exec trimalaksana-minio tail -f /var/log/minio.log
```

---

**Status**: Ready to setup! 🚀

