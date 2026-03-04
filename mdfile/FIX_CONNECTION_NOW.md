# Fix Connection - Use Local Network IP

## Problem
Connection is still pointing to old Tailscale URL instead of local PC Utama IP.

## Solution - Already Applied ✅

Updated all files to use **local network IP** instead of Tailscale:

### Files Changed:
1. ✅ `src/services/websocket-client.ts`
   - Changed from: `wss://server-tljp.tail75a421.ts.net/ws`
   - Changed to: `ws://10.1.1.35:8888/ws`

2. ✅ `src/pages/Settings/Settings.tsx`
   - Changed all defaults from: `server-tljp.tail75a421.ts.net`
   - Changed to: `10.1.1.35`

## Next Steps (On Laptop Dev)

### 1. Clear Browser Cache
Open DevTools (F12) and run in Console:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Or manually:
1. Open DevTools (F12)
2. Application > Local Storage > Clear All
3. Reload page (Ctrl+R)

### 2. Verify Settings
1. Go to Settings page
2. Server URL should show: `10.1.1.35`
3. Server Port should show: `8888`
4. Click "Check Connection" → should show "Connected"

### 3. Test Fresh Sync
1. Go to Packaging > Master > Products
2. Add a new product
3. Data should appear AND PERSIST
4. Refresh page → data should still be there

## Expected Behavior After Fix

**Before (Broken):**
```
[WebSocketClient] 📡 Falling back to HTTP GET for products 
from https://server-tljp.tail75a421.ts.net
GET https://server-tljp.tail75a421.ts.net/api/storage/products 
net::ERR_FAILED 502 (Bad Gateway)
```

**After (Fixed):**
```
[WebSocketClient] 🔌 Attempting connection to: ws://10.1.1.35:8888/ws
[WebSocketClient] ✅ WebSocket connected!
[WebSocketClient] 📡 Got data via HTTP for products from http://10.1.1.35:8888
```

## Verification Checklist

- [ ] Browser cache cleared
- [ ] Page reloaded
- [ ] Settings shows: `10.1.1.35:8888`
- [ ] Connection check passes
- [ ] Can add new product
- [ ] Product persists after refresh
- [ ] Console shows: `ws://10.1.1.35:8888/ws` (not Tailscale URL)

---

**Status**: Code changes complete ✅ - Just need to clear cache and reload!
