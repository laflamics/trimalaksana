# PostgreSQL + MinIO Only Mode

## Overview

Created a new server implementation that **ONLY uses PostgreSQL and MinIO**:

✅ **ALLOWED**:
- Read/write from PostgreSQL database
- Upload/download files from MinIO

❌ **NOT ALLOWED**:
- Read/write from JSON files
- Access to old data
- Fallback to file system

---

## Why This Matters

### Old Approach (Current server.js)
```
Request → Check JSON files first → Fallback to PostgreSQL
```
Problem: Old data from JSON files interferes with fresh setup

### New Approach (server-postgres-only.js)
```
Request → PostgreSQL ONLY → MinIO for files
```
Benefit: Clean separation, no old data interference

---

## How to Switch

### Option 1: Use New Server (Recommended)

#### Step 1: Update Dockerfile
```dockerfile
# Change from:
CMD ["node", "server.js"]

# To:
CMD ["node", "server-postgres-only.js"]
```

#### Step 2: Install Dependencies
The new server needs:
```bash
npm install pg aws-sdk
```

Update `docker/package.json`:
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

#### Step 3: Restart Services
```bash
cd D:\trimalaksanaapps\possgresql\docker

# Rebuild image with new dependencies
docker-compose -f docker-compose-migration.yml build

# Restart services
docker-compose -f docker-compose-migration.yml down
docker-compose -f docker-compose-migration.yml up -d
```

#### Step 4: Verify
```bash
# Test health endpoint
curl http://localhost:9999/health

# Should show:
# {"status":"ok",...,"mode":"PostgreSQL + MinIO Only (NO JSON FILES)"}
```

---

### Option 2: Keep Current Server (Hybrid Mode)

If you want to keep the current server.js but disable JSON file access:

#### Modify server.js
Replace the `getFilePath()` function to throw error:

```javascript
function getFilePath(key) {
  throw new Error('JSON file access is disabled. Use PostgreSQL only.');
}
```

This will force all requests to use PostgreSQL.

---

## Database Schema

The new server creates this table automatically:

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

## API Endpoints

### GET - Retrieve from PostgreSQL
```bash
GET /api/storage/:key

# Example:
curl http://localhost:9999/api/storage/products

# Response:
{
  "value": [...],
  "timestamp": 1707500000000
}
```

### POST - Save to PostgreSQL
```bash
POST /api/storage/:key
Content-Type: application/json

{
  "value": [...],
  "timestamp": 1707500000000
}

# Response:
{
  "success": true,
  "timestamp": 1707500000000
}
```

### PUT - Update in PostgreSQL
```bash
PUT /api/storage/:key
Content-Type: application/json

{
  "value": [...],
  "timestamp": 1707500000000
}
```

### DELETE - Remove from PostgreSQL
```bash
DELETE /api/storage/:key

# Response:
{
  "success": true
}
```

### GET ALL - Retrieve all from PostgreSQL
```bash
GET /api/storage/all

# Response:
{
  "data": {
    "products": [...],
    "customers": [...]
  },
  "timestamps": {
    "products": 1707500000000,
    "customers": 1707500000000
  },
  "serverTime": 1707500000000
}
```

---

## File Storage (MinIO)

### Upload File
```bash
POST /api/blob/upload?business=packaging
Content-Type: multipart/form-data

file: <binary file>

# Response:
{
  "success": true,
  "fileId": "1707500000000_document.pdf",
  "fileName": "document.pdf",
  "size": 102400,
  "business": "packaging"
}
```

### Download File
```bash
GET /api/blob/download/packaging/1707500000000_document.pdf

# Returns: binary file
```

### Delete File
```bash
DELETE /api/blob/delete/packaging/1707500000000_document.pdf

# Response:
{
  "success": true
}
```

---

## Health Check

```bash
curl http://localhost:9999/health

# Response:
{
  "status": "ok",
  "timestamp": "2026-02-10T...",
  "uptime": 123.456,
  "database": "connected",
  "storage": "connected",
  "mode": "PostgreSQL + MinIO Only (NO JSON FILES)",
  "endpoints": {...}
}
```

---

## Environment Variables

```bash
# PostgreSQL
DB_USER=trimalaksana
DB_PASSWORD=trimalaksana123
DB_HOST=postgres
DB_PORT=5432
DB_NAME=trimalaksana_db

# MinIO
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# Server
PORT=8888
NODE_ENV=production
```

---

## Verification Checklist

- [ ] New server-postgres-only.js created
- [ ] Dependencies added to package.json (pg, aws-sdk)
- [ ] Dockerfile updated to use new server
- [ ] Docker image rebuilt
- [ ] Services restarted
- [ ] Health check passes
- [ ] Database table created
- [ ] Can POST data to PostgreSQL
- [ ] Can GET data from PostgreSQL
- [ ] Can upload files to MinIO
- [ ] Can download files from MinIO
- [ ] No JSON file access allowed

---

## Migration Path

### From Old Server to New Server

1. **Backup old data** (optional)
   ```bash
   # Export PostgreSQL
   pg_dump -h localhost -U trimalaksana trimalaksana_db > backup.sql
   ```

2. **Switch to new server**
   - Update Dockerfile
   - Rebuild image
   - Restart services

3. **Migrate data** (if needed)
   ```bash
   # Import old JSON files to PostgreSQL
   # (Custom script needed)
   ```

4. **Test thoroughly**
   - Verify all data accessible
   - Test file uploads/downloads
   - Check WebSocket sync

---

## Advantages

✅ **Clean separation**
- PostgreSQL for structured data
- MinIO for files
- No JSON file confusion

✅ **Better performance**
- Database queries faster than file I/O
- Proper indexing support
- Connection pooling

✅ **Scalability**
- Can add replicas
- Better backup/restore
- Transaction support

✅ **Security**
- No direct file access
- Database-level permissions
- Audit trail support

---

## Disadvantages

❌ **Requires PostgreSQL**
- Can't run without database
- More complex setup

❌ **No file fallback**
- Must have working database
- No graceful degradation

---

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Fix:
1. Verify PostgreSQL is running: `docker ps`
2. Check connection string in environment variables
3. Verify database exists: `psql -h localhost -U trimalaksana -d trimalaksana_db`

### MinIO Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:9000
```

Fix:
1. Verify MinIO is running: `docker ps`
2. Check MinIO endpoint in environment variables
3. Test MinIO: `curl http://localhost:9000/minio/health/live`

### Table Not Created
```
Error: relation "storage" does not exist
```

Fix:
1. Check database logs: `docker-compose logs postgres`
2. Manually create table:
   ```sql
   CREATE TABLE storage (
     key VARCHAR(255) PRIMARY KEY,
     value JSONB NOT NULL,
     timestamp BIGINT DEFAULT 0
   );
   ```

---

## Next Steps

1. **Decide**: Use new server or modify current server?
2. **Implement**: Update Dockerfile and dependencies
3. **Test**: Verify PostgreSQL + MinIO only mode works
4. **Deploy**: Restart services with new configuration
5. **Verify**: Test all endpoints and file operations

---

**Status**: PostgreSQL + MinIO only mode ready ✅

**Recommendation**: Use new server-postgres-only.js for clean separation and better performance.
