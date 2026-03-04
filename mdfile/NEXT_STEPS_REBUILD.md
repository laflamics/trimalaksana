# Next Steps: Rebuild Docker & Fix WebSocket

## What Was Done
✅ Verified AWS SDK is in `docker/package.json`
✅ Updated WebSocket URLs in `src/pages/Settings/Settings.tsx` to use port 9999
✅ Created rebuild script: `docker/rebuild-postgres-only.bat`

## What You Need to Do on PC Utama

### Step 1: Rebuild Docker Image
Open PowerShell and run:
```powershell
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml build
```

Wait for build to complete (2-3 minutes).

### Step 2: Restart Services
```powershell
docker-compose -f docker-compose-migration.yml down
docker-compose -f docker-compose-migration.yml up -d
timeout /t 30
```

### Step 3: Verify Services
```powershell
docker ps
docker logs docker-storage-server-1
```

Should see:
```
[Server] 🚀 Storage server running on port 8888
[Server] 📊 Mode: PostgreSQL + MinIO Only (NO JSON FILES)
```

### Step 4: Update Tailscale Funnel
```powershell
tailscale funnel reset
tailscale funnel --bg 9999
```

### Step 5: Test Endpoints
```powershell
curl http://localhost:9999/health
curl https://server-tljp.tail75a421.ts.net/health
```

Both should return 200 OK with health status.

## What Changed in Frontend

### WebSocket URL Updated
- **Before**: `wss://server-tljp.tail75a421.ts.net:8888/ws`
- **After**: `wss://server-tljp.tail75a421.ts.net:9999/ws`

This ensures WebSocket connects to the fresh PostgreSQL-only server, not the old JSON file server.

## Testing Data Persistence

1. Open Laptop Dev app
2. Go to Settings → Server Connection
3. Click "Check Connection" (should show Connected)
4. Add a new product in Packaging module
5. Verify data in pgAdmin:
   - Open http://localhost:5051
   - Login: admin@trimalaksana.com / admin123
   - Check `storage` table in database

## Port Mapping Reference

| Service | Container Port | Host Port | Purpose |
|---------|---|---|---|
| Storage Server | 8888 | 8888 | Old server (JSON files) |
| Storage Server | 8888 | 9999 | Fresh server (PostgreSQL) |
| PostgreSQL | 5432 | 5432 | Database |
| MinIO | 9000 | 9000 | File storage |
| MinIO Console | 9001 | 9001 | MinIO UI |
| pgAdmin | 80 | 5051 | PostgreSQL UI |

## Troubleshooting

### If WebSocket Still Connects to Port 8888
1. Clear browser cache
2. Clear localStorage: Open DevTools → Application → Local Storage → Clear All
3. Restart browser
4. Check Settings page - verify WebSocket URL shows port 9999

### If Data Not Persisting
1. Check server logs: `docker logs docker-storage-server-1`
2. Verify PostgreSQL running: `docker ps | grep postgres`
3. Check if POST requests are reaching server (look for `[Server] POST /api/storage/...` in logs)

### If Tailscale Funnel Not Working
```powershell
# Check status
tailscale funnel status

# Reset and reconfigure
tailscale funnel reset
tailscale funnel --bg 9999

# Verify
curl https://server-tljp.tail75a421.ts.net/health
```

## Quick Reference Commands

```powershell
# Rebuild everything
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml down
docker-compose -f docker-compose-migration.yml build
docker-compose -f docker-compose-migration.yml up -d

# Check status
docker ps
docker logs docker-storage-server-1

# Update Tailscale
tailscale funnel reset
tailscale funnel --bg 9999

# Test
curl http://localhost:9999/health
curl https://server-tljp.tail75a421.ts.net/health
```

## Expected Result

After these steps:
- ✅ Docker image rebuilt with PostgreSQL-only server
- ✅ Services running on port 9999 (fresh server)
- ✅ WebSocket connecting to port 9999
- ✅ Data persisting to PostgreSQL
- ✅ Tailscale Funnel routing to port 9999
- ✅ No more 502 Bad Gateway errors
- ✅ No more timeout errors on POST requests
