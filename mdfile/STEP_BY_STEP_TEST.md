# 🧪 STEP-BY-STEP TEST GUIDE

## Prerequisites

- Server PC: Docker containers running
- Dev Device: Connected to Tailscale
- App: Built and running

## Test 1: Server Connection (5 minutes)

### On Dev Device:

```bash
curl https://server-tljp.tail75a421.ts.net:9999/health
```

### Expected Output:
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T...",
  "database": "connected",
  "mode": "PostgreSQL"
}
```

### If Failed:
- Check Tailscale: `tailscale status`
- Check server: `docker-compose ps` (on server PC)
- Check server logs: `docker logs trimalaksana-storage-server`

---

## Test 2: Automated REST API Test (10 minutes)

### On Dev Device:

```bash
node test-data-persistence.js
```

### What It Does:
1. Tests server connection
2. POSTs a test product
3. GETs products and verifies
4. POSTs a test sales order
5. GETs sales orders and verifies

### Expected Output:
```
✅ Server is reachable
✅ Product POST successful
✅ Product GET successful
   ✅ Test product found in response!
✅ Sales Order POST successful
✅ Sales Order GET successful
   ✅ Test sales order found in response!
```

### If Failed:
- Check server logs: `docker logs trimalaksana-storage-server`
- Check PostgreSQL: `docker logs trimalaksana-postgres`

---

## Test 3: Manual App Test (15 minutes)

### Step 1: Open App
- Launch the app on dev device
- Go to Settings
- Verify: Storage Mode = "Server"
- Verify: Server URL = `https://server-tljp.tail75a421.ts.net:9999`

### Step 2: Add Product
- Go to Products module
- Click "Add Product"
- Fill in:
  - Code: `TEST-${Date.now()}`
  - Name: "Test Product"
  - Unit: "pcs"
  - Safe Stock: 10
  - Minimum Stock: 5
- Click Save

### Step 3: Check Server Logs
**On Server PC:**
```bash
docker logs trimalaksana-storage-server | tail -20
```

### Expected:
```
[Server] 📤 POST /api/storage/products
[Server] 📊 Value type: object, isArray: true, size: 1
[Server] ✅ Saved products to PostgreSQL (1 items)
```

### If Not Seen:
- Check app console: F12 → Console tab
- Look for [StorageService] errors
- Check if app is in server mode

### Step 4: Check PostgreSQL
**On Server PC:**
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key FROM storage WHERE key = 'products';"
```

### Expected:
```
key
---------
products
```

### Step 5: Verify Data in PostgreSQL
**On Server PC:**
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT value FROM storage WHERE key = 'products';" | grep -i "TEST"
```

### Expected:
Should find your test product in the JSON output

---

## Test 4: Data Persistence (10 minutes)

### Step 1: Add Data
- Add a product in the app
- Add a sales order
- Add a quotation

### Step 2: Close App
- Close the app completely

### Step 3: Restart App
- Reopen the app

### Step 4: Verify Data
- Check if all data is still there
- Data should load from PostgreSQL, not localStorage

### Expected:
- All data appears immediately
- No "loading" delay (data is cached locally)
- Data is the same as before restart

---

## Test 5: Real-Time Sync (15 minutes)

### Setup:
- Device A: Dev device with app
- Device B: Another device with app (or browser)

### Step 1: Add Data on Device A
- Open app on Device A
- Add a product

### Step 2: Check Device B
- Open app on Device B
- Go to Products
- Should see the product from Device A

### Expected:
- Product appears on Device B within 1-2 seconds
- No need to refresh

### If Not Seen:
- Check WebSocket connection: F12 → Network → WS
- Check app console for errors
- Verify both devices are in server mode

---

## Test 6: Check All Data Storage

### PostgreSQL (Structured Data)

**On Server PC:**
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key, LENGTH(value::text) as size FROM storage ORDER BY updated_at DESC LIMIT 20;"
```

### Expected:
```
key              | size
-----------------+-------
products         | 45678
gt_salesOrders   | 23456
gt_quotations    | 12345
...
```

### MinIO (BLOB Storage)

**On Server PC:**
```bash
docker exec trimalaksana-minio mc ls minio/trimalaksana-packaging --recursive | head -20
```

Or access console:
- URL: http://localhost:9001
- Username: minioadmin
- Password: minioadmin

---

## Troubleshooting

### Problem: Server not reachable

**Solution:**
```bash
# Check Tailscale
tailscale status

# Check server
docker-compose ps

# Check server health
curl https://server-tljp.tail75a421.ts.net:9999/health
```

### Problem: Data not in PostgreSQL

**Check:**
1. Server logs: `docker logs trimalaksana-storage-server | grep "POST"`
2. App console: F12 → Console tab
3. App settings: Is it in server mode?

### Problem: Data only in localStorage

**This means:**
- App is NOT calling REST API
- App is in local mode

**Solution:**
- Go to Settings
- Change Storage Mode to "Server"
- Restart app

### Problem: Real-time sync not working

**Check:**
1. WebSocket connection: F12 → Network → WS
2. Server logs: `docker logs trimalaksana-storage-server | grep -i websocket`
3. Both devices in server mode?

---

## Success Checklist

✅ **All of these should be true:**

- [ ] Server is reachable: `curl https://server-tljp.tail75a421.ts.net:9999/health`
- [ ] Automated test passes: `node test-data-persistence.js`
- [ ] Server logs show POST requests
- [ ] PostgreSQL has data: `docker exec trimalaksana-postgres psql ...`
- [ ] Data persists after restart
- [ ] Real-time sync works on multiple devices
- [ ] No errors in app console

---

## Summary

If all tests pass:
✅ **Data persistence is working correctly**
✅ **REST API is working**
✅ **PostgreSQL is working**
✅ **Real-time sync is working**
✅ **Ready for production**

---

## Quick Reference

| Test | Command | Expected |
|------|---------|----------|
| Server health | `curl https://server-tljp.tail75a421.ts.net:9999/health` | 200 OK |
| Automated test | `node test-data-persistence.js` | All ✅ |
| Server logs | `docker logs trimalaksana-storage-server` | POST requests |
| PostgreSQL | `docker exec trimalaksana-postgres psql ...` | Data in storage table |
| Data persist | Close/restart app | Data still there |
| Real-time sync | Add on device A, check device B | Appears in 1-2s |

---

## Need Help?

Check these files:
- `QUICK_TEST_COMMANDS.md` - Quick commands
- `TEST_DATA_PERSISTENCE.md` - Detailed guide
- `HYBRID_ARCHITECTURE_COMPLETE.md` - Architecture details
