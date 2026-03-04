# Setup Checklist - Simple & Clear

## 🎯 PC Utama (Windows) - 3 Steps

### Step 1: Install Docker
- [ ] Download Docker Desktop: https://www.docker.com/products/docker-desktop
- [ ] Install
- [ ] Restart PC
- [ ] Verify: Open PowerShell, type `docker --version`

### Step 2: Copy Folder
- [ ] Copy `docker` folder to PC Utama
- [ ] Location: `C:\trimalaksana\docker\` (or anywhere)

### Step 3: Run Scripts
- [ ] Double-click `start-services.bat`
  - Wait for "All services started!" message
  - Wait 2-3 minutes for services to be healthy
- [ ] Double-click `migrate-data.bat`
  - Wait for "Migration completed!" message
  - Wait 1-2 minutes

### Verify PC Utama
- [ ] Open browser: http://localhost:9001 (MinIO)
- [ ] Open browser: http://localhost:5050 (pgAdmin)
- [ ] Open browser: http://localhost:8888/health (Node.js)
- [ ] All should work

---

## 💻 Laptop Dev (Linux) - 2 Steps

### Step 1: Get PC Utama IP
- [ ] Ask PC Utama person to run: `ipconfig`
- [ ] Look for "IPv4 Address", e.g., `192.168.1.100`
- [ ] Write it down: `_______________`

### Step 2: Update Code
- [ ] Open: `src/services/api-client.ts`
- [ ] Find: `const API_BASE_URL = ...`
- [ ] Change to: `const API_BASE_URL = 'http://192.168.1.100:8888';`
- [ ] Replace `192.168.1.100` with actual IP from Step 1

### Step 3: Start Frontend
- [ ] Run: `npm run dev`
- [ ] Open browser: http://localhost:5173
- [ ] Should see app loading

### Verify Laptop Dev
- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Try to load data
- [ ] Should see API calls to `192.168.1.100:8888`
- [ ] No errors in Console tab

---

## 🔑 Credentials (Save These)

```
PostgreSQL:
  Host: localhost
  Port: 5432
  User: trimalaksana
  Password: trimalaksana123
  Database: trimalaksana_db

MinIO:
  Endpoint: localhost:9000
  Console: http://localhost:9001
  User: minioadmin
  Password: minioadmin123

pgAdmin:
  URL: http://localhost:5050
  Email: admin@trimalaksana.local
  Password: admin123

Node.js Server:
  URL: http://localhost:8888
```

---

## 🆘 If Something Goes Wrong

### PC Utama - Services won't start
```powershell
# Check Docker is running
docker --version

# Check services status
docker-compose -f docker-compose-migration.yml ps

# View logs
docker-compose -f docker-compose-migration.yml logs
```

### PC Utama - Migration fails
```powershell
# Check PostgreSQL is running
docker-compose -f docker-compose-migration.yml ps postgres

# Test connection
psql -h localhost -U trimalaksana -d trimalaksana_db
```

### Laptop Dev - Can't reach PC Utama
```bash
# Check IP address
ping 192.168.1.100

# Test port
curl http://192.168.1.100:8888/health

# Check firewall on PC Utama
# Make sure port 8888 is open
```

### Laptop Dev - Data not loading
1. Open DevTools (F12)
2. Go to Network tab
3. Look for API calls
4. Check if they're going to correct IP
5. Check response status

---

## ✅ Final Verification

### PC Utama
- [ ] Docker running: `docker ps`
- [ ] Services healthy: `docker-compose -f docker-compose-migration.yml ps`
- [ ] PostgreSQL accessible: `psql -h localhost -U trimalaksana -d trimalaksana_db`
- [ ] MinIO accessible: http://localhost:9001
- [ ] pgAdmin accessible: http://localhost:5050
- [ ] Node.js accessible: http://localhost:8888/health

### Laptop Dev
- [ ] API endpoint updated in code
- [ ] Frontend starts: `npm run dev`
- [ ] Can reach PC Utama: `curl http://192.168.1.100:8888/health`
- [ ] Data loads in browser
- [ ] No errors in DevTools console

---

## 🎉 Success!

If all checkboxes are checked, you're done!

**PC Utama**: Running PostgreSQL + MinIO + Node.js
**Laptop Dev**: Connected to PC Utama, frontend working

---

**Total Time**: ~1 hour
**Difficulty**: Easy (just double-click scripts)

**Let's go! 🚀**

