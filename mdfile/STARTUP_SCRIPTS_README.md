# 🚀 Server Startup Scripts

Quick automation scripts untuk manage server dengan 1 command. Jgn perlu manual docker-compose up lagi!

## 📁 Files

- `start-server-clean.ps1` - Full startup dengan cleanup otomatis
- `diagnose-server.ps1` - Quick health check

## 🎯 Usage

### **FULL STARTUP (Recommended)**
```powershell
.\start-server-clean.ps1
```

**What it does:**
1. ✅ Kills ALL processes on port 8888
2. ✅ Clears cache files
3. ✅ Docker-compose down
4. ✅ Docker-compose up
5. ✅ Health check + status report

**Output:**
```
========================================
🚀 FULL SERVER RESTART SEQUENCE
========================================

[1/5] 🧹 Killing all processes on port 8888...
  ✅ Processes killed
[2/5] 🔍 Verifying port is free...
  ✅ Port 8888 is clean
[3/5] 🗑️  Clearing cache and temporary files...
  ✅ Cache cleared
[4/5] 🐳 Restarting Docker containers...
  ✅ Docker restarted
[5/5] ⏳ Waiting for server to be ready...
  ✅ Server is ready!

========================================
📊 FINAL STATUS
========================================
✅ STARTUP COMPLETE!
```

### **QUICK DIAGNOSTIC**
```powershell
.\diagnose-server.ps1
```

**Shows:**
- ✅ Port 8888 status (single vs duplicate processes)
- ✅ Docker container status
- ✅ Health check response
- ✅ Last 10 log entries
- ✅ Available endpoints

---

## 🔧 Manual Run (Old Way - DON'T USE ANYMORE)

```powershell
# Kill processes manually
taskkill /F /PID <PID>

# Start Docker manually
docker-compose down
docker-compose up -d
```

**❌ Problem:** Easy to forget steps, miss duplicate processes

---

## ⚡ Quick Reference

| Task | Command |
|------|---------|
| Full restart | `.\start-server-clean.ps1` |
| Quick check | `.\diagnose-server.ps1` |
| View logs | `docker-compose logs -f` |
| Check port | `netstat -ano \| findstr 8888` |
| Kill specific | `taskkill /F /PID <number>` |

---

## 🎨 Color Meanings

- 🟢 **Green (✅)** = Good, working properly
- 🟡 **Yellow (⚠️)** = Warning, might need attention
- 🔴 **Red (❌)** = Error, needs fixing

---

## 📋 What Gets Cleaned?

Cache directories (not data):
- `%LOCALAPPDATA%\trimalaksana`
- `%APPDATA%\trimalaksana`
- `%TEMP%\trimalaksana`

**NOT deleted:**
- Server data (`docker/data/`)
- Docker volumes
- Database files

---

## 🆘 If Something Goes Wrong

1. **Port still in use?**
   ```powershell
   netstat -ano | findstr "8888"
   # Then manually kill processes shown above
   ```

2. **Docker won't start?**
   ```powershell
   docker-compose logs
   # Check error messages
   ```

3. **Server not responding?**
   ```powershell
   .\diagnose-server.ps1
   # Run this to see what's wrong
   ```

4. **Everything stuck?**
   - Close PowerShell completely
   - Wait 5 seconds
   - Re-open PowerShell
   - Run `.\start-server-clean.ps1` again

---

## 📌 Tips

✅ **Always use `start-server-clean.ps1` for startup**
✅ **Use `diagnose-server.ps1` after startup to verify**
✅ **Run from `docker` folder** (where docker-compose.yml is)
✅ **Make sure you have PowerShell execution enabled**

---

## 🔐 If PowerShell Execution Policy Blocks

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try again.

---

**Author:** Auto-generated startup automation
**Date:** 24 Jan 2026
**Status:** Production-ready ✅
