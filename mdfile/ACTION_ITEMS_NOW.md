# Action Items - Disable Old Auto-Start

## The Real Issue
Old server is **auto-starting** on PC Utama, interfering with the fresh setup.

## Solution: Disable Old Auto-Start

### On PC Utama (Windows)

**Quick fix - Kill old Node.js:**
```bash
taskkill /IM node.exe /F
```

**Permanent fix - Disable Task Scheduler:**
1. Open Task Scheduler (taskschd.msc)
2. Look for tasks with "trimalaksana" or "storage"
3. Right-click and select "Disable"

Or run:
```bash
disable-old-autostart.bat
```

### Verify Fresh Services Only

```bash
docker ps
```

Should show only 4 containers:
- trimalaksana-postgres
- trimalaksana-minio
- trimalaksana-pgadmin
- docker-storage-server-1

### Test Tailscale Endpoint

```bash
curl https://server-tljp.tail75a421.ts.net/health
```

Should return: `{"status":"ok",...}`

## On Laptop Dev

### Clear Browser Cache
Open DevTools (F12) and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Test Fresh Sync
1. Settings > Check Connection → "Connected"
2. Packaging > Master > Products > Add new product
3. Data should PERSIST after refresh
4. Check console → should show `wss://server-tljp.tail75a421.ts.net/ws`

## Why This Works

✅ **Tailscale Funnel** (wss://server-tljp.tail75a421.ts.net)
- Already set up and working
- Secure encrypted connection
- No port conflicts
- Avoids old auto-start interference

## Files Already Updated

✅ `src/services/websocket-client.ts` - Uses Tailscale
✅ `src/pages/Settings/Settings.tsx` - Defaults to Tailscale

---

**Next**: Disable old auto-start on PC Utama, then test fresh sync on Laptop Dev
