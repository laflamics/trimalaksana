# WebSocket Fix - Do This Now

## Problem
WebSocket connection failing because Settings page wasn't properly updating WebSocketClient.

## Solution Applied ✅
Updated `src/services/websocket-client.ts` to:
1. Read WebSocket URL from localStorage
2. Listen for URL changes from Settings page
3. Reconnect when URL changes

---

## What to Do Now (Laptop Dev)

### Step 1: Clear Browser Cache
Open DevTools (F12) and run:
```javascript
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

**Should see:**
```
[WebSocketClient] 🔌 Initialized with URL: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] 🔌 Attempting connection to: wss://server-tljp.tail75a421.ts.net/ws
[WebSocketClient] ✅ WebSocket connected!
```

**Should NOT see:**
```
❌ WebSocket connection failed
❌ 502 Bad Gateway
❌ CORS policy error
```

### Step 4: Test Fresh Data Sync
1. Go to Packaging > Master > Products
2. Add new product
3. Data should appear AND PERSIST
4. Refresh page → data should still be there

---

## Key Changes

### Before (Broken)
```
Settings page sets websocket_url in localStorage
  ↓
WebSocketClient doesn't listen for changes
  ↓
WebSocketClient uses hardcoded URL
  ↓
Connection fails
```

### After (Fixed)
```
Settings page sets websocket_url in localStorage
  ↓
WebSocketClient listens for storage changes
  ↓
WebSocketClient reads URL from localStorage
  ↓
WebSocketClient reconnects with new URL
  ↓
Connection succeeds ✅
```

---

## Expected Flow

### 1. Initial Load
```
localStorage is empty
  ↓
WebSocketClient uses default: wss://server-tljp.tail75a421.ts.net/ws
  ↓
Connects successfully
```

### 2. Settings Page
```
User goes to Settings
  ↓
Settings calculates WebSocket URL
  ↓
Settings saves to localStorage
  ↓
WebSocketClient detects change
  ↓
WebSocketClient reconnects
```

### 3. Fresh Start
```
User clears cache
  ↓
localStorage is empty
  ↓
WebSocketClient uses default
  ↓
Connects successfully
```

---

## Verification

### Check localStorage
```javascript
console.log(localStorage.getItem('websocket_url'));
// Should show: wss://server-tljp.tail75a421.ts.net/ws
// NOT: wss://server-tljp.tail75a421.ts.net:8888/ws (wrong - has port)
```

### Check WebSocket Connection
Open DevTools > Network > WS tab:
- Should see connection to: `wss://server-tljp.tail75a421.ts.net/ws`
- Status: Connected ✅

### Check HTTP Requests
Open DevTools > Network > XHR tab:
- Should see requests to: `https://server-tljp.tail75a421.ts.net/api/storage/*`
- Status: 200 OK ✅

---

## Troubleshooting

### Still Getting Connection Failed?

1. **Check if URL has port number**
   ```javascript
   const url = localStorage.getItem('websocket_url');
   console.log(url);
   // Should be: wss://server-tljp.tail75a421.ts.net/ws
   // NOT: wss://server-tljp.tail75a421.ts.net:8888/ws
   ```

2. **If URL has port, fix it**
   ```javascript
   localStorage.clear();
   location.reload();
   // Go to Settings > Check Connection
   ```

3. **Check Tailscale connection**
   ```bash
   tailscale status
   # Should show: Connected
   ```

4. **Test Tailscale endpoint**
   ```bash
   curl https://server-tljp.tail75a421.ts.net/health
   # Should return: {"status":"ok",...}
   ```

---

## Files Updated

- ✅ `src/services/websocket-client.ts` - Fixed WebSocket URL handling

---

## Next Steps

1. **Clear browser cache**: `localStorage.clear()`
2. **Reload page**: `Ctrl+R`
3. **Go to Settings**: Check Connection
4. **Verify**: WebSocket connected
5. **Test**: Add new product

---

**Status**: WebSocket fix applied ✅

**Action**: Clear cache and reload page NOW!
