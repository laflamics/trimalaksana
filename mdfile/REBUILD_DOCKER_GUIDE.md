# Rebuild Docker with PostgreSQL-Only Server

## Current Issue
- WebSocket is connecting to port 8888 (old server with JSON files)
- Fresh server with PostgreSQL is on port 9999
- Data not persisting to PostgreSQL because old server is still running

## What's Happening
1. **Old server (port 8888)**: Uses `server.js` - reads/writes JSON files
2. **Fresh server (port 9999)**: Uses `server-postgres-only.js` - reads/writes PostgreSQL + MinIO
3. **Tailscale Funnel**: Currently routing to port 8888 (old server)

## Solution: 3 Steps

### STEP 1: Rebuild Docker Image
Run this on PC Utama (Windows):
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml build
```

This will:
- Install `pg` and `aws-sdk` npm packages
- Build new Docker image with `server-postgres-only.js`

### STEP 2: Restart Services
```bash
docker-compose -f docker-compose-migration.yml down
docker-compose -f docker-compose-migration.yml up -d
```

This will:
- Stop all old services
- Start fresh services with PostgreSQL-only server
- Container port 8888 is mapped to host ports 8888, 9999, 9998

### STEP 3: Update Tailscale Funnel
```bash
tailscale funnel reset
tailscale funnel --bg 9999
```

This will:
- Stop old Tailscale serve (port 8888)
- Start new Tailscale funnel (port 9999)
- Route `https://server-tljp.tail75a421.ts.net` → `http://127.0.0.1:9999`

## Verification

### Check Services Running
```bash
docker ps
```

Should show:
- `docker-storage-server-1` (port 8888, 9999, 9998)
- `trimalaksana-postgres` (port 5432)
- `trimalaksana-minio` (port 9000, 9001)
- `trimalaksana-pgadmin` (port 5051)

### Test Health Endpoints
```bash
# Old server (port 8888)
curl http://localhost:8888/health

# Fresh server (port 9999)
curl http://localhost:9999/health

# Tailscale Funnel
curl https://server-tljp.tail75a421.ts.net/health
```

### Check Server Logs
```bash
docker logs docker-storage-server-1
```

Should show:
```
[Server] 🚀 Storage server running on port 8888
[Server] 📊 Mode: PostgreSQL + MinIO Only (NO JSON FILES)
[Server] 🔒 All data stored in PostgreSQL and MinIO
```

## Frontend Changes Needed

### Update WebSocket URL to Port 9999
In `src/pages/Settings/Settings.tsx`, change:
- Line ~230: `wsUrl = 'wss://server-tljp.tail75a421.ts.net:8888/ws';`
- To: `wsUrl = 'wss://server-tljp.tail75a421.ts.net:9999/ws';`

Or better: Use Tailscale Funnel without port:
- `wsUrl = 'wss://server-tljp.tail75a421.ts.net/ws';`

### Why?
- Tailscale Funnel automatically routes to the correct port
- No need to hardcode port in WebSocket URL
- Cleaner and more flexible

## Testing Data Persistence

1. Open Laptop Dev app
2. Go to Settings → Server Connection
3. Check connection (should show "Connected")
4. Add a new product in Packaging module
5. Check pgAdmin console:
   - Open http://localhost:5051
   - Login: admin@trimalaksana.com / admin123
   - Navigate to: Servers → trimalaksana → Databases → trimalaksana_db → Schemas → public → Tables → storage
   - Should see new product data in `storage` table

## Troubleshooting

### WebSocket Still Connecting to Port 8888
- Clear browser cache and localStorage
- Restart browser
- Check Settings page - verify WebSocket URL is set to port 9999

### Data Not Persisting
- Check server logs: `docker logs docker-storage-server-1`
- Verify PostgreSQL is running: `docker ps | grep postgres`
- Check pgAdmin console for errors

### Tailscale Funnel Not Working
```bash
# Check current funnel status
tailscale funnel status

# Reset and reconfigure
tailscale funnel reset
tailscale funnel --bg 9999

# Verify
curl https://server-tljp.tail75a421.ts.net/health
```

## Quick Script
Run this on PC Utama to do everything at once:
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml down
docker-compose -f docker-compose-migration.yml build
docker-compose -f docker-compose-migration.yml up -d
timeout /t 30
docker ps
docker logs docker-storage-server-1
tailscale funnel reset
tailscale funnel --bg 9999
```
