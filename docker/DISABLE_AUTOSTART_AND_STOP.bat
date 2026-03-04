@echo off
REM ============================================
REM DISABLE AUTO-RESTART AND STOP ALL SERVICES
REM ============================================

echo.
echo ============================================
echo DISABLING AUTO-RESTART AND STOPPING SERVICES
echo ============================================
echo.

REM Step 1: Kill all Node.js processes
echo [1/4] Killing all Node.js processes...
taskkill /IM node.exe /F /T 2>nul
if errorlevel 1 (
    echo ✓ No Node.js process found
) else (
    echo ✓ Node.js process killed
)
timeout /t 2 /nobreak

REM Step 2: Stop all Docker containers (this will NOT auto-restart because restart: no)
echo [2/4] Stopping all Docker containers...
docker-compose -f docker-compose-migration.yml down 2>nul
if errorlevel 1 (
    echo ⚠ docker-compose down failed, trying docker stop...
    for /f "tokens=*" %%i in ('docker ps -q 2^>nul') do (
        echo Stopping container: %%i
        docker stop %%i 2>nul
    )
)
timeout /t 2 /nobreak

REM Step 3: Remove all containers (force)
echo [3/4] Removing all containers...
for /f "tokens=*" %%i in ('docker ps -aq 2^>nul') do (
    echo Removing container: %%i
    docker rm -f %%i 2>nul
)
timeout /t 2 /nobreak

REM Step 4: Verify all containers are gone
echo [4/4] Verifying all containers are stopped...
docker ps -a
echo.

echo ============================================
echo ✓ ALL SERVICES STOPPED (Auto-restart disabled)
echo ============================================
echo.
echo Status:
echo   • All Node.js processes killed
echo   • All Docker containers stopped
echo   • All containers removed
echo   • Auto-restart disabled (restart: no in docker-compose.yml)
echo.
echo Next steps:
echo 1. Verify no containers: docker ps -a (should be empty)
echo 2. Start fresh services: docker-compose -f docker-compose-migration.yml up -d
echo 3. Wait 30 seconds
echo 4. Test: curl http://localhost:9999/health
echo.
pause
