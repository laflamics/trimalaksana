# Start Services - Complete Automated Setup

## Overview

Updated `docker/start-services.bat` to automate everything:

✅ **Kills old Node.js processes**
✅ **Checks Docker installation**
✅ **Stops old services**
✅ **Starts fresh services**
✅ **Tests all endpoints**
✅ **Shows credentials and next steps**

---

## What the Script Does

### Step 1: Clean Up Old Processes
```bash
taskkill /IM node.exe /F
```
- Kills any old Node.js processes
- Prevents port conflicts

### Step 2: Check Docker
```bash
docker --version
```
- Verifies Docker is installed
- Exits if Docker not found

### Step 3: Check Configuration
```bash
if exist docker-compose-migration.yml
```
- Verifies docker-compose file exists
- Exits if file not found

### Step 4: Stop Old Services
```bash
docker-compose down
```
- Stops any running containers
- Cleans up old services

### Step 5: Start Fresh Services
```bash
docker-compose up -d
```
- Starts PostgreSQL
- Starts MinIO
- Starts pgAdmin
- Starts Node.js on port 9999

### Step 6: Check Status
```bash
docker-compose ps
```
- Shows all running containers
- Verifies all services started

### Step 7: Test Endpoints
```bash
curl http://localhost:9999/health
curl https://server-tljp.tail75a421.ts.net/health
```
- Tests Node.js on port 9999
- Tests Tailscale endpoint

---

## How to Use

### On PC Utama (Windows)

**Option 1: Double-click the script**
```
D:\trimalaksanaapps\possgresql\docker\start-services.bat
```

**Option 2: Run from PowerShell**
```powershell
cd D:\trimalaksanaapps\possgresql\docker
.\start-services.bat
```

**Option 3: Run from Command Prompt**
```cmd
cd D:\trimalaksanaapps\possgresql\docker
start-services.bat
```

---

## What You'll See

```
============================================
Trimalaksana Services - Fresh Setup
PostgreSQL + MinIO Only Mode
============================================

[STEP 1/7] Cleaning up old processes...
✓ Old Node.js process killed

[STEP 2/7] Checking Docker installation...
✓ Docker found

[STEP 3/7] Checking docker-compose configuration...
✓ docker-compose-migration.yml found

[STEP 4/7] Stopping old services...
✓ Old services stopped

[STEP 5/7] Starting fresh services...
✓ Services starting...
Waiting for services to be ready (30 seconds)...

[STEP 6/7] Checking service status...
NAME                      IMAGE                   STATUS
trimalaksana-postgres     postgres:15-alpine      Up (healthy)
trimalaksana-minio        minio/minio:latest      Up (healthy)
trimalaksana-pgadmin      dpage/pgadmin4:latest   Up
docker-storage-server-1   docker-storage-server   Up

[STEP 7/7] Testing services...
✓ Node.js server is ready on port 9999
✓ Tailscale endpoint is ready

============================================
✓ All services started successfully!
============================================

Services (Fresh Setup - PostgreSQL + MinIO Only):
  PostgreSQL:       localhost:5432
  MinIO API:        localhost:9000
  MinIO Console:    http://localhost:9001
  pgAdmin:          http://localhost:5051
  Node.js (Local):  http://localhost:9999
  Node.js (Tailscale): wss://server-tljp.tail75a421.ts.net/ws

Credentials:
  PostgreSQL:    trimalaksana / trimalaksana123
  MinIO:         minioadmin / minioadmin123
  pgAdmin:       admin@trimalaksana.com / admin123

Port Mapping:
  Old Server:    port 8888 (if still running)
  Fresh Server:  port 9999 (new)
  Both can coexist without conflict!

Next steps on Laptop Dev:
1. Clear browser cache: localStorage.clear()
2. Go to Settings > Check Connection
3. Should show: "Connected"
4. Test adding new product
5. Data should persist after refresh
```

---

## Port Mapping

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| MinIO API | 9000 | File storage API |
| MinIO Console | 9001 | File storage UI |
| pgAdmin | 5051 | Database UI |
| Fresh Node.js | 9999 | Main API & WebSocket |
| Old Node.js | 8888 | Old server (if running) |

---

## Credentials

```
PostgreSQL:
  User: trimalaksana
  Pass: trimalaksana123
  DB:   trimalaksana_db

MinIO:
  User: minioadmin
  Pass: minioadmin123

pgAdmin:
  Email: admin@trimalaksana.com
  Pass:  admin123
```

---

## After Script Completes

### On PC Utama

1. **Verify services running**
   ```bash
   docker ps
   ```

2. **Test Node.js on port 9999**
   ```bash
   curl http://localhost:9999/health
   ```

3. **Test Tailscale endpoint**
   ```bash
   curl https://server-tljp.tail75a421.ts.net/health
   ```

4. **Access MinIO Console**
   - URL: http://localhost:9001
   - User: minioadmin / minioadmin123

5. **Access pgAdmin**
   - URL: http://localhost:5051
   - Email: admin@trimalaksana.com / admin123

### On Laptop Dev

1. **Clear browser cache**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Go to Settings**
   - Server URL should show: `server-tljp.tail75a421.ts.net`
   - Click "Check Connection"
   - Should show: "Connected" ✅

3. **Test fresh data sync**
   - Go to Packaging > Master > Products
   - Add new product
   - Data should appear AND PERSIST
   - Refresh page → data should still be there

---

## Troubleshooting

### Script Fails to Start

**Error: Docker is not installed**
- Install Docker Desktop from https://www.docker.com/products/docker-desktop
- Restart PowerShell/Command Prompt after installation

**Error: docker-compose-migration.yml not found**
- Make sure you're in the correct directory: `D:\trimalaksanaapps\possgresql\docker`
- Verify the file exists in that directory

### Services Don't Start

**Error: Port already in use**
- Old services still running
- Script should kill them automatically
- If not, manually: `taskkill /IM node.exe /F`

**Error: Docker daemon not running**
- Start Docker Desktop
- Wait for it to fully load
- Run script again

### Services Start But Tests Fail

**Node.js not responding on 9999**
- Wait 30 more seconds for startup
- Check logs: `docker-compose -f docker-compose-migration.yml logs storage-server`

**Tailscale endpoint not responding**
- Verify Tailscale is running: `tailscale status`
- Check Tailscale connection
- Restart Tailscale if needed

---

## Useful Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose-migration.yml logs

# Specific service
docker-compose -f docker-compose-migration.yml logs storage-server
docker-compose -f docker-compose-migration.yml logs postgres
docker-compose -f docker-compose-migration.yml logs minio
docker-compose -f docker-compose-migration.yml logs pgadmin
```

### Stop Services
```bash
docker-compose -f docker-compose-migration.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose-migration.yml restart
```

### Check Container Status
```bash
docker ps
docker ps -a
```

### Test Endpoints
```bash
# Node.js on port 9999
curl http://localhost:9999/health

# Tailscale endpoint
curl https://server-tljp.tail75a421.ts.net/health

# PostgreSQL
psql -h localhost -U trimalaksana -d trimalaksana_db -c "SELECT 1"

# MinIO
curl http://localhost:9000/minio/health/live
```

---

## Verification Checklist

After script completes:

- [ ] All 4 containers running: `docker ps`
- [ ] PostgreSQL healthy
- [ ] MinIO healthy
- [ ] pgAdmin running
- [ ] Node.js running on port 9999
- [ ] Node.js responds to health check
- [ ] Tailscale endpoint responds
- [ ] MinIO Console accessible: http://localhost:9001
- [ ] pgAdmin accessible: http://localhost:5051
- [ ] Browser cache cleared (Laptop Dev)
- [ ] Settings shows correct server URL
- [ ] Connection check passes
- [ ] Can add new product
- [ ] Product persists after refresh

---

## Summary

The `start-services.bat` script now:

✅ **Automates everything** - No manual steps needed
✅ **Cleans up old processes** - Prevents conflicts
✅ **Starts fresh services** - PostgreSQL + MinIO only
✅ **Tests endpoints** - Verifies everything works
✅ **Shows credentials** - Easy reference
✅ **Provides next steps** - Clear instructions

**Just run the script and everything is ready!** 🎯

---

## Next Steps

1. **Run the script** on PC Utama
2. **Wait for completion** (about 2-3 minutes)
3. **Verify services** are running
4. **Clear browser cache** on Laptop Dev
5. **Test fresh data sync**

---

**Status**: Automated setup complete ✅
