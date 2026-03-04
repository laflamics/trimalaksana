# Switch to PostgreSQL + MinIO Only Mode

## Quick Summary

Created `server-postgres-only.js` that:
- ✅ ONLY reads/writes from PostgreSQL
- ✅ ONLY stores files in MinIO
- ❌ NO JSON file access
- ❌ NO old data interference

---

## Implementation Steps

### Step 1: Update package.json
Add PostgreSQL and AWS SDK dependencies:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.13.0",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.0",
    "aws-sdk": "^2.1500.0"
  }
}
```

### Step 2: Update Dockerfile
Change the startup command:

```dockerfile
# Old:
CMD ["node", "server.js"]

# New:
CMD ["node", "server-postgres-only.js"]
```

### Step 3: Rebuild and Restart (PC Utama)

```bash
cd D:\trimalaksanaapps\possgresql\docker

# Rebuild image with new dependencies
docker-compose -f docker-compose-migration.yml build

# Stop old services
docker-compose -f docker-compose-migration.yml down

# Start fresh services
docker-compose -f docker-compose-migration.yml up -d
```

### Step 4: Verify Fresh Server

```bash
# Test health endpoint
curl http://localhost:9999/health

# Should show:
# "mode": "PostgreSQL + MinIO Only (NO JSON FILES)"
```

### Step 5: Test Data Access (Laptop Dev)

```javascript
// Open DevTools (F12) > Console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then:
1. Go to Settings > Check Connection → "Connected"
2. Add new product → should save to PostgreSQL
3. Refresh page → data should persist
4. Check console → no JSON file errors

---

## What This Achieves

### Before (Current server.js)
```
Request → Check JSON files → Fallback to PostgreSQL
Problem: Old data from JSON files interferes
```

### After (server-postgres-only.js)
```
Request → PostgreSQL ONLY → MinIO for files
Benefit: Clean, no old data interference
```

---

## Database Schema (Auto-Created)

```sql
CREATE TABLE storage (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  timestamp BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storage_timestamp ON storage(timestamp);
```

---

## API Endpoints (Same as Before)

```bash
# GET
GET /api/storage/products

# POST
POST /api/storage/products
{"value": [...], "timestamp": 1707500000000}

# PUT
PUT /api/storage/products
{"value": [...], "timestamp": 1707500000000}

# DELETE
DELETE /api/storage/products

# GET ALL
GET /api/storage/all

# BLOB Upload
POST /api/blob/upload?business=packaging

# BLOB Download
GET /api/blob/download/packaging/fileId

# BLOB Delete
DELETE /api/blob/delete/packaging/fileId
```

---

## Verification Checklist

- [ ] package.json updated with pg and aws-sdk
- [ ] Dockerfile updated to use server-postgres-only.js
- [ ] Docker image rebuilt
- [ ] Services restarted
- [ ] Health check shows: "PostgreSQL + MinIO Only"
- [ ] Database table created
- [ ] Can POST data to PostgreSQL
- [ ] Can GET data from PostgreSQL
- [ ] Can upload files to MinIO
- [ ] Browser cache cleared
- [ ] Settings shows correct server
- [ ] Connection check passes
- [ ] Can add new product
- [ ] Product persists after refresh

---

## Files Created

- `docker/server-postgres-only.js` - New server implementation
- `POSTGRES_ONLY_MODE.md` - Complete documentation
- `SWITCH_TO_POSTGRES_ONLY.md` - This file

---

## Benefits

✅ **Clean separation**
- PostgreSQL for data
- MinIO for files
- No JSON confusion

✅ **Better performance**
- Database queries faster
- Proper indexing
- Connection pooling

✅ **Scalability**
- Can add replicas
- Better backup/restore
- Transaction support

✅ **Security**
- No direct file access
- Database permissions
- Audit trail

---

## Troubleshooting

### Database Connection Error
```bash
# Verify PostgreSQL running
docker ps

# Check connection
psql -h localhost -U trimalaksana -d trimalaksana_db
```

### MinIO Connection Error
```bash
# Verify MinIO running
docker ps

# Test MinIO
curl http://localhost:9000/minio/health/live
```

### Table Not Created
```bash
# Check database logs
docker-compose -f docker-compose-migration.yml logs postgres

# Manually create table
psql -h localhost -U trimalaksana -d trimalaksana_db -c "
CREATE TABLE storage (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  timestamp BIGINT DEFAULT 0
);"
```

---

## Next Steps

1. Update package.json with new dependencies
2. Update Dockerfile to use new server
3. Rebuild Docker image
4. Restart services
5. Verify health check
6. Test data access
7. Clear browser cache
8. Test fresh data sync

---

**Status**: PostgreSQL + MinIO only mode ready to implement ✅

**Recommendation**: This is the cleanest approach for a fresh setup!
