# 🔧 Fix Auto-Restart Issue

## Problem
- Containers keep auto-restarting after being killed
- `restart: unless-stopped` in docker-compose causes this
- Need to disable auto-restart first

## Solution

### Step 1: Update docker-compose.yml (Already Done ✅)
Changed all services from `restart: unless-stopped` to `restart: no`:
- storage-server: `restart: no`
- postgres: `restart: no`
- minio: `restart: no`
- pgadmin: `restart: no`

**Why this works:**
- `restart: no` means containers will NOT auto-restart when stopped
- Containers will only start when explicitly run with `docker-compose up -d`

### Step 2: Stop All Services (PC Utama)

Run this script on PC Utama:
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker/DISABLE_AUTOSTART_AND_STOP.bat
```

**What it does:**
1. Kills all Node.js processes
2. Stops all Docker containers (won't auto-restart now)
3. Removes all containers
4. Verifies all containers are gone

**Expected output:**
```
[1/4] Killing all Node.js processes...
✓ Node.js process killed

[2/4] Stopping all Docker containers...
✓ Containers stopped

[3/4] Removing all containers...
✓ Containers removed

[4/4] Verifying all containers are stopped...
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
(empty - no containers)

✓ ALL SERVICES STOPPED (Auto-restart disabled)
```

### Step 3: Verify No Containers Running
```bash
docker ps -a
# Should show: CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
# (empty - no containers)
```

### Step 4: Start Fresh Services
```bash
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml up -d
```

**Expected output:**
```
[+] Running 4/4
 ✔ Container trimalaksana-postgres      Started
 ✔ Container trimalaksana-minio         Started
 ✔ Container trimalaksana-pgadmin       Started
 ✔ Container docker-storage-server-1    Started
```

### Step 5: Wait 30 Seconds
```bash
timeout /t 30
```

### Step 6: Verify Services Running
```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                   STATUS              PORTS
8b2af091e9cb   docker-storage-server   Up 25 seconds       0.0.0.0:9999->8888/tcp
7367c608def9   dpage/pgadmin4:latest   Up 25 seconds       0.0.0.0:5051->80/tcp
c0b8d6249a88   postgres:15-alpine      Up 25 seconds       0.0.0.0:5432->5432/tcp
2d81c3b99a60   minio/minio:latest      Up 25 seconds       0.0.0.0:9000-9001->9000-9001/tcp
```

### Step 7: Test Endpoints
```bash
# Test local endpoint
curl http://localhost:9999/health
# Should return: {"status":"ok",...}

# Test Tailscale endpoint
curl https://server-tljp.tail75a421.ts.net/health
# Should return: {"status":"ok",...}
```

---

## ✅ Verification

### On PC Utama
- [ ] No containers running: `docker ps -a` (empty)
- [ ] Fresh services started: `docker ps` (4 containers)
- [ ] Local endpoint working: `curl http://localhost:9999/health` (200 OK)
- [ ] Tailscale endpoint working: `curl https://server-tljp.tail75a421.ts.net/health` (200 OK)

### On Laptop Dev
- [ ] Clear browser cache: `localStorage.clear()`
- [ ] Reload page: `Ctrl+R`
- [ ] Settings shows Connected: ✅
- [ ] Console shows WebSocket connected: ✅
- [ ] New product persists: ✅

---

## 🆘 If Containers Still Auto-Restart

**Check 1: Verify docker-compose.yml has `restart: no`**
```bash
cat docker-compose-migration.yml | grep restart
# Should show: restart: no (4 times)
```

**Check 2: If still auto-restarting, manually disable**
```bash
# Stop all containers
docker stop $(docker ps -q)

# Update restart policy
docker update --restart=no $(docker ps -aq)

# Verify
docker inspect $(docker ps -aq) | grep -A 5 RestartPolicy
# Should show: "RestartPolicy": {"Name": "no", ...}
```

**Check 3: Remove and recreate containers**
```bash
# Remove all containers
docker rm -f $(docker ps -aq)

# Verify empty
docker ps -a

# Start fresh
docker-compose -f docker-compose-migration.yml up -d
```

---

## 📝 Files Changed

- ✅ `docker/docker-compose-migration.yml` - Changed `restart: unless-stopped` to `restart: no`
- ✅ `docker/DISABLE_AUTOSTART_AND_STOP.bat` - New script to stop services

---

## ⏱️ Timeline

1. Stop services: 1 minute
2. Start fresh services: 2 minutes
3. Test endpoints: 30 seconds
4. Clear browser cache: 10 seconds
5. Verify connection: 30 seconds
6. **Total: ~4 minutes**

---

## ✨ After This Works

- ✅ Containers won't auto-restart
- ✅ Services only start when explicitly run
- ✅ WebSocket connection works
- ✅ Data syncs automatically
- ✅ No more 502 errors

---

**Status**: Ready to stop services and disable auto-restart

**Next Action**: Run `docker/DISABLE_AUTOSTART_AND_STOP.bat` on PC Utama

