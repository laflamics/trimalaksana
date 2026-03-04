# Port Change Guide - Run Both Servers Simultaneously

## What Changed

Updated `docker-compose-migration.yml` to use **different ports** so both old and new servers can run without conflict:

### Old Ports (Conflict)
```yaml
ports:
  - "0.0.0.0:8888:8888"    # Old server uses this
  - "0.0.0.0:8080:8888"
```

### New Ports (No Conflict)
```yaml
ports:
  - "0.0.0.0:9999:8888"    # Fresh server uses this
  - "0.0.0.0:9998:8888"
```

---

## Why This Works

### Local Network (PC Utama)
```
Old Server:   localhost:8888
Fresh Server: localhost:9999
```

Both can run simultaneously without port conflicts!

### Tailscale Funnel (External)
```
wss://server-tljp.tail75a421.ts.net/ws
```

Tailscale Funnel automatically routes to the **correct container** based on the service name, not the port!

---

## Setup Steps (PC Utama)

### Step 1: Update docker-compose
✅ Already done - ports changed to 9999/9998

### Step 2: Restart Fresh Services
```bash
cd D:\trimalaksanaapps\possgresql\docker

# Stop old services (if running)
docker-compose -f docker-compose-migration.yml down

# Start fresh services on new ports
docker-compose -f docker-compose-migration.yml up -d
```

### Step 3: Verify Fresh Server on Port 9999
```bash
# Test fresh server on new port
curl http://localhost:9999/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}
```

### Step 4: Verify Old Server Still on Port 8888
```bash
# Test old server on old port
curl http://localhost:8888/health

# If it responds, old server is still running
# If it doesn't respond, old server is stopped
```

### Step 5: Verify Tailscale Routes to Fresh Server
```bash
# Test Tailscale endpoint
curl https://server-tljp.tail75a421.ts.net/health

# Should return fresh server response (not 502)
```

---

## How Tailscale Routing Works

### Docker Network
```
┌─────────────────────────────────────────┐
│ Docker Network (bridge)                 │
│                                         │
│  storage-server (container)             │
│  ├─ Internal: 8888                      │
│  ├─ External: 9999 (host port)          │
│  └─ Tailscale: routes to container      │
│                                         │
└─────────────────────────────────────────┘
```

### Tailscale Funnel Routing
```
Laptop Dev
  ↓ (wss://)
Tailscale Funnel (server-tljp.tail75a421.ts.net)
  ↓
PC Utama (Tailscale Client)
  ↓
Docker Network
  ↓
storage-server:8888 (container internal port)
  ↓
Responds to Laptop Dev
```

**Key Point**: Tailscale routes to the **container**, not the host port!

---

## Laptop Dev - No Changes Needed

### Why?
- Laptop Dev connects via **Tailscale Funnel** (wss://server-tljp.tail75a421.ts.net)
- Tailscale automatically routes to the correct container
- Port 9999 is only visible on PC Utama local network
- Laptop Dev doesn't need to know about port 9999

### Verification (Laptop Dev)
```javascript
// Open DevTools (F12) > Console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then:
1. Go to Settings > Check Connection → should show "Connected"
2. Console should show: `[WebSocketClient] ✅ WebSocket connected!`
3. No 502 errors
4. No CORS errors

---

## Port Mapping Summary

| Service | Internal Port | Host Port (Old) | Host Port (New) | Tailscale |
|---------|---------------|-----------------|-----------------|-----------|
| storage-server | 8888 | 8888 | 9999 | ✅ Routes to 8888 |
| postgres | 5432 | 5432 | 5432 | - |
| minio | 9000/9001 | 9000/9001 | 9000/9001 | - |
| pgadmin | 80 | 5051 | 5051 | - |

---

## Access Points After Change

### PC Utama (Local)
```
Old Server:   http://localhost:8888
Fresh Server: http://localhost:9999
PostgreSQL:   localhost:5432
MinIO API:    http://localhost:9000
MinIO Console: http://localhost:9001
pgAdmin:      http://localhost:5051
```

### Laptop Dev (External)
```
Fresh Server: wss://server-tljp.tail75a421.ts.net/ws
Fresh Server: https://server-tljp.tail75a421.ts.net/api/storage/*
```

### From Laptop Dev (Local Network)
```
Fresh Server: http://10.1.1.35:9999
```

---

## Verification Checklist

### PC Utama
- [ ] Fresh services started: `docker ps`
- [ ] Fresh server responds on 9999: `curl http://localhost:9999/health`
- [ ] Old server still on 8888: `curl http://localhost:8888/health`
- [ ] Tailscale endpoint works: `curl https://server-tljp.tail75a421.ts.net/health`
- [ ] No 502 errors from Tailscale

### Laptop Dev
- [ ] Browser cache cleared
- [ ] Settings shows: `server-tljp.tail75a421.ts.net`
- [ ] Connection check passes
- [ ] WebSocket connected (no errors)
- [ ] Can add new product
- [ ] Product persists after refresh

---

## Troubleshooting

### Still Getting 502 Errors?
1. Verify fresh server is running: `docker ps`
2. Check fresh server logs: `docker-compose -f docker-compose-migration.yml logs storage-server`
3. Test fresh server directly: `curl http://localhost:9999/health`
4. If 9999 works but Tailscale doesn't, restart Tailscale

### Tailscale Not Routing Correctly?
1. Check Tailscale status: `tailscale status`
2. Verify Tailscale is running on both machines
3. Restart Tailscale if needed
4. Test endpoint: `curl https://server-tljp.tail75a421.ts.net/health`

### Old Server Interfering?
1. Old server is on port 8888 (different from fresh 9999)
2. They won't conflict
3. Tailscale will route to fresh server (docker-storage-server-1)

---

## Why This Approach is Better

✅ **No need to kill old server**
- Old server can keep running on 8888
- Fresh server runs on 9999
- No port conflicts

✅ **Tailscale handles routing**
- Automatically routes to correct container
- No manual port configuration needed
- Works seamlessly

✅ **Both servers can coexist**
- Useful for testing/debugging
- Can compare old vs new behavior
- Easy rollback if needed

✅ **Laptop Dev unchanged**
- Still uses Tailscale Funnel
- No code changes needed
- Just clear cache and reload

---

## Next Steps

1. **PC Utama**: Restart docker services
   ```bash
   docker-compose -f docker-compose-migration.yml down
   docker-compose -f docker-compose-migration.yml up -d
   ```

2. **PC Utama**: Verify fresh server on 9999
   ```bash
   curl http://localhost:9999/health
   ```

3. **PC Utama**: Verify Tailscale endpoint
   ```bash
   curl https://server-tljp.tail75a421.ts.net/health
   ```

4. **Laptop Dev**: Clear browser cache
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

5. **Laptop Dev**: Test connection
   - Go to Settings > Check Connection
   - Should show "Connected" ✅

---

**Status**: Port mapping updated ✅ - Ready to restart services!
