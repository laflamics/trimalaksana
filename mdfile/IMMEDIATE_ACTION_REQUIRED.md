# 🚨 IMMEDIATE ACTION REQUIRED - WebSocket Connection Fix

## Current Problem
- **Old server still running** on PC Utama (port 8888)
- **Tailscale Funnel routing to old server** → 502 Bad Gateway errors
- **WebSocket connection failing** → CORS errors
- **All data sync blocked** → Cannot load products, customers, etc.

## Root Cause
The old Node.js server is still running and responding with 502 errors. Tailscale Funnel is routing to this broken server instead of the fresh one on port 9999.

---

## ✅ SOLUTION - 3 Simple Steps

### STEP 1: Stop Old Server (PC Utama - Windows)
Run this script on PC Utama:
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker/STOP_OLD_SERVER_NOW.bat
```

**What it does:**
- Kills all Node.js processes
- Stops all Docker containers
- Removes all containers
- Verifies cleanup

**Expected output:**
```
[1/5] Killing all Node.js processes...
[2/5] Stopping all Docker containers...
[3/5] Removing all containers...
[4/5] Verifying no containers running...
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
(empty - no containers)
```

---

### STEP 2: Start Fresh Services (PC Utama - Windows)
Run this script on PC Utama:
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker/start-services.bat
```

**What it does:**
- Starts PostgreSQL (port 5432)
- Starts MinIO (port 9000, 9001)
- Starts pgAdmin (port 5051)
- Starts Node.js server (port 9999)
- Waits 30 seconds for services to be ready
- Tests endpoints

**Expected output:**
```
[STEP 5/7] Starting fresh services...
✓ Services starting...
Waiting for services to be ready (30 seconds)...

[STEP 6/7] Checking service status...
NAME                    COMMAND                  SERVICE             STATUS      PORTS
trimalaksana-postgres   "docker-entrypoint.s…"   postgres            Up 25s      0.0.0.0:5432->5432/tcp
trimalaksana-minio      "/usr/bin/docker-ent…"   minio               Up 25s      0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp
trimalaksana-pgadmin    "/entrypoint.sh"         pgadmin             Up 25s      0.0.0.0:5051->80/tcp
storage-server          "docker-entrypoint.s…"   storage-server      Up 25s      0.0.0.0:9999->8888/tcp, 0.0.0.0:9998->8888/tcp

[STEP 7/7] Testing services...
✓ Node.js server is ready on port 9999
✓ Tailscale endpoint is ready
```

---

### STEP 3: Clear Browser Cache & Test (Laptop Dev)
Open DevTools (F12) and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Then go to Settings > Check Connection**
- Should show: ✅ **Connected**
- Console should show: `[WebSocketClient] ✅ WebSocket connected!`

---

## 🔍 Verification Checklist

### On PC Utama (Windows)
After running `start-services.bat`, verify:

```bash
# Check all containers running
docker ps
# Should show 4 containers: postgres, minio, pgadmin, storage-server

# Test Node.js on port 9999
curl http://localhost:9999/health
# Should return: {"status":"ok",...}

# Test Tailscale endpoint
curl https://server-tljp.tail75a421.ts.net/health
# Should return: {"status":"ok",...}
# NOT 502 error
```

### On Laptop Dev (Browser)
After clearing cache:

```javascript
// Check WebSocket URL
console.log(localStorage.getItem('websocket_url'));
// Should show: wss://server-tljp.tail75a421.ts.net/ws

// Check connection status
console.log(localStorage.getItem('websocket_enabled'));
// Should show: true
```

**Open DevTools > Network > WS tab:**
- Should see connection to: `wss://server-tljp.tail75a421.ts.net/ws`
- Status: Connected ✅

**Open DevTools > Network > XHR tab:**
- Should see requests to: `https://server-tljp.tail75a421.ts.net/api/storage/*`
- Status: 200 OK ✅

---

## 🧪 Test Fresh Data Sync

1. Go to **Packaging > Master > Products**
2. Add new product (e.g., "TEST-001")
3. Data should appear immediately
4. **Refresh page** → data should still be there ✅
5. Go to **Packaging > Master > Customers**
6. Add new customer
7. Data should appear and persist ✅

---

## 📊 Port Mapping Summary

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| MinIO API | 9000 | File storage |
| MinIO Console | 9001 | MinIO UI |
| pgAdmin | 5051 | Database UI |
| **Old Server** | 8888 | ❌ STOP THIS |
| **Fresh Server** | 9999 | ✅ NEW (local) |
| **Tailscale** | 443 | ✅ NEW (secure) |

---

## 🆘 Troubleshooting

### Still Getting 502 Errors?
1. Verify old server is stopped: `docker ps` (should show 4 containers, not 5)
2. Check if Node.js process still running: `tasklist | find "node"`
3. If found, kill it: `taskkill /IM node.exe /F`
4. Restart services: `docker-compose -f docker-compose-migration.yml up -d`

### WebSocket Still Not Connecting?
1. Clear browser cache: `localStorage.clear()`
2. Reload page: `Ctrl+R`
3. Check Tailscale status: `tailscale status`
4. Verify Tailscale is connected to network

### Tailscale Endpoint Not Responding?
1. Check Tailscale is running: `tailscale status`
2. Check PC Utama is online in Tailscale network
3. Verify Funnel is active: `tailscale funnel status`
4. Restart Tailscale if needed

---

## 📝 Files Involved

**On PC Utama:**
- `docker/STOP_OLD_SERVER_NOW.bat` - Stop old server
- `docker/start-services.bat` - Start fresh services
- `docker/docker-compose-migration.yml` - Docker config (port 9999)

**On Laptop Dev:**
- `src/services/websocket-client.ts` - WebSocket client (already fixed ✅)
- `src/pages/Settings/Settings.tsx` - Settings page (already fixed ✅)

---

## ⏱️ Expected Timeline

1. **Stop old server**: 30 seconds
2. **Start fresh services**: 2 minutes
3. **Clear browser cache**: 10 seconds
4. **Test connection**: 30 seconds
5. **Total**: ~3 minutes

---

## ✨ After This Works

Once WebSocket is connected:
- ✅ All data syncs automatically
- ✅ Products load from PostgreSQL
- ✅ Files stored in MinIO
- ✅ Real-time updates via WebSocket
- ✅ No more 502 errors
- ✅ No more CORS errors

---

**Status**: 🔴 BLOCKED - Waiting for old server to be stopped

**Next Action**: Run `docker/STOP_OLD_SERVER_NOW.bat` on PC Utama NOW!

