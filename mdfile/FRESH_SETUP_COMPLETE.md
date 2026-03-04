# Fresh Setup - Complete Cleanup Done ✅

## Status: Ready for Testing

### What Was Done

#### 1. ✅ Laptop Dev (Linux) - Cleaned
- Deleted all old data files from `data/localStorage/`
- All 32 JSON files removed (products, orders, invoices, etc.)
- Browser localStorage will be cleared manually

#### 2. ⏳ PC Utama (Windows) - Needs Manual Cleanup
Run these commands on PC Utama:

```bash
# Stop and remove old container
docker stop docker-storage-server-1
docker rm docker-storage-server-1

# Verify only 4 containers remain
docker ps

# Delete old data files
cd D:\trimalaksanaapps\possgresql\docker
del ..\data\localStorage\*.json
```

Or use the cleanup script:
```bash
cleanup-old-data.bat
```

### Current Architecture

**PC Utama (Windows Server)**
- PostgreSQL: `localhost:5432` (empty database)
- MinIO: `localhost:9000/9001` (empty storage)
- pgAdmin: `localhost:5051` (admin@trimalaksana.com / admin123)
- Node.js: `localhost:8888` (storage server)

**Laptop Dev (Linux Client)**
- Frontend connects to PC Utama via:
  - HTTP: `http://10.1.1.35:8888` (local network)
  - WebSocket: `wss://server-tljp.tail75a421.ts.net/ws` (Tailscale Funnel)

### Next Steps

#### Step 1: Clear Browser Cache (Laptop Dev)
```
1. Open DevTools (F12)
2. Go to Application > Local Storage
3. Right-click and select "Clear All"
4. Reload page (Ctrl+R)
```

#### Step 2: Verify PC Utama Cleanup (PC Utama)
```bash
# Run cleanup script
cleanup-old-data.bat

# Verify only 4 containers
docker ps

# Check data directory is empty
dir D:\trimalaksanaapps\possgresql\docker\data\localStorage\
```

#### Step 3: Test Fresh Data Sync (Laptop Dev)
1. Go to Settings page
2. Verify server URL: `server-tljp.tail75a421.ts.net`
3. Click "Check Connection" → should show "Connected"
4. Go to Packaging > Master > Products
5. Add a new product
6. **CRITICAL**: Data should appear AND PERSIST (not disappear)
7. Refresh page → data should still be there
8. Check PostgreSQL in pgAdmin → data should be in database

### Troubleshooting

#### Data still disappears after refresh
- Check browser console (F12 > Console) for errors
- Check server logs: `docker-compose -f docker-compose-migration.yml logs storage-server`
- Verify WebSocket connection: DevTools > Network > WS tab

#### Connection fails
- Verify PC Utama IP: `10.1.1.35`
- Verify all 4 containers running: `docker ps`
- Check firewall allows port 8888

#### PostgreSQL not accessible
- Verify pgAdmin port is 5051 (not 5050)
- Check pgAdmin logs: `docker-compose -f docker-compose-migration.yml logs pgadmin`

### Files Created/Modified

**Cleanup Scripts:**
- `docker/cleanup-old-container.bat` - Remove old docker container
- `docker/cleanup-old-data.bat` - Delete old data files
- `cleanup-old-data.sh` - Linux version of cleanup
- `docker/CLEANUP_AND_VERIFY.md` - Detailed cleanup guide

**Already Cleaned:**
- ✅ `data/localStorage/` - All 32 JSON files deleted
- ✅ `docker/data/localStorage/` - Already empty

**Configuration Files (No Changes Needed):**
- `docker/docker-compose-migration.yml` - 4 services configured
- `docker/server.js` - Storage server implementation
- `src/services/api-client.ts` - API client (uses 10.1.1.35:8888)
- `src/services/websocket-client.ts` - WebSocket client (uses Tailscale Funnel)
- `src/pages/Settings/Settings.tsx` - Settings page with server config

### Key Points

1. **Server is Single Source of Truth**
   - All data stored in PostgreSQL on PC Utama
   - Client reads from server, not from localStorage
   - Fresh setup = empty database

2. **WebSocket for Real-Time Sync**
   - Uses Tailscale Funnel for secure connection
   - Falls back to HTTP if WebSocket unavailable
   - Automatic reconnection with exponential backoff

3. **No Data Migration**
   - Fresh setup, no old data imported
   - Database starts empty
   - All new data goes to PostgreSQL

4. **Cross-Device Sync**
   - Laptop Dev connects to PC Utama
   - Multiple devices can connect simultaneously
   - Data syncs in real-time via WebSocket

### Verification Checklist

- [ ] PC Utama: Old container removed
- [ ] PC Utama: Only 4 containers running
- [ ] PC Utama: Old data files deleted
- [ ] Laptop Dev: Browser localStorage cleared
- [ ] Laptop Dev: Settings page shows correct server URL
- [ ] Laptop Dev: Connection check passes
- [ ] Laptop Dev: Can add new product
- [ ] Laptop Dev: Product persists after refresh
- [ ] Laptop Dev: Product appears in pgAdmin
- [ ] Laptop Dev: WebSocket connected (DevTools > Network > WS)

---

**Status**: Ready for fresh data sync testing ✅
