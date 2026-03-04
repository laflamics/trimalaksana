@echo off
REM ============================================
REM STOP OLD SERVER - CRITICAL
REM ============================================

echo.
echo ============================================
echo STOPPING OLD SERVER - CRITICAL
echo ============================================
echo.

REM Kill ALL Node.js processes
echo [1/5] Killing all Node.js processes...
taskkill /IM node.exe /F /T 2>nul
if errorlevel 1 (
    echo ✓ No Node.js process found (already stopped)
) else (
    echo ✓ Node.js process killed
)
timeout /t 2 /nobreak

REM Stop all Docker containers using docker-compose down
echo [2/5] Stopping all Docker containers...
docker-compose -f docker-compose-migration.yml down 2>nul
if errorlevel 1 (
    echo ⚠ docker-compose down failed, trying docker stop...
    for /f "tokens=*" %%i in ('docker ps -q 2^>nul') do (
        echo Stopping container: %%i
        docker stop %%i 2>nul
    )
)
timeout /t 2 /nobreak

REM Remove all containers (force)
echo [3/5] Removing all containers...
for /f "tokens=*" %%i in ('docker ps -aq 2^>nul') do (
    echo Removing container: %%i
    docker rm -f %%i 2>nul
)
timeout /t 2 /nobreak

REM Verify no containers running
echo [4/5] Verifying no containers running...
docker ps
echo.

REM List all containers (should be empty)
echo [5/5] Listing all containers (should be empty)...
docker ps -a
echo.

echo ============================================
echo ✓ OLD SERVER STOPPED
echo ============================================
echo.
echo Next steps:
echo 1. Run: docker-compose -f docker-compose-migration.yml up -d
echo 2. Wait 30 seconds
echo 3. Test: curl http://localhost:9999/health
echo 4. Test: curl https://server-tljp.tail75a421.ts.net/health
echo.
pause
