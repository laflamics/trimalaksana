# Fix WebSocket Connection - Settings Page

## Problem

WebSocket connection is failing because:
1. Settings page sets WebSocket URL in localStorage
2. WebSocketClient wasn't listening for changes
3. WebSocketClient wasn't using the stored URL

## Solution Applied ✅

Updated `src/services/websocket-client.ts`:

### Change 1: Initialize with Stored URL
```typescript
private initialize() {
  // Get WebSocket URL from localStorage (set by Settings page)
  const storedWsUrl = localStorage.getItem('websocket_url');
  this.wsUrl = storedWsUrl || 'wss://server-tljp.tail75a421.ts.net/ws';
  
  localStorage.setItem('websocket_url', this.wsUrl);
  localStorage.setItem('websocket_enabled', 'true');
  
  this.connect();
  this.setupStorageListener();
}
```

### Change 2: Listen for URL Changes
```typescript
private setupStorageListener() {
  this.storageListener = (e: StorageEvent) => {
    if (e.key === 'websocket_url' && e.newValue) {
      // Reconnect with new URL
      this.wsUrl = e.newValue;
      if (this.ws) this.ws.close();
      this.reconnectAttempts = 0;
      this.connect();
    }
  };
  
  window.addEventListener('storage', this.storageListener);
}
```

### Change 3: Use Stored URL in Connect
```typescript
private connect() {
  const storedWsUrl = localStorage.getItem('websocket_url');
  if (storedWsUrl) {
    this.wsUrl = storedWsUrl;
  } else {
    this.wsUrl = 'wss://server-tljp.tail75a421.ts.net/ws';
  }
  
  // Connect with this.wsUrl
}
```

---

## How It Works Now

### Flow 1: Initial Load
```
1. WebSocketClient initializes
2. Reads websocket_url from localStorage
3. If not set, uses default: wss://server-tljp.tail75a421.ts.net/ws
4. Connects to WebSocket
```

### Flow 2: Settings Page Changes URL
```
1. User goes to Settings page
2. User changes server URL
3. Settings page calculates WebSocket URL
4. Settings page saves to localStorage: websocket_url
5. WebSocketClient detects change (storage event)
6. WebSocketClient reconnects with new URL
```

### Flow 3: Fresh Start
```
1. User clears browser cache
2. localStorage is empty
3. WebSocketClient uses default: wss://server-tljp.tail75a421.ts.net/ws
4. Connects successfully
```

---

## How to Test

### Step 1: Clear Browser Cache
```javascript
// Open DevTools (F12) > Console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Step 2: Go to Settings Page
- Server URL should show: `server-tljp.tail75a421.ts.net`
- Click "Check Connection"
- Should show: "Connected" ✅

### Step 3: Check Console
Open DevTools (F12) > Console:
```
[WebSocketClient] 🔌 Initialized with URL: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] 🔌 Attempting connection to: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] ✅ WebSocket connected!
```

### Step 4: Test Data Sync
1. Go to Packaging > Master > Products
2. Add new product
3. Data should appear AND PERSIST
4. Refresh page → data should still be there

---

## Expected Console Output

### Before (Failing)
```
[WebSocketClient] ⚠️ WebSocket connection failed, will retry...
[WebSocketClient] 📡 Falling back to HTTP GET for products
GET https://server-tljp.tail75a421.ts.net/api/storage/products net::ERR_FAILED 502
```

### After (Working)
```
[WebSocketClient] 🔌 Initialized with URL: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] 🔌 Attempting connection to: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] ✅ WebSocket connected!
[WebSocketClient] 📡 Got data via HTTP for products from https://server-tljp.tail75a421.ts.net
```

---

## Verification Checklist

- [ ] Code changes applied to websocket-client.ts
- [ ] Browser cache cleared
- [ ] Page reloaded
- [ ] Settings page shows correct server URL
- [ ] Connection check passes
- [ ] Console shows: "✅ WebSocket connected!"
- [ ] No 502 errors
- [ ] No CORS errors
- [ ] Can add new product
- [ ] Product persists after refresh

---

## Troubleshooting

### Still Getting Connection Failed?

1. **Check localStorage**
   ```javascript
   console.log(localStorage.getItem('websocket_url'));
   // Should show: wss://server-tljp.tail75a421.ts.net/ws
   ```

2. **Check if URL is correct**
   ```javascript
   console.log(localStorage.getItem('websocket_url'));
   // Should NOT have port number
   // Should be: wss://server-tljp.tail75a421.ts.net/ws
   // NOT: wss://server-tljp.tail75a421.ts.net:8888/ws
   ```

3. **Check Tailscale connection**
   ```bash
   tailscale status
   # Should show connected
   ```

4. **Test Tailscale endpoint**
   ```bash
   curl https://server-tljp.tail75a421.ts.net/health
   # Should return: {"status":"ok",...}
   ```

### WebSocket URL Has Port Number?

If localStorage shows: `wss://server-tljp.tail75a421.ts.net:8888/ws`

This is wrong! Tailscale Funnel doesn't use port numbers.

**Fix:**
1. Clear localStorage: `localStorage.clear()`
2. Go to Settings
3. Make sure server URL is: `server-tljp.tail75a421.ts.net` (no port)
4. Click "Check Connection"
5. Should save correct URL: `wss://server-tljp.tail75a421.ts.net/ws`

---

## Files Updated

- ✅ `src/services/websocket-client.ts` - Fixed WebSocket initialization and URL handling

---

## Next Steps

1. **Apply code changes** to websocket-client.ts
2. **Clear browser cache** on Laptop Dev
3. **Reload page**
4. **Go to Settings** > Check Connection
5. **Verify** WebSocket connected
6. **Test** fresh data sync

---

**Status**: WebSocket connection fix ready ✅

**Action**: Clear browser cache and reload page!
