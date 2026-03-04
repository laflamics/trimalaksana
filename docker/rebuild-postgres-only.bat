@echo off
REM ============================================
REM Rebuild Docker with PostgreSQL-only Server
REM ============================================

echo.
echo [STEP 1] Stopping old services...
docker-compose -f docker-compose-migration.yml down

echo.
echo [STEP 2] Building new Docker image with PostgreSQL-only server...
docker-compose -f docker-compose-migration.yml build

echo.
echo [STEP 3] Starting fresh services...
docker-compose -f docker-compose-migration.yml up -d

echo.
echo [STEP 4] Waiting for services to start (30 seconds)...
timeout /t 30

echo.
echo [STEP 5] Checking service status...
docker ps

echo.
echo [STEP 6] Checking server logs...
docker logs docker-storage-server-1

echo.
echo [STEP 7] Testing health endpoint...
curl http://localhost:8888/health
curl http://localhost:9999/health

echo.
echo ============================================
echo REBUILD COMPLETE
echo ============================================
echo.
echo Services running on:
echo - HTTP (port 8888): http://localhost:8888
echo - HTTP (port 9999): http://localhost:9999
echo - PostgreSQL: localhost:5432
echo - MinIO: http://localhost:9000
echo - pgAdmin: http://localhost:5051
echo.
echo Next: Update Tailscale Funnel to use port 9999
echo Command: tailscale funnel --bg 9999
echo.
pause
