# Next Actions - Fresh Setup Cleanup

## Status Summary

### ✅ Laptop Dev (Linux) - COMPLETE
- All old data files deleted from `data/localStorage/`
- Ready for browser cache clear

### ⏳ PC Utama (Windows) - PENDING
You need to run these commands on PC Utama:

```bash
# 1. Stop and remove old container
docker stop docker-storage-server-1
docker rm docker-storage-server-1

# 2. Verify only 4 containers remain
docker ps

# Expected output:
# NAME                      IMAGE                   STATUS
# trimalaksana-postgres     postgres:15-alpine      Up (healthy)
# trimalaksana-minio        minio/minio:latest      Up (healthy)
# trimalaksana-pgadmin      dpage/pgadmin4:latest   Up
# docker-storage-server-1   docker-storage-server   Up

# 3. Delete old data files
cd D:\trimalaksanaapps\possgresql\docker
del ..\data\localStorage\*.json

# 4. Verify directory is empty
dir ..\data\localStorage\
```

### ⏳ Browser (Laptop Dev) - PENDING
1. Open DevTools: **F12**
2. Go to: **Application > Local Storage**
3. Right-click and select: **Clear All**
4. Reload page: **Ctrl+R**

## After Cleanup - Test Fresh Sync

1. **Go to Settings page**
   - Verify server URL: `server-tljp.tail75a421.ts.net`
   - Click "Check Connection" → should show "Connected"

2. **Add new product**
   - Go to: Packaging > Master > Products
   - Click "Add Product"
   - Fill in details and save

3. **Verify persistence**
   - Data should appear AND STAY (not disappear)
   - Refresh page (Ctrl+R)
   - Data should still be there

4. **Verify in database**
   - Open pgAdmin: http://localhost:5051
   - Login: admin@trimalaksana.com / admin123
   - Check PostgreSQL > trimalaksana_db > Tables
   - Data should be in database

## Files Ready to Use

**On PC Utama:**
- `docker/cleanup-old-container.bat` - Removes old container
- `docker/cleanup-old-data.bat` - Deletes old data files
- `docker/CLEANUP_AND_VERIFY.md` - Detailed guide

**On Laptop Dev:**
- `cleanup-old-data.sh` - Linux cleanup script
- `FRESH_SETUP_COMPLETE.md` - Complete documentation
- `QUICK_REFERENCE.txt` - Quick reference card

## Key Points

1. **Old container must be removed** - It's interfering with fresh setup
2. **Old data must be deleted** - Both on PC Utama and browser cache
3. **Fresh database** - PostgreSQL starts empty, no migration needed
4. **Server is source of truth** - All data stored in PostgreSQL, not localStorage
5. **WebSocket for sync** - Real-time sync via Tailscale Funnel

## Verification Checklist

After cleanup, verify:
- [ ] PC Utama: Only 4 containers running
- [ ] PC Utama: `data/localStorage/` is empty
- [ ] Laptop Dev: Browser localStorage cleared
- [ ] Laptop Dev: Settings shows correct server URL
- [ ] Laptop Dev: Connection check passes
- [ ] Laptop Dev: Can add new product
- [ ] Laptop Dev: Product persists after refresh
- [ ] Laptop Dev: Product in pgAdmin database

---

**Ready to proceed?** Run the cleanup commands on PC Utama, then clear browser cache on Laptop Dev.
