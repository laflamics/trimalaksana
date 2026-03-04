# 🔬 Technical Explanation - WebSocket Connection Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LAPTOP DEV (Browser)                           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ React App (Vite)                                                 │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ Settings.tsx                                            │   │  │
│  │  │ - Reads server URL from user input                      │   │  │
│  │  │ - Calculates WebSocket URL                              │   │  │
│  │  │ - Saves to localStorage: websocket_url                  │   │  │
│  │  │ - Triggers WebSocketClient.reconnect()                  │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                           ↓                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ WebSocketClient (websocket-client.ts)                   │   │  │
│  │  │ - Listens for localStorage changes                      │   │  │
│  │  │ - Reads websocket_url from localStorage                 │   │  │
│  │  │ - Connects to: wss://server-tljp.tail75a421.ts.net/ws   │   │  │
│  │  │ - Handles WebSocket messages                            │   │  │
│  │  │ - Falls back to HTTP if WebSocket fails                 │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                           ↓                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ StorageService (storage.ts)                             │   │  │
│  │  │ - Uses WebSocketClient for CRUD operations              │   │  │
│  │  │ - Syncs data from server                                │   │  │
│  │  │ - Caches data in localStorage                           │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Network: WebSocket + HTTP                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  Tailscale Funnel     │
                        │  (Secure Tunnel)      │
                        │  wss://server-tljp... │
                        └───────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        PC UTAMA (Windows Server)                         │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Docker Containers                                                │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ storage-server (Node.js)                                │   │  │
│  │  │ - Listens on port 8888 (inside container)               │   │  │
│  │  │ - Mapped to port 9999 (host)                            │   │  │
│  │  │ - Handles WebSocket connections                         │   │  │
│  │  │ - Handles HTTP requests                                 │   │  │
│  │  │ - Connects to PostgreSQL & MinIO                        │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                           ↓                                      │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ PostgreSQL (Database)                                   │   │  │
│  │  │ - Port 5432                                             │   │  │
│  │  │ - Stores all business data                              │   │  │
│  │  │ - Single source of truth                                │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ MinIO (File Storage)                                    │   │  │
│  │  │ - Port 9000 (API)                                       │   │  │
│  │  │ - Port 9001 (Console)                                   │   │  │
│  │  │ - Stores files (PDFs, images, etc.)                     │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │ pgAdmin (Database UI)                                   │   │  │
│  │  │ - Port 5051                                             │   │  │
│  │  │ - For database management                               │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Network: Docker bridge network                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - How It Works

### 1. User Adds New Product

```
User clicks "Add Product" in Packaging > Master > Products
    ↓
React component calls: storageService.set('products', newProduct)
    ↓
StorageService.set() calls: websocketClient.post('products', newProduct)
    ↓
WebSocketClient.post() sends JSON message via WebSocket:
{
  "requestId": "req_1707600000000_1",
  "action": "POST",
  "key": "products",
  "value": { "id": "PROD-001", "name": "New Product", ... },
  "timestamp": 1707600000000
}
    ↓
Tailscale Funnel routes to: storage-server (port 9999)
    ↓
Node.js server receives message
    ↓
Node.js server saves to PostgreSQL:
INSERT INTO storage (key, value, timestamp) 
VALUES ('products', '{"id":"PROD-001",...}', 1707600000000)
    ↓
Node.js server sends response via WebSocket:
{
  "requestId": "req_1707600000000_1",
  "success": true,
  "data": { "id": "PROD-001", ... }
}
    ↓
WebSocketClient receives response
    ↓
StorageService updates localStorage cache
    ↓
React component re-renders with new product ✅
```

---

### 2. User Refreshes Page

```
User presses Ctrl+R to refresh page
    ↓
React app reloads
    ↓
StorageService.get('products') is called
    ↓
WebSocketClient.get('products') sends:
{
  "requestId": "req_1707600000001_1",
  "action": "GET",
  "key": "products",
  "timestamp": 1707600000001
}
    ↓
Tailscale Funnel routes to: storage-server (port 9999)
    ↓
Node.js server queries PostgreSQL:
SELECT value FROM storage WHERE key = 'products'
    ↓
Node.js server sends response:
{
  "requestId": "req_1707600000001_1",
  "success": true,
  "value": { "id": "PROD-001", ... }
}
    ↓
WebSocketClient receives response
    ↓
StorageService updates localStorage cache
    ↓
React component renders with product data ✅
```

---

## WebSocket Connection Flow

### Initialization (First Load)

```
1. WebSocketClient constructor runs
   ↓
2. initialize() method:
   - Reads websocket_url from localStorage
   - If not set, uses default: wss://server-tljp.tail75a421.ts.net/ws
   - Saves to localStorage
   ↓
3. setupStorageListener() method:
   - Listens for storage changes
   - If websocket_url changes, reconnects
   ↓
4. connect() method:
   - Creates new WebSocket connection
   - Connects to: wss://server-tljp.tail75a421.ts.net/ws
   ↓
5. WebSocket.onopen event:
   - Connection successful ✅
   - Logs: [WebSocketClient] ✅ WebSocket connected!
   ↓
6. Ready to send/receive messages
```

### Settings Page Update

```
1. User goes to Settings page
   ↓
2. User enters server URL: server-tljp.tail75a421.ts.net
   ↓
3. User clicks "Save"
   ↓
4. handleSave() method:
   - Calculates WebSocket URL: wss://server-tljp.tail75a421.ts.net/ws
   - Saves to localStorage: websocket_url
   ↓
5. WebSocketClient detects storage change
   ↓
6. setupStorageListener() triggers:
   - Detects websocket_url changed
   - Closes old connection
   - Calls connect() with new URL
   ↓
7. New WebSocket connection established ✅
```

### HTTP Fallback

```
If WebSocket connection fails:
   ↓
WebSocketClient.get() tries WebSocket first
   ↓
If WebSocket fails, falls back to HTTP:
   GET https://server-tljp.tail75a421.ts.net/api/storage/products
   ↓
Server responds with data
   ↓
StorageService uses HTTP response
   ↓
Data still loads (slower, but works)
```

---

## Port Mapping Explained

### Docker Container Ports

```
Inside Container (Internal)
    ↓
Node.js server listens on: PORT=8888
PostgreSQL listens on: 5432
MinIO listens on: 9000, 9001
pgAdmin listens on: 80
    ↓
Docker Port Mapping (Host)
    ↓
8888 (container) → 9999 (host)  [storage-server]
5432 (container) → 5432 (host)  [postgres]
9000 (container) → 9000 (host)  [minio API]
9001 (container) → 9001 (host)  [minio console]
80 (container) → 5051 (host)    [pgadmin]
```

### Why Port 9999?

- **Old server used port 8888** → conflicts with container internal port
- **Fresh server uses port 9999** → no conflicts
- **Both can coexist** without interfering
- **Tailscale Funnel** doesn't care about host port (uses 443)

---

## Tailscale Funnel Routing

### How Tailscale Routes Traffic

```
Laptop Dev (Tailscale Client)
    ↓
Connects to: wss://server-tljp.tail75a421.ts.net/ws
    ↓
Tailscale Network (Encrypted Tunnel)
    ↓
PC Utama (Tailscale Server)
    ↓
Tailscale Funnel (Port 443)
    ↓
Routes to: storage-server (port 9999)
    ↓
Node.js server responds
    ↓
Response sent back through tunnel ✅
```

### Why Tailscale Funnel?

- ✅ **Secure**: HTTPS/WSS only (encrypted)
- ✅ **No port conflicts**: Uses port 443 (standard HTTPS)
- ✅ **No firewall config**: Automatic tunneling
- ✅ **Works across networks**: Works from anywhere
- ✅ **No public IP**: Private network only

---

## The Problem (Before Fix)

### Old Server Still Running

```
PC Utama has 5 containers running:
1. Old storage-server (port 8888) ← BROKEN
2. New storage-server (port 9999) ← FRESH
3. PostgreSQL (port 5432)
4. MinIO (port 9000)
5. pgAdmin (port 5051)
    ↓
Tailscale Funnel routes to: Old storage-server (port 8888)
    ↓
Old server returns: 502 Bad Gateway
    ↓
WebSocket connection fails ❌
    ↓
CORS errors in console ❌
    ↓
Data sync blocked ❌
```

---

## The Solution (After Fix)

### Only Fresh Services Running

```
PC Utama has 4 containers running:
1. New storage-server (port 9999) ← FRESH
2. PostgreSQL (port 5432)
3. MinIO (port 9000)
4. pgAdmin (port 5051)
    ↓
Tailscale Funnel routes to: Fresh storage-server (port 9999)
    ↓
Fresh server returns: 200 OK
    ↓
WebSocket connection succeeds ✅
    ↓
Data syncs automatically ✅
    ↓
App loads data successfully ✅
```

---

## Code Changes Made

### 1. WebSocketClient (websocket-client.ts)

**Before:**
```typescript
// Hardcoded URL
private wsUrl: string = 'wss://server-tljp.tail75a421.ts.net/ws';

// No listening for changes
constructor() {
  this.connect();
}
```

**After:**
```typescript
// Read from localStorage
private initialize() {
  const storedWsUrl = localStorage.getItem('websocket_url');
  this.wsUrl = storedWsUrl || 'wss://server-tljp.tail75a421.ts.net/ws';
  localStorage.setItem('websocket_url', this.wsUrl);
  this.connect();
  this.setupStorageListener();
}

// Listen for changes
private setupStorageListener() {
  this.storageListener = (e: StorageEvent) => {
    if (e.key === 'websocket_url' && e.newValue) {
      const newWsUrl = e.newValue;
      if (newWsUrl !== this.wsUrl) {
        this.wsUrl = newWsUrl;
        if (this.ws) {
          this.ws.close();
        }
        this.reconnectAttempts = 0;
        this.connect();
      }
    }
  };
  window.addEventListener('storage', this.storageListener);
}
```

### 2. Settings Page (Settings.tsx)

**Before:**
```typescript
// No WebSocket URL handling
const handleSave = async () => {
  // Just save storage config
  await storageService.setConfig(config);
};
```

**After:**
```typescript
const handleSave = async () => {
  // Calculate WebSocket URL
  const wsUrl = isTailscaleFunnel && isHttps
    ? `wss://${hostname}/ws`
    : `ws://${cleanServerUrl}:${serverPort}/ws`;
  
  // Save to localStorage
  localStorage.setItem('websocket_url', wsUrl);
  localStorage.setItem('websocket_enabled', 'true');
  
  // Trigger reconnect
  const { websocketClient } = await import('../../services/websocket-client');
  const ready = await websocketClient.waitUntilReady(15000);
  
  if (!ready) {
    showAlert('WebSocket connection timeout', 'Warning');
    return;
  }
  
  await storageService.syncFromServer();
};
```

---

## Verification Points

### Check 1: WebSocket URL in localStorage
```javascript
console.log(localStorage.getItem('websocket_url'));
// Should be: wss://server-tljp.tail75a421.ts.net/ws
// NOT: wss://server-tljp.tail75a421.ts.net:8888/ws
```

### Check 2: WebSocket Connection Status
```javascript
// Open DevTools > Network > WS tab
// Should see: wss://server-tljp.tail75a421.ts.net/ws
// Status: Connected ✅
```

### Check 3: HTTP Requests
```javascript
// Open DevTools > Network > XHR tab
// Should see: https://server-tljp.tail75a421.ts.net/api/storage/*
// Status: 200 OK ✅
```

### Check 4: Console Logs
```javascript
// Open DevTools > Console
// Should see: [WebSocketClient] ✅ WebSocket connected!
// Should NOT see: 502 Bad Gateway or CORS errors
```

---

## Performance Considerations

### WebSocket vs HTTP

| Aspect | WebSocket | HTTP |
|--------|-----------|------|
| Connection | Persistent | Per-request |
| Latency | Low (reuse connection) | Higher (new connection) |
| Overhead | Low (binary frames) | Higher (headers) |
| Real-time | Yes (push) | No (pull only) |
| Fallback | HTTP GET | N/A |

### Timeout Configuration

```typescript
// GET requests for large keys: 60 seconds
// GET requests for regular keys: 30 seconds
// POST/DELETE requests: 10 seconds

// Why?
// - Large keys (products, materials) need more time
// - Regular keys are faster
// - POST/DELETE are usually quick
```

---

## Security Considerations

### HTTPS/WSS Only

```
Laptop Dev (HTTP)
    ↓
WebSocket to: wss://server-tljp.tail75a421.ts.net/ws
    ↓
Encrypted tunnel (TLS 1.3)
    ↓
PC Utama (HTTPS)
    ↓
Data encrypted end-to-end ✅
```

### No Public IP Exposure

```
Tailscale Funnel
    ↓
Private network only
    ↓
No firewall holes
    ↓
No port forwarding needed ✅
```

---

## Troubleshooting Decision Tree

```
WebSocket not connecting?
    ↓
├─ Check: docker ps (4 containers running?)
│  ├─ No → Run: docker-compose up -d
│  └─ Yes → Continue
│
├─ Check: curl http://localhost:9999/health (200 OK?)
│  ├─ No → Check Docker logs: docker logs docker-storage-server-1
│  └─ Yes → Continue
│
├─ Check: localStorage.getItem('websocket_url')
│  ├─ Wrong URL → Go to Settings > Save
│  └─ Correct → Continue
│
├─ Check: tailscale status (Connected?)
│  ├─ No → Restart Tailscale
│  └─ Yes → Continue
│
└─ Check: Browser console (errors?)
   ├─ CORS errors → Old server still running
   ├─ 502 errors → Old server still running
   └─ Other → Check Docker logs
```

---

**Status**: Technical explanation complete

**Next Action**: Run cleanup commands on PC Utama to stop old containers

