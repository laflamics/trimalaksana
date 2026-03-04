# CRITICAL FIX - Old Server Still Running

## Problem Identified

The errors show:
- ❌ `WebSocket connection to 'wss://server-tljp.tail75a421.ts.net/ws' failed`
- ❌ `GET https://server-tljp.tail75a421.ts.net/api/storage/products net::ERR_FAILED 502 (Bad Gateway)`
- ❌ `CORS policy: No 'Access-Control-Allow-Origin' header`

**This means**: The old server is still running and responding with 502 errors!

---

## Root Cause

The **old auto-start service** on PC Utama is still running and interfering with the fresh setup.

---

## Immediate Fix (PC Utama)

### Option 1: Kill Old Node.js Process (Quick)
```bash
taskkill /IM node.exe /F
```

Then restart fresh services:
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml restart storage-server
```

### Option 2: Disable Task Scheduler Auto-Start (Permanent)
1. Open Task Scheduler (taskschd.msc)
2. Look for tasks with "trimalaksana" or "storage" in name
3. Right-click and select "Disable"
4. Restart PC

### Option 3: Run Diagnostic Script
```bash
cd D:\trimalaksanaapps\possgresql\docker
diagnose-server-issue.bat
```

This will show:
- Running Node.js processes
- Docker containers status
- Task Scheduler tasks
- Server logs

---

## Verification Steps (PC Utama)

### Step 1: Kill Old Process
```bash
taskkill /IM node.exe /F
```

### Step 2: Verify Only Docker Services Running
```bash
docker ps
```

Expected:
```
NAME                      IMAGE                   STATUS
trimalaksana-postgres     postgres:15-alpine      Up (healthy)
trimalaksana-minio        minio/minio:latest      Up (healthy)
trimalaksana-pgadmin      dpage/pgadmin4:latest   Up
docker-storage-server-1   docker-storage-server   Up
```

### Step 3: Restart Fresh Server
```bash
docker-compose -f docker-compose-migration.yml restart storage-server
```

### Step 4: Test Fresh Server
```bash
# Wait 5 seconds for server to start
timeout /t 5

# Test health endpoint
curl http://localhost:8888/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Step 5: Test Tailscale Endpoint
```bash
curl https://server-tljp.tail75a421.ts.net/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

If you get 502 error, the old server is still running!

---

## After Fix (Laptop Dev)

### Step 1: Clear Browser Cache
Open DevTools (F12) and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Step 2: Test Connection
Go to Settings page:
- Click "Check Connection"
- Should show: "Connected" ✅

### Step 3: Check Console
Open DevTools (F12) > Console:
- Should see: `[WebSocketClient] ✅ WebSocket connected!`
- Should NOT see: `502 (Bad Gateway)`

### Step 4: Test Fresh Data Sync
1. Go to Packaging > Master > Products
2. Add new product
3. Data should appear AND PERSIST
4. Refresh page → data should still be there

---

## Troubleshooting

### Still Getting 502 Errors?
1. Check if old process is still running: `tasklist /FI "IMAGENAME eq node.exe"`
2. Kill it: `taskkill /IM node.exe /F`
3. Check Task Scheduler: `schtasks /query /FO LIST | find /I "trimalaksana"`
4. Disable any old tasks in taskschd.msc
5. Restart PC if needed

### WebSocket Still Failing?
1. Verify Tailscale is running: `tailscale status`
2. Test endpoint: `curl https://server-tljp.tail75a421.ts.net/health`
3. If 502, old server is still running
4. Check docker logs: `docker-compose -f docker-compose-migration.yml logs storage-server`

### CORS Errors?
1. These are caused by 502 errors from old server
2. Fix the 502 error first
3. CORS errors should disappear

---

## Key Points

✅ **Old server must be completely stopped**
- Kill Node.js process: `taskkill /IM node.exe /F`
- Disable Task Scheduler auto-start
- Restart PC if needed

✅ **Fresh Docker services must be running**
- 4 containers: postgres, minio, pgadmin, storage-server
- All should be "Up" and healthy

✅ **Tailscale endpoint must respond**
- Test: `curl https://server-tljp.tail75a421.ts.net/health`
- Should return 200 OK with JSON response

✅ **Browser cache must be cleared**
- localStorage.clear()
- sessionStorage.clear()
- Reload page

---

## Verification Checklist

- [ ] Old Node.js process killed
- [ ] Task Scheduler auto-start disabled
- [ ] 4 Docker containers running
- [ ] Fresh server health check passes
- [ ] Tailscale endpoint responds (no 502)
- [ ] Browser cache cleared
- [ ] Settings shows correct server URL
- [ ] Connection check passes
- [ ] WebSocket connected (no errors)
- [ ] Can add new product
- [ ] Product persists after refresh

---

**Status**: Critical issue identified - old server still running ⚠️

**Action**: Kill old process and disable auto-start on PC Utama NOW!
