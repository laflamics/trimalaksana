# Tailscale Fresh Setup Plan

## Problem
- Old server is auto-starting on PC Utama
- Tailscale Funnel is pointing to the old server
- Need to make Tailscale point to the NEW fresh server

## Solution

### Architecture
```
Laptop Dev (Linux)
    ↓ (wss://)
Tailscale Funnel (server-tljp.tail75a421.ts.net)
    ↓
PC Utama (Windows) - NEW Fresh Server
    ├─ PostgreSQL (empty database)
    ├─ MinIO (empty storage)
    ├─ pgAdmin
    └─ Node.js (port 8888)
```

### Step 1: Stop Old Auto-Start Service (PC Utama)

**Option A: Kill old Node.js process**
```bash
taskkill /IM node.exe /F
```

**Option B: Disable Task Scheduler auto-start**
1. Open Task Scheduler (taskschd.msc)
2. Look for tasks with "trimalaksana" or "storage" in name
3. Right-click and select "Disable"

Or run the script:
```bash
disable-old-autostart.bat
```

### Step 2: Verify Only Fresh Services Running (PC Utama)

```bash
docker ps
```

Expected output:
```
NAME                      IMAGE                   STATUS
trimalaksana-postgres     postgres:15-alpine      Up (healthy)
trimalaksana-minio        minio/minio:latest      Up (healthy)
trimalaksana-pgadmin      dpage/pgadmin4:latest   Up
docker-storage-server-1   docker-storage-server   Up
```

### Step 3: Verify Tailscale Points to Fresh Server

Test the Tailscale endpoint:
```bash
curl https://server-tljp.tail75a421.ts.net/health
```

Should return:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Step 4: Clear Browser Cache (Laptop Dev)

Open DevTools (F12) and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Step 5: Test Fresh Data Sync (Laptop Dev)

1. Go to Settings page
2. Server URL should show: `server-tljp.tail75a421.ts.net`
3. Click "Check Connection" → should show "Connected"
4. Go to Packaging > Master > Products
5. Add a new product
6. Data should appear AND PERSIST
7. Refresh page → data should still be there

## Why Tailscale is Better

✅ **Advantages:**
- Already set up and working
- Secure encrypted connection (wss://)
- No port conflicts
- Works from anywhere (not just local network)
- Avoids interference from old auto-start services
- Single endpoint for all clients

❌ **Local IP disadvantages:**
- Conflicts with old auto-start services
- Only works on local network
- Port conflicts if old server is running
- Harder to manage multiple servers

## Files Updated

✅ `src/services/websocket-client.ts`
- Uses Tailscale Funnel: `wss://server-tljp.tail75a421.ts.net/ws`
- Falls back to HTTPS: `https://server-tljp.tail75a421.ts.net`

✅ `src/pages/Settings/Settings.tsx`
- Defaults to: `server-tljp.tail75a421.ts.net`
- Uses HTTPS for Tailscale

## Verification Checklist

- [ ] Old auto-start service disabled
- [ ] Only 4 fresh containers running
- [ ] Tailscale endpoint responds to health check
- [ ] Browser cache cleared
- [ ] Settings shows: `server-tljp.tail75a421.ts.net`
- [ ] Connection check passes
- [ ] Can add new product
- [ ] Product persists after refresh
- [ ] Console shows: `wss://server-tljp.tail75a421.ts.net/ws`

## Troubleshooting

### Tailscale endpoint returns 502
- Old server is still running
- Kill old Node.js: `taskkill /IM node.exe /F`
- Disable Task Scheduler auto-start

### Connection timeout
- Verify Tailscale is running on both machines
- Check: `tailscale status`
- Restart Tailscale if needed

### Data still disappears
- Check browser console for errors
- Verify PostgreSQL is empty (fresh setup)
- Check server logs: `docker-compose -f docker-compose-migration.yml logs storage-server`

---

**Status**: Ready to disable old auto-start and test fresh setup ✅
