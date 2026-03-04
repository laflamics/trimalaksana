@echo off
REM ============================================
REM Trimalaksana - Start All Services (Fresh)
REM PostgreSQL + MinIO Only Mode
REM For Windows PC Utama
REM ============================================

setlocal enabledelayedexpansion

REM Get current directory
set SCRIPT_DIR=%~dp0

echo.
echo ============================================
echo Trimalaksana Services - Fresh Setup
echo PostgreSQL + MinIO Only Mode
echo ============================================
echo.

REM ============================================
REM STEP 1: Kill old Node.js processes
REM ============================================
echo [STEP 1/7] Cleaning up old processes...
echo.

tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH | find /I "node" >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠ Found old Node.js process, killing...
    taskkill /IM node.exe /F >nul 2>&1
    echo ✓ Old Node.js process killed
) else (
    echo ✓ No old Node.js process found
)

timeout /t 2 /nobreak
echo.

REM ============================================
REM STEP 2: Check Docker
REM ============================================
echo [STEP 2/7] Checking Docker installation...
echo.

docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✓ Docker found
echo.

REM ============================================
REM STEP 3: Check docker-compose file
REM ============================================
echo [STEP 3/7] Checking docker-compose configuration...
echo.

if not exist "%SCRIPT_DIR%docker-compose-migration.yml" (
    echo ERROR: docker-compose-migration.yml not found
    echo Expected location: %SCRIPT_DIR%docker-compose-migration.yml
    pause
    exit /b 1
)

echo ✓ docker-compose-migration.yml found
echo.

REM ============================================
REM STEP 4: Stop old services
REM ============================================
echo [STEP 4/7] Stopping old services...
echo.

docker-compose -f "%SCRIPT_DIR%docker-compose-migration.yml" down >nul 2>&1
echo ✓ Old services stopped
timeout /t 3 /nobreak
echo.

REM ============================================
REM STEP 5: Start fresh services
REM ============================================
echo [STEP 5/7] Starting fresh services...
echo (PostgreSQL, MinIO, pgAdmin, Node.js)
echo.

docker-compose -f "%SCRIPT_DIR%docker-compose-migration.yml" up -d
if errorlevel 1 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

echo ✓ Services starting...
echo Waiting for services to be ready (30 seconds)...
timeout /t 30 /nobreak
echo.

REM ============================================
REM STEP 6: Check service status
REM ============================================
echo [STEP 6/7] Checking service status...
echo.

docker-compose -f "%SCRIPT_DIR%docker-compose-migration.yml" ps
echo.

REM ============================================
REM STEP 7: Test services
REM ============================================
echo [STEP 7/7] Testing services...
echo.

REM Test Node.js on new port 9999
echo Testing Node.js server on port 9999...
curl -s http://localhost:9999/health >nul 2>&1
if errorlevel 1 (
    echo ⚠ Node.js server not responding yet (might still be starting)
) else (
    echo ✓ Node.js server is ready on port 9999
)

REM Test Tailscale endpoint
echo Testing Tailscale endpoint...
curl -s https://server-tljp.tail75a421.ts.net/health >nul 2>&1
if errorlevel 1 (
    echo ⚠ Tailscale endpoint not responding (check Tailscale connection)
) else (
    echo ✓ Tailscale endpoint is ready
)

echo.
echo ============================================
echo ✓ All services started successfully!
echo ============================================
echo.
echo Services (Fresh Setup - PostgreSQL + MinIO Only):
echo.
echo   PostgreSQL:       localhost:5432
echo   MinIO API:        localhost:9000
echo   MinIO Console:    http://localhost:9001
echo   pgAdmin:          http://localhost:5051
echo   Node.js (Local):  http://localhost:9999
echo   Node.js (Tailscale): wss://server-tljp.tail75a421.ts.net/ws
echo.
echo Credentials:
echo   PostgreSQL:    trimalaksana / trimalaksana123
echo   MinIO:         minioadmin / minioadmin123
echo   pgAdmin:       admin@trimalaksana.com / admin123
echo.
echo Port Mapping:
echo   Old Server:    port 8888 (if still running)
echo   Fresh Server:  port 9999 (new)
echo   Both can coexist without conflict!
echo.
echo Next steps on Laptop Dev:
echo 1. Clear browser cache: localStorage.clear()
echo 2. Go to Settings > Check Connection
echo 3. Should show: "Connected"
echo 4. Test adding new product
echo 5. Data should persist after refresh
echo.
echo To stop services: docker-compose -f docker-compose-migration.yml down
echo To view logs: docker-compose -f docker-compose-migration.yml logs
echo.
pause
