# 🔌 WebSocket Connection - Complete Guide

## 📊 Current Situation

### What's Working ✅
- Fresh Docker services are running on port 9999
- PostgreSQL, MinIO, pgAdmin, Node.js all started
- WebSocket client code is fixed
- Settings page properly sets WebSocket URL
- Tailscale Funnel is configured

### What's Broken ❌
- **Old containers still running** (from previous setup)
- **Tailscale Funnel routing to old server** → 502 errors
- **WebSocket connection failing** → CORS errors
- **Data sync blocked** → Cannot load products/customers

### Root Cause
Multiple containers are running, and Tailscale Funnel is routing to the wrong one (the old broken server instead of the fresh one on port 9999).

---

## 🎯 Solution Overview

### The Problem Chain
```
Old Server Running (Port 8888)
    ↓
Tailscale Funnel Routes to Old Server
    ↓
Old Server Returns 502 Bad Gateway
    ↓
WebSocket Connection Fails
    ↓
CORS Errors in Console
    ↓
Data Sync Blocked
    ↓
App Cannot Load Data
```

### The Fix Chain
```
Stop Old Containers
    ↓
Start Fresh Services (Port 9999)
    ↓
Tailscale Funnel Routes to Fresh Server
    ↓
Fresh Server Returns 200 OK
    ↓
WebSocket Connection Succeeds
    ↓
Data Syncs Automatically
    ↓
App Loads Data Successfully
```

---

## 🚀 Step-by-Step Fix

### STEP 1: Cleanup Old Containers (PC Utama)

**Run on PC Utama (Windows):**
```bash
cd D:\trimalaksanaapps\possgresql\docker

# Stop and remove all containers
docker-compose -f docker-compose-migration.yml down

# Force remove any remaining containers
docker container prune -f

# Verify all containers are gone
docker ps -a
# Should show: CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
# (empty - no containers)
```

**Why this works:**
- `docker-compose down` stops and removes containers defined in the compose file
- `docker container prune -f` removes any orphaned containers
- This ensures only fresh services will run

---

### STEP 2: Start Fresh Services (PC Utama)

**Run on PC Utama (Windows):**
```bash
cd D:\trimalaksanaapps\possgresql\docker

# Start fresh services
docker-compose -f docker-compose-migration.yml up -d

# Wait 30 seconds for services to be ready
timeout /t 30

# Verify all 4 containers are running
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                   STATUS              PORTS
8b2af091e9cb   docker-storage-server   Up 25 seconds       0.0.0.0:9999->8888/tcp
7367c608def9   dpage/pgadmin4:latest   Up 25 seconds       0.0.0.0:5051->80/tcp
c0b8d6249a88   postgres:15-alpine      Up 25 seconds       0.0.0.0:5432->5432/tcp
2d81c3b99a60   minio/minio:latest      Up 25 seconds       0.0.0.0:9000-9001->9000-9001/tcp
```

**Why this works:**
- Fresh services start on port 9999
- PostgreSQL, MinIO, pgAdmin all start
- Tailscale Funnel will now route to the fresh server

---

### STEP 3: Test Endpoints (PC Utama)

**Test local endpoint:**
```bash
curl http://localhost:9999/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2026-02-10T...","services":{"postgres":"connected","minio":"connected"}}
```

**Test Tailscale endpoint:**
```bash
curl https://server-tljp.tail75a421.ts.net/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2026-02-10T...","services":{"postgres":"connected","minio":"connected"}}
```

**NOT 502 error!**

---

### STEP 4: Clear Browser Cache (Laptop Dev)

**Open DevTools (F12) and run:**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Why this works:**
- Clears old cached WebSocket URLs
- Clears old cached data
- Forces fresh connection to new server

---

### STEP 5: Verify Connection (Laptop Dev)

**Go to Settings > Check Connection**
- Should show: ✅ **Connected**

**Check DevTools Console:**
```
[WebSocketClient] 🔌 Initialized with URL: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] 🔌 Attempting connection to: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] ✅ WebSocket connected!
```

**Check DevTools Network > WS tab:**
- Should see: `wss://server-tljp.tail75a421.ts.net/ws`
- Status: Connected ✅

**Check DevTools Network > XHR tab:**
- Should see: `https://server-tljp.tail75a421.ts.net/api/storage/*`
- Status: 200 OK ✅

---

### STEP 6: Test Data Sync (Laptop Dev)

**Go to Packaging > Master > Products:**
1. Add new product (e.g., "TEST-001")
2. Data should appear immediately
3. **Refresh page** → data should still be there ✅

**Go to Packaging > Master > Customers:**
1. Add new customer
2. Data should appear and persist ✅

---

## 🔍 Verification Checklist

### On PC Utama
- [ ] Old containers stopped: `docker ps -a` (empty)
- [ ] Fresh services running: `docker ps` (4 containers)
- [ ] Local endpoint working: `curl http://localhost:9999/health` (200 OK)
- [ ] Tailscale endpoint working: `curl https://server-tljp.tail75a421.ts.net/health` (200 OK)

### On Laptop Dev
- [ ] Browser cache cleared: `localStorage.clear()`
- [ ] Page reloaded: `Ctrl+R`
- [ ] Settings shows Connected: ✅
- [ ] Console shows WebSocket connected: ✅
- [ ] Network shows WS connected: ✅
- [ ] Network shows XHR 200 OK: ✅
- [ ] New product persists after refresh: ✅

---

## 🆘 Troubleshooting

### Still Getting 502 Errors?

**Check 1: Are old containers still running?**
```bash
docker ps -a
# Should show only 4 containers (postgres, minio, pgadmin, storage-server)
# If more, run: docker container prune -f
```

**Check 2: Is Node.js process still running?**
```bash
tasklist | find "node"
# Should show nothing
# If found, run: taskkill /IM node.exe /F
```

**Check 3: Is port 9999 actually listening?**
```bash
netstat -ano | findstr :9999
# Should show: TCP   0.0.0.0:9999   0.0.0.0:0   LISTENING
```

**Check 4: Are services actually running?**
```bash
docker logs docker-storage-server-1
# Should show: Server listening on port 8888
# Should show: Connected to PostgreSQL
# Should show: Connected to MinIO
```

---

### WebSocket Still Not Connecting?

**Check 1: Is WebSocket URL correct?**
```javascript
console.log(localStorage.getItem('websocket_url'));
// Should show: wss://server-tljp.tail75a421.ts.net/ws
// NOT: wss://server-tljp.tail75a421.ts.net:8888/ws (wrong - has port)
```

**Check 2: Is Tailscale connected?**
```bash
tailscale status
# Should show: Connected
# Should show: server-tljp.tail75a421.ts.net as available
```

**Check 3: Clear cache and reload**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

### Tailscale Endpoint Not Responding?

**Check 1: Is Tailscale running?**
```bash
tailscale status
# Should show: Connected
```

**Check 2: Is PC Utama online?**
```bash
tailscale status
# Should show: server-tljp.tail75a421.ts.net as online
```

**Check 3: Restart Tailscale**
```bash
# On Windows, restart Tailscale from system tray
# Or use PowerShell:
Restart-Service Tailscale
```

---

## 📊 Port Mapping Reference

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| PostgreSQL | 5432 | Database | ✅ Running |
| MinIO API | 9000 | File storage | ✅ Running |
| MinIO Console | 9001 | MinIO UI | ✅ Running |
| pgAdmin | 5051 | Database UI | ✅ Running |
| **Old Server** | 8888 | ❌ STOP THIS | ❌ Should be stopped |
| **Fresh Server** | 9999 | ✅ NEW (local) | ✅ Running |
| **Tailscale** | 443 | ✅ NEW (secure) | ✅ Running |

---

## 🔐 Security Notes

### Why Tailscale Funnel?
- ✅ Secure (HTTPS/WSS only)
- ✅ No port conflicts (uses port 443)
- ✅ No firewall configuration needed
- ✅ Works across networks
- ✅ No public IP exposure

### Why PostgreSQL + MinIO?
- ✅ Single source of truth (PostgreSQL)
- ✅ Scalable file storage (MinIO)
- ✅ No JSON file conflicts
- ✅ Real-time sync via WebSocket
- ✅ Production-ready

---

## 📝 Files Involved

### On PC Utama (Windows)
- `docker/docker-compose-migration.yml` - Docker config (port 9999)
- `docker/STOP_OLD_SERVER_NOW.bat` - Stop old server script
- `docker/start-services.bat` - Start fresh services script

### On Laptop Dev
- `src/services/websocket-client.ts` - WebSocket client (✅ fixed)
- `src/pages/Settings/Settings.tsx` - Settings page (✅ fixed)
- `src/services/storage.ts` - Storage service (uses WebSocket)

---

## ⏱️ Expected Timeline

| Step | Time | Action |
|------|------|--------|
| 1 | 30 sec | Stop old containers |
| 2 | 2 min | Start fresh services |
| 3 | 30 sec | Test endpoints |
| 4 | 10 sec | Clear browser cache |
| 5 | 30 sec | Verify connection |
| 6 | 1 min | Test data sync |
| **Total** | **~5 min** | **Complete fix** |

---

## ✨ After This Works

Once WebSocket is connected:
- ✅ All data syncs automatically
- ✅ Products load from PostgreSQL
- ✅ Files stored in MinIO
- ✅ Real-time updates via WebSocket
- ✅ No more 502 errors
- ✅ No more CORS errors
- ✅ Data persists after refresh
- ✅ Multi-device sync works

---

## 🎓 How It Works

### Before (Broken)
```
Laptop Dev
    ↓
WebSocket to wss://server-tljp.tail75a421.ts.net/ws
    ↓
Tailscale Funnel
    ↓
Old Server (502 error)
    ↓
Connection fails ❌
```

### After (Fixed)
```
Laptop Dev
    ↓
WebSocket to wss://server-tljp.tail75a421.ts.net/ws
    ↓
Tailscale Funnel
    ↓
Fresh Server (port 9999)
    ↓
PostgreSQL + MinIO
    ↓
Data syncs ✅
```

---

## 📞 Support

If you're still having issues:

1. **Check logs**: `docker-compose logs`
2. **Check ports**: `netstat -ano | findstr :9999`
3. **Check Tailscale**: `tailscale status`
4. **Restart Docker**: Restart Docker Desktop
5. **Restart Tailscale**: Restart Tailscale service

---

**Status**: 🔴 BLOCKED - Waiting for old containers to be stopped

**Next Action**: Run cleanup commands on PC Utama NOW!

