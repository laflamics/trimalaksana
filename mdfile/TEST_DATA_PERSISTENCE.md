# 🧪 TEST DATA PERSISTENCE - REST API to PostgreSQL

## Overview

Test bahwa data yang dibuat di app benar-benar tersimpan di PostgreSQL melalui REST API, bukan hanya di localStorage.

## Architecture Being Tested

```
App (Electron)
  ↓
storageService.set(key, data)
  ↓
REST API POST /api/storage/{key}
  ↓
PostgreSQL storage table
```

## Test Steps

### Step 1: Verify Server is Running

**On Server PC (Windows):**
```bash
cd docker
docker-compose ps
```

Expected output:
```
NAME                    STATUS
trimalaksana-postgres   Up (healthy)
trimalaksana-minio      Up (healthy)
docker-storage-server   Up
```

**Check server health:**
```bash
curl https://server-tljp.tail75a421.ts.net:9999/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "mode": "PostgreSQL",
  "endpoints": {
    "getStorage": "/api/storage/:key",
    "setStorage": "/api/storage/:key",
    "deleteStorage": "/api/storage/:key"
  }
}
```

### Step 2: Run Automated Test Script

**On Dev Device:**
```bash
node test-data-persistence.js
```

This script will:
1. ✅ Test server connection
2. ✅ POST a test product
3. ✅ GET products and verify test product exists
4. ✅ POST a test sales order
5. ✅ GET sales orders and verify test order exists

Expected output:
```
✅ Server is reachable
✅ Product POST successful
✅ Product GET successful
   ✅ Test product found in response!
✅ Sales Order POST successful
✅ Sales Order GET successful
   ✅ Test sales order found in response!
```

### Step 3: Check PostgreSQL Data

**On Server PC (Windows):**

Run the batch script:
```bash
cd docker
check-postgres-data.bat
```

Or manually check:
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key, LENGTH(value::text) as size_bytes FROM storage ORDER BY updated_at DESC LIMIT 10;"
```

Expected output:
```
key              | size_bytes
-----------------+----------
products         | 45678
gt_salesOrders   | 23456
gt_quotations    | 12345
...
```

**Check specific data:**
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key FROM storage WHERE key IN ('products', 'gt_salesOrders');"
```

Expected output:
```
key
-----------------
products
gt_salesOrders
```

### Step 4: Check MinIO Data

**On Server PC (Windows):**

Run the batch script:
```bash
cd docker
check-minio-data.bat
```

Or access MinIO console:
- URL: http://localhost:9001
- Username: minioadmin
- Password: minioadmin

MinIO stores:
- Images (product photos, etc.)
- Files (PDFs, documents)
- Blobs (large binary data)

PostgreSQL stores:
- Structured data (products, orders, customers)
- Metadata
- Timestamps

### Step 5: Manual Test in App

**On Dev Device:**

1. Open the app
2. Go to Products module
3. Add a new product:
   - Code: TEST001
   - Name: Test Product
   - Unit: pcs
   - Safe Stock: 10
   - Minimum Stock: 5
4. Click Save

**Check server logs:**
```bash
docker logs trimalaksana-storage-server
```

Expected output:
```
[Server] 📤 POST /api/storage/products
[Server] 📊 Value type: object, isArray: true, size: 1
[Server] ✅ Saved products to PostgreSQL (1 items)
```

**Check PostgreSQL:**
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT value FROM storage WHERE key = 'products';" | grep -i "TEST001"
```

Expected: Should find the test product in the JSON data

### Step 6: Test Real-Time Sync

**On 2 Devices:**

1. Device A: Add a product
2. Device B: Should see the product appear in real-time (via WebSocket)
3. Verify both devices show the same data

**Check WebSocket logs:**
```bash
docker logs trimalaksana-storage-server | grep -i websocket
```

## Data Flow Verification

### Product Creation Flow

```
1. User adds product in UI
   ↓
2. storageService.set('products', [...])
   ↓
3. REST API POST /api/storage/products
   ↓
4. Server receives POST request
   [Server] 📤 POST /api/storage/products
   ↓
5. Server saves to PostgreSQL
   INSERT INTO storage (key, value, timestamp) VALUES ('products', '...', ...)
   ↓
6. Server responds with success
   [Server] ✅ Saved products to PostgreSQL
   ↓
7. WebSocket broadcasts change to other devices
   ↓
8. Other devices receive update and refresh UI
```

### Data Verification Points

| Step | What to Check | Where | Command |
|------|---------------|-------|---------|
| 1 | App shows product | Dev Device | Visual check in UI |
| 2 | Server receives POST | Server logs | `docker logs trimalaksana-storage-server` |
| 3 | Data in PostgreSQL | PostgreSQL | `docker exec trimalaksana-postgres psql ...` |
| 4 | Data persists | PostgreSQL | Query after app restart |
| 5 | Real-time sync | 2 Devices | Add on device A, check device B |

## Troubleshooting

### Issue: Server not reachable

**Solution:**
```bash
# Check if server is running
docker-compose ps

# Check server logs
docker logs trimalaksana-storage-server

# Verify Tailscale connection
curl https://server-tljp.tail75a421.ts.net:9999/health
```

### Issue: Data not appearing in PostgreSQL

**Check:**
1. Server logs show POST request?
   ```bash
   docker logs trimalaksana-storage-server | grep "POST"
   ```

2. PostgreSQL is connected?
   ```bash
   docker logs trimalaksana-storage-server | grep "PostgreSQL"
   ```

3. Storage table exists?
   ```bash
   docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "\dt storage;"
   ```

### Issue: Data appears in localStorage but not PostgreSQL

**This means:**
- App is saving to localStorage (local mode)
- But NOT syncing to server (REST API not working)

**Check:**
1. Is app in server mode?
   - Settings → Storage Mode → Should be "Server"

2. Is server URL correct?
   - Settings → Server URL → Should be `https://server-tljp.tail75a421.ts.net:9999`

3. Check app console for errors:
   - Open DevTools (F12)
   - Look for [StorageService] errors

## Success Criteria

✅ **All of these should be true:**

- [ ] Server is reachable at `https://server-tljp.tail75a421.ts.net:9999/health`
- [ ] App is in server mode (not local mode)
- [ ] Server logs show POST requests when data is added
- [ ] PostgreSQL storage table has data
- [ ] Data persists after app restart
- [ ] Real-time sync works on multiple devices
- [ ] No errors in app console

## Next Steps

If all tests pass:
1. ✅ Data persistence is working
2. ✅ REST API is working
3. ✅ PostgreSQL is working
4. ✅ Ready for production

If tests fail:
1. Check server logs: `docker logs trimalaksana-storage-server`
2. Check PostgreSQL: `docker logs trimalaksana-postgres`
3. Check app console: F12 → Console tab
4. Verify Tailscale connection: `curl https://server-tljp.tail75a421.ts.net:9999/health`

## Files Used

- `test-data-persistence.js` - Automated test script
- `docker/check-postgres-data.bat` - Check PostgreSQL data
- `docker/check-minio-data.bat` - Check MinIO data
- `docker/server.js` - REST API server
- `src/services/storage.ts` - Storage service (uses REST API)
