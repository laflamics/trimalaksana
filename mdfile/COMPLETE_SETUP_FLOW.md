# Complete Setup Flow - From Start to Fresh Data Sync

## Overview

```
PC Utama (Windows)                    Laptop Dev (Linux)
├─ PostgreSQL (empty)                 ├─ Frontend (React)
├─ MinIO (empty)                      ├─ WebSocket Client
├─ pgAdmin                            └─ API Client
├─ Node.js Server                     
└─ Tailscale Client                   Tailscale Network
                                      └─ Funnel: server-tljp.tail75a421.ts.net
```

---

## Phase 1: PC Utama Setup (Windows)

### Step 1: Disable Old Auto-Start
```bash
# Kill old Node.js process
taskkill /IM node.exe /F

# Or disable Task Scheduler
# Open taskschd.msc and disable old tasks
```

### Step 2: Verify Fresh Docker Services
```bash
cd D:\trimalaksanaapps\possgresql\docker

# Start fresh services
docker-compose -f docker-compose-migration.yml up -d

# Verify 4 containers running
docker ps

# Expected output:
# NAME                      IMAGE                   STATUS
# trimalaksana-postgres     postgres:15-alpine      Up (healthy)
# trimalaksana-minio        minio/minio:latest      Up (healthy)
# trimalaksana-pgadmin      dpage/pgadmin4:latest   Up
# docker-storage-server-1   docker-storage-server   Up
```

### Step 3: Verify Services Responding
```bash
# Test Node.js
curl http://localhost:8888/health
# Expected: {"status":"ok",...}

# Test PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT 1"
# Expected: (1 row)

# Test MinIO
curl http://localhost:9000/minio/health/live
# Expected: (empty response, status 200)
```

### Step 4: Verify Tailscale Endpoint
```bash
# Test Tailscale Funnel
curl https://server-tljp.tail75a421.ts.net/health
# Expected: {"status":"ok",...}
```

---

## Phase 2: Laptop Dev Setup (Linux)

### Step 1: Clear Browser Cache
Open DevTools (F12) and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Or manually:
1. DevTools (F12)
2. Application > Local Storage > Clear All
3. Reload page (Ctrl+R)

### Step 2: Verify Settings
Go to Settings page:
- Server URL should show: `server-tljp.tail75a421.ts.net`
- Server Port should show: `8888`

### Step 3: Check Connection
Click "Check Connection" button:
- Should show: "Connected" ✅
- Console should show: `[Settings] Direct fetch test: 200 OK`

### Step 4: Verify WebSocket
Open DevTools (F12) > Network > WS tab:
- Should see connection to: `wss://server-tljp.tail75a421.ts.net/ws`
- Status: Connected ✅

---

## Phase 3: Test Fresh Data Sync

### Step 1: Add New Product
1. Go to: Packaging > Master > Products
2. Click "Add Product"
3. Fill in details:
   - Product Name: "Test Product"
   - Product Code: "TEST-001"
   - Category: "Test"
4. Click "Save"

### Step 2: Verify Data Appears
- Data should appear in the table immediately
- Console should show: `[WebSocketClient] ✅ Posted data via HTTP`

### Step 3: Verify Data Persists
1. Refresh page (Ctrl+R)
2. Go back to Products
3. Data should still be there ✅

### Step 4: Verify in Database
1. Open pgAdmin: http://10.1.1.35:5051
2. Login: admin@trimalaksana.com / admin123
3. Navigate: PostgreSQL > trimalaksana_db > Tables
4. Find products table
5. Data should be there ✅

---

## Phase 4: Verify Complete Flow

### Console Logs (Laptop Dev)
```
[Settings] 🔌 Setting WebSocket URL: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] 🔌 Attempting connection to: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] ✅ WebSocket connected!
[WebSocketClient] 📡 Got data via HTTP for products from https://server-tljp.tail75a421.ts.net
[WebSocketClient] 📤 Falling back to HTTP POST for products
[WebSocketClient] ✅ Posted data via HTTP for products
```

### Network Tab (DevTools)
```
wss://server-tljp.tail75a421.ts.net/ws  → Connected
https://server-tljp.tail75a421.ts.net/api/storage/products → 200 OK
```

### Database (pgAdmin)
```
PostgreSQL > trimalaksana_db > Tables > products
├─ id
├─ name: "Test Product"
├─ code: "TEST-001"
├─ category: "Test"
└─ timestamp: 2026-02-10T...
```

---

## Troubleshooting

### Issue: Connection Timeout
**Cause:** Old server still running
**Fix:**
```bash
taskkill /IM node.exe /F
docker-compose -f docker-compose-migration.yml restart storage-server
```

### Issue: 502 Bad Gateway
**Cause:** Tailscale pointing to old server
**Fix:**
1. Disable old auto-start
2. Restart docker services
3. Test: `curl https://server-tljp.tail75a421.ts.net/health`

### Issue: Data Disappears After Refresh
**Cause:** Data not saved to PostgreSQL
**Fix:**
1. Check server logs: `docker-compose logs storage-server`
2. Check PostgreSQL: `docker-compose logs postgres`
3. Verify database is empty: `psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT COUNT(*) FROM products"`

### Issue: WebSocket Connection Failed
**Cause:** Tailscale not running or network issue
**Fix:**
1. Check Tailscale: `tailscale status`
2. Restart Tailscale
3. Check firewall
4. Verify: `curl https://server-tljp.tail75a421.ts.net/health`

### Issue: pgAdmin Not Accessible
**Cause:** Port 5051 in use or pgAdmin not started
**Fix:**
```bash
# Check if port is in use
netstat -an | find "5051"

# Restart pgAdmin
docker-compose -f docker-compose-migration.yml restart pgadmin

# Check logs
docker-compose -f docker-compose-migration.yml logs pgadmin
```

---

## Verification Checklist

### PC Utama
- [ ] Old auto-start disabled
- [ ] 4 containers running: `docker ps`
- [ ] PostgreSQL healthy: `docker-compose logs postgres`
- [ ] MinIO healthy: `docker-compose logs minio`
- [ ] Node.js responding: `curl http://localhost:8888/health`
- [ ] pgAdmin accessible: http://localhost:5051
- [ ] MinIO console accessible: http://localhost:9001
- [ ] Tailscale endpoint working: `curl https://server-tljp.tail75a421.ts.net/health`

### Laptop Dev
- [ ] Browser cache cleared
- [ ] Settings shows: `server-tljp.tail75a421.ts.net`
- [ ] Connection check passes
- [ ] WebSocket connected (DevTools > Network > WS)
- [ ] Can add new product
- [ ] Product persists after refresh
- [ ] Product appears in pgAdmin

---

## Key Points

✅ **Tailscale Funnel** (wss://server-tljp.tail75a421.ts.net)
- Secure encrypted connection
- No port conflicts
- Works from anywhere
- Avoids old auto-start interference

✅ **Fresh Database**
- PostgreSQL starts empty
- No data migration needed
- All new data goes to PostgreSQL

✅ **Real-Time Sync**
- WebSocket for live updates
- HTTP fallback if WebSocket unavailable
- Automatic reconnection

✅ **Cross-Device Support**
- Multiple devices can connect simultaneously
- Data syncs in real-time
- Tailscale handles network routing

---

## Next Steps

1. **Disable old auto-start** on PC Utama
2. **Verify fresh services** running
3. **Clear browser cache** on Laptop Dev
4. **Test fresh data sync**
5. **Verify in database** (pgAdmin)

---

**Status**: Ready for complete setup flow ✅
