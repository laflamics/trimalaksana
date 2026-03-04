@echo off
REM Diagnose which server is running on PC Utama

echo.
echo ============================================
echo DIAGNOSING SERVER ISSUE
echo ============================================
echo.

echo Step 1: Check running Node.js processes
echo.
tasklist /FI "IMAGENAME eq node.exe" /FO LIST
echo.

echo Step 2: Check Docker containers
echo.
docker ps -a
echo.

echo Step 3: Test Node.js on port 8888
echo.
echo Testing: http://localhost:8888/health
curl http://localhost:8888/health
echo.
echo.

echo Step 4: Check if old server is running
echo.
netstat -ano | find "8888"
echo.

echo Step 5: Check Task Scheduler for auto-start
echo.
schtasks /query /FO LIST | find /I "trimalaksana"
echo.

echo Step 6: Check docker-compose logs
echo.
echo === storage-server logs ===
docker-compose -f docker-compose-migration.yml logs storage-server | tail -20
echo.
echo === postgres logs ===
docker-compose -f docker-compose-migration.yml logs postgres | tail -10
echo.

echo ============================================
echo DIAGNOSIS COMPLETE
echo ============================================
echo.
echo If you see:
echo - Old Node.js process: Kill it with: taskkill /IM node.exe /F
echo - Old Task Scheduler task: Disable it in taskschd.msc
echo - Docker container issues: Check logs above
echo.
pause
