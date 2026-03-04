# ⚡ QUICK TEST COMMANDS

## Test Server Connection

```bash
# From dev device
curl https://server-tljp.tail75a421.ts.net:9999/health
```

Expected:
```json
{
  "status": "ok",
  "database": "connected",
  "mode": "PostgreSQL"
}
```

## Test REST API - POST Product

```bash
curl -X POST https://server-tljp.tail75a421.ts.net:9999/api/storage/products \
  -H "Content-Type: application/json" \
  -d '{
    "value": [
      {
        "id": "test-123",
        "kode": "TEST001",
        "nama": "Test Product",
        "satuan": "pcs"
      }
    ],
    "timestamp": '$(date +%s)'000
  }'
```

Expected:
```json
{
  "success": true,
  "timestamp": 1707123456000
}
```

## Test REST API - GET Product

```bash
curl https://server-tljp.tail75a421.ts.net:9999/api/storage/products
```

Expected:
```json
{
  "value": [
    {
      "id": "test-123",
      "kode": "TEST001",
      "nama": "Test Product",
      "satuan": "pcs"
    }
  ],
  "timestamp": 1707123456000
}
```

## Check PostgreSQL Data

**On Server PC:**

```bash
# Check all keys
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key, LENGTH(value::text) as size FROM storage ORDER BY updated_at DESC LIMIT 10;"

# Check specific key
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT value FROM storage WHERE key = 'products';"

# Count total records
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT COUNT(*) FROM storage;"
```

## Check Server Logs

```bash
# Real-time logs
docker logs -f trimalaksana-storage-server

# Last 50 lines
docker logs --tail 50 trimalaksana-storage-server

# Search for POST requests
docker logs trimalaksana-storage-server | grep "POST"

# Search for errors
docker logs trimalaksana-storage-server | grep "ERROR\|❌"
```

## Check PostgreSQL Logs

```bash
# Real-time logs
docker logs -f trimalaksana-postgres

# Last 50 lines
docker logs --tail 50 trimalaksana-postgres
```

## Run Automated Test

```bash
# From dev device
node test-data-persistence.js
```

## Test Data Flow

### 1. Add Product in App
- Open app
- Go to Products
- Add new product
- Click Save

### 2. Check Server Logs
```bash
docker logs trimalaksana-storage-server | tail -20
```

Should see:
```
[Server] 📤 POST /api/storage/products
[Server] ✅ Saved products to PostgreSQL
```

### 3. Check PostgreSQL
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key FROM storage WHERE key = 'products';"
```

Should see:
```
key
---------
products
```

### 4. Verify Data Persists
- Close app
- Restart app
- Check if product still exists

## Troubleshooting Commands

### Check if containers are running
```bash
docker-compose ps
```

### Check container health
```bash
docker inspect trimalaksana-postgres --format='{{.State.Health.Status}}'
docker inspect trimalaksana-minio --format='{{.State.Health.Status}}'
```

### Check network connectivity
```bash
# From dev device
ping server-tljp.tail75a421.ts.net

# Check Tailscale
tailscale status
```

### Check storage table exists
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "\dt storage;"
```

### Check storage table structure
```bash
docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "\d storage;"
```

## Expected Results

✅ **Success:**
- Server responds to health check
- POST requests return 200 OK
- GET requests return data
- PostgreSQL has data in storage table
- Data persists after restart
- Real-time sync works on multiple devices

❌ **Failure:**
- Server not reachable → Check Tailscale connection
- POST returns error → Check server logs
- Data not in PostgreSQL → Check if REST API is being called
- Data only in localStorage → Check if app is in server mode

## Quick Checklist

- [ ] Server is running: `docker-compose ps`
- [ ] Server is healthy: `curl https://server-tljp.tail75a421.ts.net:9999/health`
- [ ] PostgreSQL is connected: `docker logs trimalaksana-storage-server | grep PostgreSQL`
- [ ] Storage table exists: `docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "\dt storage;"`
- [ ] App is in server mode: Check Settings
- [ ] Server URL is correct: Check Settings
- [ ] Add product in app
- [ ] Check server logs: `docker logs trimalaksana-storage-server`
- [ ] Check PostgreSQL: `docker exec trimalaksana-postgres psql -U trimalaksana -d trimalaksana_db -c "SELECT key FROM storage;"`
- [ ] Data persists after restart
