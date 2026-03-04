@echo off
REM Fresh Setup - PostgreSQL + MinIO Only
REM Removes all old containers and data, starts fresh

echo.
echo ============================================
echo FRESH SETUP - PostgreSQL + MinIO Only
echo ============================================
echo.

REM Step 1: Stop and remove old containers
echo [STEP 1] Stopping and removing old containers...
docker-compose -f docker-compose.yml down -v
if errorlevel 1 (
    echo ⚠️ Warning: Could not stop containers (might not exist)
)

REM Step 2: Remove old images
echo.
echo [STEP 2] Removing old images...
docker rmi docker-storage-server:latest 2>nul
docker image prune -f

REM Step 3: Build fresh images
echo.
echo [STEP 3] Building fresh Docker images...
docker-compose -f docker-compose.yml build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

REM Step 4: Start services
echo.
echo [STEP 4] Starting services...
docker-compose -f docker-compose.yml up -d
if errorlevel 1 (
    echo ❌ Failed to start services!
    pause
    exit /b 1
)

REM Step 5: Wait for services to be ready
echo.
echo [STEP 5] Waiting for services to be ready...
timeout /t 15

REM Step 6: Check service status
echo.
echo [STEP 6] Checking service status...
docker-compose -f docker-compose.yml ps

REM Step 7: Check server logs
echo.
echo [STEP 7] Server initialization logs...
docker logs docker-storage-server-1

REM Step 8: Test health endpoint
echo.
echo [STEP 8] Testing health endpoint...
curl http://localhost:9999/health
echo.

REM Step 9: Show access information
echo.
echo ============================================
echo ✅ FRESH SETUP COMPLETE
echo ============================================
echo.
echo 📊 Services Running:
echo   - PostgreSQL: localhost:5432
echo   - pgAdmin: http://localhost:5051 (admin@trimalaksana.com / admin123)
echo   - MinIO: http://localhost:9001 (minioadmin / minioadmin123)
echo   - Storage Server: http://localhost:9999
echo.
echo 🔗 Tailscale Funnel:
echo   tailscale funnel --bg 9999
echo.
echo 📝 Next Steps:
echo   1. Open pgAdmin to verify PostgreSQL
echo   2. Check MinIO buckets created
echo   3. Configure Laptop Dev to use http://localhost:9999
echo   4. Test data sync
echo.
echo ============================================
pause
