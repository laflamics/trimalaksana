# Fresh Setup Cleanup & Verification

## Step 1: Stop Old Container (PC Utama)
```bash
docker stop docker-storage-server-1
docker rm docker-storage-server-1
```

## Step 2: Verify Only 4 Containers Running (PC Utama)
```bash
docker ps
```

Expected output:
```
NAME                      IMAGE                   STATUS
trimalaksana-postgres     postgres:15-alpine      Up (healthy)
trimalaksana-minio        minio/minio:latest      Up (healthy)
trimalaksana-pgadmin      dpage/pgadmin4:latest   Up
docker-storage-server-1   docker-storage-server   Up
```

## Step 3: Delete Old Data Files (PC Utama)
```bash
cd D:\trimalaksanaapps\possgresql\docker
# Delete all old JSON files
del ..\data\localStorage\*.json
del ..\data\localStorage\general-trading\*.json
del ..\data\localStorage\trucking\*.json
```

Or run the cleanup script:
```bash
cleanup-old-data.bat
```

## Step 4: Clear Browser Cache (Laptop Dev)
1. Open DevTools (F12)
2. Go to Application > Local Storage
3. Right-click and select "Clear All"
4. Reload the page (Ctrl+R or Cmd+R)

## Step 5: Verify Fresh Setup
1. Check PostgreSQL is empty:
   - Open pgAdmin: http://localhost:5051
   - Login: admin@trimalaksana.com / admin123
   - Connect to PostgreSQL and verify no data

2. Check MinIO is empty:
   - Open MinIO Console: http://localhost:9001
   - Login: minioadmin / minioadmin123
   - Verify no buckets/files

3. Check Node.js server is running:
   - Test: http://localhost:8888/health
   - Should return: {"status":"ok",...}

## Step 6: Test Fresh Data Sync (Laptop Dev)
1. Go to Settings page
2. Verify server URL is set to: server-tljp.tail75a421.ts.net
3. Click "Check Connection" - should show "Connected"
4. Go to Packaging > Master > Products
5. Add a new product
6. Data should appear briefly and PERSIST (not disappear)
7. Refresh page - data should still be there
8. Check PostgreSQL in pgAdmin - data should be in database

## Troubleshooting

### Data still disappears after refresh
- Check browser console for errors
- Check server logs: `docker-compose -f docker-compose-migration.yml logs storage-server`
- Verify WebSocket connection: Open DevTools > Network > WS tab

### Connection fails
- Verify PC Utama IP: 10.1.1.35
- Verify all 4 containers are running: `docker ps`
- Check firewall allows port 8888

### PostgreSQL not accessible
- Verify pgAdmin port is 5051 (not 5050)
- Check pgAdmin logs: `docker-compose -f docker-compose-migration.yml logs pgadmin`
