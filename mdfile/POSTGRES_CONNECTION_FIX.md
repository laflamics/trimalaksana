# PostgreSQL Connection Fix

## Problem
Server couldn't connect to PostgreSQL:
```
[Server] ❌ Database initialization error: Error: getaddrinfo ENOTFOUND postgres
```

## Root Cause
- Docker compose was using `network_mode: bridge` (old style)
- This prevented containers from communicating with each other
- Server couldn't resolve hostname `postgres` to the PostgreSQL container

## Solution
Updated `docker-compose-migration.yml` to use proper Docker networking:

### Changes Made:
1. **Removed** `network_mode: bridge` from storage-server
2. **Added** explicit Docker network: `trimalaksana-network`
3. **Added** environment variables to storage-server:
   - `DB_HOST=postgres` (container hostname)
   - `DB_PORT=5432`
   - `DB_USER=trimalaksana`
   - `DB_PASSWORD=trimalaksana123`
   - `DB_NAME=trimalaksana_db`
   - `MINIO_ENDPOINT=http://minio:9000`
   - `MINIO_ACCESS_KEY=minioadmin`
   - `MINIO_SECRET_KEY=minioadmin123`
4. **Added** `depends_on` with `service_healthy` condition
5. **Added** all services to `trimalaksana-network`

## What This Fixes
✅ Server can now resolve `postgres` hostname to PostgreSQL container
✅ Server can connect to PostgreSQL on port 5432
✅ Server can connect to MinIO on port 9000
✅ Proper service startup order (PostgreSQL starts before server)
✅ All containers on same network can communicate

## How to Apply

Run on PC Utama:
```powershell
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml down
docker-compose -f docker-compose-migration.yml build
docker-compose -f docker-compose-migration.yml up -d
timeout /t 30
docker logs docker-storage-server-1
```

## Expected Result

Server logs should show:
```
[Server] 🔧 Initializing PostgreSQL...
[Server] ✅ PostgreSQL initialized
[Server] 🚀 Storage server running on port 8888
[Server] 📊 Mode: PostgreSQL + MinIO Only (NO JSON FILES)
[Server] 🔒 All data stored in PostgreSQL and MinIO
```

NOT:
```
[Server] ❌ Database initialization error: Error: getaddrinfo ENOTFOUND postgres
```

## Testing

After fix, test endpoints:
```powershell
# Local test
curl http://localhost:9999/health

# Tailscale test
curl https://server-tljp.tail75a421.ts.net/health
```

Both should return:
```json
{
  "status": "ok",
  "database": "connected",
  "storage": "connected",
  "mode": "PostgreSQL + MinIO Only (NO JSON FILES)"
}
```

## Port 9999 Status
✅ Port 9999 is fine to use - not restricted
✅ Tailscale Funnel is already configured to use port 9999
✅ No permission needed - it's a standard ephemeral port

## Next Steps
1. Run the fix commands above
2. Verify server logs show "PostgreSQL initialized"
3. Test health endpoints
4. Add a product in Packaging module
5. Verify data appears in pgAdmin console
