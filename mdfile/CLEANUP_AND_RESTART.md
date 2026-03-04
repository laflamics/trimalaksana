# 🔧 Cleanup & Restart Services - Step by Step

## Current Status
✅ Fresh services are running on port 9999
❌ But old containers are still running (need cleanup)

---

## Quick Fix - Run These Commands on PC Utama

Open PowerShell or Command Prompt on PC Utama and run:

### Step 1: Stop All Containers
```bash
docker-compose -f D:\trimalaksanaapps\possgresql\docker\docker-compose-migration.yml down
```

**Expected output:**
```
Stopping docker-storage-server-1 ... done
Stopping trimalaksana-pgadmin ... done
Stopping trimalaksana-postgres ... done
Stopping trimalaksana-minio ... done
Removing docker-storage-server-1 ... done
Removing trimalaksana-pgadmin ... done
Removing trimalaksana-postgres ... done
Removing trimalaksana-minio ... done
```

---

### Step 2: Remove All Containers (Force)
```bash
docker container prune -f
```

**Expected output:**
```
Deleted Containers:
8b2af091e9cb
7367c608def9
c0b8d6249a88
2d81c3b99a60

Total reclaimed space: XXX MB
```

---

### Step 3: Verify All Containers Removed
```bash
docker ps -a
```

**Expected output:**
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
(empty - no containers)
```

---

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

---

### Step 5: Wait 30 Seconds
```bash
timeout /t 30
```

---

### Step 6: Verify Services Running
```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                   COMMAND                  CREATED         STATUS                   PORTS
8b2af091e9cb   docker-storage-server   "docker-entrypoint.s…"   10 seconds ago  Up 8 seconds             0.0.0.0:9999->8888/tcp, 0.0.0.0:9998->8888/tcp
7367c608def9   dpage/pgadmin4:latest   "/entrypoint.sh"         10 seconds ago  Up 8 seconds             0.0.0.0:5051->80/tcp
c0b8d6249a88   postgres:15-alpine      "docker-entrypoint.s…"   10 seconds ago  Up 8 seconds (healthy)   0.0.0.0:5432->5432/tcp
2d81c3b99a60   minio/minio:latest      "/usr/bin/docker-ent…"   10 seconds ago  Up 8 seconds (healthy)   0.0.0.0:9000-9001->9000-9001/tcp
```

---

### Step 7: Test Local Endpoint
```bash
curl http://localhost:9999/health
```

**Expected output:**
```json
{"status":"ok","timestamp":"2026-02-10T...","services":{"postgres":"connected","minio":"connected"}}
```

---

### Step 8: Test Tailscale Endpoint
```bash
curl https://server-tljp.tail75a421.ts.net/health
```

**Expected output:**
```json
{"status":"ok","timestamp":"2026-02-10T...","services":{"postgres":"connected","minio":"connected"}}
```

**NOT:**
```
502 Bad Gateway
```

---

## 🧹 Alternative: Complete Cleanup

If you want to completely clean everything:

```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images (optional)
docker rmi $(docker images -q)

# Remove all volumes (optional - WARNING: deletes data!)
docker volume prune -f

# Verify everything is gone
docker ps -a
docker images
docker volume ls
```

---

## ✅ After Cleanup & Restart

Once services are running:

1. **On Laptop Dev**: Clear browser cache
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Go to Settings > Check Connection**
   - Should show: ✅ **Connected**

3. **Test Data Sync**
   - Go to Packaging > Master > Products
   - Add new product
   - Data should appear and persist

---

## 🆘 If Still Having Issues

### Check Docker Logs
```bash
# View all container logs
docker-compose -f docker-compose-migration.yml logs

# View specific container logs
docker logs trimalaksana-postgres
docker logs trimalaksana-minio
docker logs docker-storage-server-1
```

### Check Port Conflicts
```bash
# Check what's using port 9999
netstat -ano | findstr :9999

# Check what's using port 5432
netstat -ano | findstr :5432

# Check what's using port 9000
netstat -ano | findstr :9000
```

### Restart Docker Daemon
```bash
# On Windows, restart Docker Desktop from system tray
# Or use PowerShell:
Restart-Service Docker
```

---

## 📋 Checklist

- [ ] Ran `docker-compose down`
- [ ] Ran `docker container prune -f`
- [ ] Verified no containers: `docker ps -a` (empty)
- [ ] Started fresh services: `docker-compose up -d`
- [ ] Waited 30 seconds
- [ ] Verified 4 containers running: `docker ps`
- [ ] Tested local endpoint: `curl http://localhost:9999/health` (200 OK)
- [ ] Tested Tailscale endpoint: `curl https://server-tljp.tail75a421.ts.net/health` (200 OK)
- [ ] Cleared browser cache on Laptop Dev
- [ ] Reloaded page
- [ ] Checked Settings > Connection (Connected ✅)
- [ ] Tested adding new product (data persists ✅)

---

**Status**: Ready to cleanup and restart

**Next Action**: Run the commands above on PC Utama

