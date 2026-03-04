# PostgreSQL + MinIO Migration - Quick Start

## 🚀 Start Migration (5 Minutes)

### Step 1: Start PostgreSQL + MinIO

```bash
cd docker

# Start new services (PostgreSQL, MinIO, pgAdmin)
docker-compose -f docker-compose-migration.yml up -d postgres minio pgadmin

# Wait for services to be healthy
docker-compose -f docker-compose-migration.yml ps

# Should show:
# postgres   - healthy
# minio      - healthy
# pgadmin    - healthy
```

### Step 2: Verify Services

```bash
# Check PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT version();"

# Check MinIO
curl http://localhost:9000/minio/health/live

# Access pgAdmin
# Open: http://localhost:5050
# Login: admin@trimalaksana.local / admin123
```

### Step 3: Migrate Data

```bash
# Install pg package if not already installed
npm install pg

# Run migration script
node scripts/migrate-json-to-postgresql.js

# Output should show:
# ✅ Database connection successful
# 📂 Reading JSON files...
# 📥 Migrating products → packaging_products
# ✅ 150 records inserted
# ... (more tables)
# ✅ Migration completed!
# 📊 Total records migrated: 5000+
```

### Step 4: Verify Migration

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

## 📊 Services Overview

### PostgreSQL (Port 5432)
- **Host**: localhost
- **User**: trimalaksana
- **Password**: trimalaksana123
- **Database**: trimalaksana_db
- **Connection**: `psql -h localhost -U trimalaksana -d trimalaksana_db`

### MinIO (Port 9000 API, 9001 Console)
- **Console**: http://localhost:9001
- **Access Key**: minioadmin
- **Secret Key**: minioadmin123
- **API**: http://localhost:9000

### pgAdmin (Port 5050)
- **URL**: http://localhost:5050
- **Email**: admin@trimalaksana.local
- **Password**: admin123

### Node.js Server (Port 8888)
- **Still running** with JSON files
- **Will be updated** to use PostgreSQL

---

## 🔄 Migration Strategy

### Phase 1: Parallel Running (Current)
```
Frontend
    ↓
Node.js Server (8888)
    ├─→ JSON Files (current)
    └─→ PostgreSQL (new - read-only)
```

### Phase 2: Gradual Cutover
```
Frontend
    ↓
Node.js Server (8888)
    ├─→ PostgreSQL (primary)
    └─→ JSON Files (backup)
```

### Phase 3: Full Migration
```
Frontend
    ↓
Node.js Server (8888)
    ↓
PostgreSQL (primary)
```

---

## 📝 Environment Variables

Create `.env` file in project root:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=trimalaksana
DB_PASSWORD=trimalaksana123
DB_NAME=trimalaksana_db

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

# Node.js Server
NODE_ENV=production
PORT=8888
```

---

## 🔧 Common Commands

### PostgreSQL

```bash
# Connect to database
psql -h localhost -U trimalaksana -d trimalaksana_db

# List tables
\dt

# Check table structure
\d packaging_products

# Count records
SELECT COUNT(*) FROM packaging_products;

# Export data
pg_dump -h localhost -U trimalaksana -d trimalaksana_db > backup.sql

# Import data
psql -h localhost -U trimalaksana -d trimalaksana_db < backup.sql
```

### MinIO

```bash
# Create bucket
mc mb minio/packaging-files

# List buckets
mc ls minio/

# Upload file
mc cp file.pdf minio/packaging-files/

# List files
mc ls minio/packaging-files/

# Remove file
mc rm minio/packaging-files/file.pdf
```

### Docker

```bash
# View logs
docker-compose -f docker-compose-migration.yml logs -f postgres

# Stop services
docker-compose -f docker-compose-migration.yml down

# Remove volumes (WARNING: deletes data!)
docker-compose -f docker-compose-migration.yml down -v

# Restart services
docker-compose -f docker-compose-migration.yml restart
```

---

## ✅ Verification Checklist

- [ ] PostgreSQL running and accessible
- [ ] MinIO running and accessible
- [ ] pgAdmin accessible
- [ ] Migration script completed successfully
- [ ] Record counts match JSON files
- [ ] No errors in migration logs
- [ ] Node.js server still running
- [ ] Frontend still works with JSON files

---

## 🐛 Troubleshooting

### PostgreSQL Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose-migration.yml ps postgres

# Check logs
docker-compose -f docker-compose-migration.yml logs postgres

# Restart PostgreSQL
docker-compose -f docker-compose-migration.yml restart postgres
```

### Migration Script Errors
```bash
# Check if pg package is installed
npm list pg

# Install if missing
npm install pg

# Run with debug output
DEBUG=* node scripts/migrate-json-to-postgresql.js
```

### MinIO Connection Failed
```bash
# Check if MinIO is running
docker-compose -f docker-compose-migration.yml ps minio

# Check logs
docker-compose -f docker-compose-migration.yml logs minio

# Restart MinIO
docker-compose -f docker-compose-migration.yml restart minio
```

---

## 📈 Next Steps

### After Migration
1. ✅ Verify all data in PostgreSQL
2. ✅ Test Node.js server with PostgreSQL
3. ✅ Update Node.js server to read from PostgreSQL
4. ✅ Test file upload to MinIO
5. ✅ Update Node.js server to use MinIO for blobs
6. ✅ Performance testing
7. ✅ Deploy to production

### Timeline
- **Today**: PostgreSQL + MinIO setup + data migration
- **Tomorrow**: Update Node.js server to use PostgreSQL
- **Day 3**: Update Node.js server to use MinIO
- **Day 4-5**: Testing and optimization
- **Day 6**: Production deployment

---

## 📞 Support

### Check Status
```bash
# All services
docker-compose -f docker-compose-migration.yml ps

# Database
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT COUNT(*) FROM packaging_products;"

# MinIO
curl http://localhost:9000/minio/health/live

# Node.js
curl http://localhost:8888/health
```

### View Logs
```bash
# PostgreSQL
docker-compose -f docker-compose-migration.yml logs postgres

# MinIO
docker-compose -f docker-compose-migration.yml logs minio

# Node.js
docker-compose -f docker-compose-migration.yml logs storage-server
```

---

## 🎓 Key Points

1. **Parallel Running**: Both JSON and PostgreSQL work simultaneously
2. **No Downtime**: Frontend continues to work during migration
3. **Gradual Cutover**: Can switch to PostgreSQL when ready
4. **Backup**: JSON files remain as backup
5. **Rollback**: Can revert to JSON files if needed

---

**Status**: Ready to migrate! 🚀
