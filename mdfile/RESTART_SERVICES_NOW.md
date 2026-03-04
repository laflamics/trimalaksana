# Restart Services - New Port Configuration

## What Changed
✅ Updated `docker-compose-migration.yml` to use ports **9999/9998** instead of 8888/8080

This allows both old and new servers to run without port conflicts!

---

## PC Utama - Restart Services

### Step 1: Stop Current Services
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml down
```

### Step 2: Start Fresh Services on New Ports
```bash
docker-compose -f docker-compose-migration.yml up -d
```

### Step 3: Verify Fresh Server on Port 9999
```bash
curl http://localhost:9999/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Step 4: Verify Tailscale Endpoint
```bash
curl https://server-tljp.tail75a421.ts.net/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

If you get 502, wait 10 seconds and try again (server might be starting)

### Step 5: Verify All 4 Containers Running
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

---

## Laptop Dev - Clear Cache and Test

### Step 1: Clear Browser Cache
Open DevTools (F12) and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Step 2: Go to Settings
- Server URL should show: `server-tljp.tail75a421.ts.net`
- Click "Check Connection"
- Should show: "Connected" ✅

### Step 3: Check Console
Open DevTools (F12) > Console:
- Should see: `[WebSocketClient] ✅ WebSocket connected!`
- Should NOT see: `502 (Bad Gateway)`
- Should NOT see: `CORS policy` errors

### Step 4: Test Fresh Data Sync
1. Go to Packaging > Master > Products
2. Add new product
3. Data should appear AND PERSIST
4. Refresh page → data should still be there

---

## Port Mapping

| Service | Old Port | New Port | Purpose |
|---------|----------|----------|---------|
| Fresh Server | 8888 | 9999 | Main API & WebSocket |
| Fresh Server Alt | 8080 | 9998 | Alternate port |
| Old Server | 8888 | 8888 | Still running (no conflict) |

---

## Why This Works

✅ **No port conflicts**
- Old server: port 8888
- Fresh server: port 9999
- Both can run simultaneously

✅ **Tailscale routes correctly**
- Tailscale Funnel automatically routes to fresh server
- Laptop Dev doesn't need to know about port 9999
- Just uses: wss://server-tljp.tail75a421.ts.net/ws

✅ **No code changes needed**
- Laptop Dev code unchanged
- Just clear cache and reload
- Everything works automatically

---

## Troubleshooting

### Fresh Server Not Responding on 9999?
```bash
# Check if container is running
docker ps

# Check logs
docker-compose -f docker-compose-migration.yml logs storage-server

# Wait 10 seconds for startup
timeout /t 10

# Try again
curl http://localhost:9999/health
```

### Tailscale Still Returning 502?
```bash
# Wait for fresh server to fully start
timeout /t 15

# Test fresh server directly
curl http://localhost:9999/health

# If that works, test Tailscale
curl https://server-tljp.tail75a421.ts.net/health

# If Tailscale still 502, restart Tailscale
tailscale down
tailscale up
```

### Laptop Dev Still Getting Errors?
1. Clear browser cache: `localStorage.clear()`
2. Reload page: `Ctrl+R`
3. Wait 5 seconds
4. Go to Settings > Check Connection
5. Check console for errors

---

## Quick Checklist

- [ ] Stopped old services: `docker-compose down`
- [ ] Started fresh services: `docker-compose up -d`
- [ ] Fresh server responds on 9999: `curl http://localhost:9999/health`
- [ ] Tailscale endpoint works: `curl https://server-tljp.tail75a421.ts.net/health`
- [ ] Browser cache cleared: `localStorage.clear()`
- [ ] Settings shows correct server URL
- [ ] Connection check passes
- [ ] WebSocket connected (no errors)
- [ ] Can add new product
- [ ] Product persists after refresh

---

**Status**: Ready to restart services on new ports! ✅

**Next**: Run the commands above on PC Utama, then test on Laptop Dev.
