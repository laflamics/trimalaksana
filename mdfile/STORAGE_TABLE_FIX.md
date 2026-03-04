# Storage Table Fix

## Problem
Server logs show:
```
[Server] ❌ GET error: error: relation "storage" does not exist
```

And health check shows:
```
"storage": "disconnected"
```

## Root Cause
1. The `init-db.sql` file didn't have the `storage` table definition
2. PostgreSQL initialization only created module-specific tables (packaging_products, etc.)
3. Server needs a generic `storage` table for key-value storage

## Solution
Updated two files:

### 1. `docker/init-db.sql`
Added the `storage` table at the end:
```sql
CREATE TABLE IF NOT EXISTS storage (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  timestamp BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_timestamp ON storage(timestamp);
```

### 2. `docker/server-postgres-only.js`
Enhanced initialization to:
- Create storage table if not exists
- Create MinIO buckets on startup
- Handle MinIO errors gracefully (non-fatal)

## How to Apply

Run on PC Utama:
```powershell
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml down
docker volume rm docker_postgres_data
docker-compose -f docker-compose-migration.yml build
docker-compose -f docker-compose-migration.yml up -d
timeout /t 30
docker logs docker-storage-server-1
```

Or use the script:
```powershell
.\recreate-db.bat
```

## Expected Result

Server logs should show:
```
[Server] 🔧 Initializing PostgreSQL...
[Server] ✅ PostgreSQL initialized
[Server] 🔧 Initializing MinIO...
[Server] ✅ Created bucket: trimalaksana-packaging
[Server] ✅ Created bucket: trimalaksana-general-trading
[Server] ✅ Created bucket: trimalaksana-trucking
[Server] ✅ MinIO initialized
[Server] 🚀 Storage server running on port 8888
[Server] 📊 Mode: PostgreSQL + MinIO Only (NO JSON FILES)
[Server] 🔒 All data stored in PostgreSQL and MinIO
```

Health check should show:
```json
{
  "status": "ok",
  "database": "connected",
  "storage": "connected",
  "mode": "PostgreSQL + MinIO Only (NO JSON FILES)"
}
```

## Testing

After fix:
```powershell
# Test health
curl http://localhost:9999/health

# Should see both "database":"connected" and "storage":"connected"
```

Then test data persistence:
1. Open Laptop Dev app
2. Add a new product in Packaging module
3. Check pgAdmin:
   - Open http://localhost:5051
   - Login: admin@trimalaksana.com / admin123
   - Navigate to: Servers → trimalaksana → Databases → trimalaksana_db → Schemas → public → Tables → storage
   - Should see new product data

## What Changed

| File | Change |
|------|--------|
| `docker/init-db.sql` | Added `storage` table definition |
| `docker/server-postgres-only.js` | Added MinIO bucket initialization |
| `docker/recreate-db.bat` | New script to recreate database |

## Next Steps

1. Run the recreate-db.bat script
2. Verify server logs show "PostgreSQL initialized" and "MinIO initialized"
3. Test health endpoint
4. Test data persistence by adding a product
5. Verify data in pgAdmin console
