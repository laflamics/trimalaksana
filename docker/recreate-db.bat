@echo off
REM ============================================
REM Recreate Database with Storage Table
REM ============================================

echo.
echo [STEP 1] Stopping all services...
docker-compose -f docker-compose-migration.yml down

echo.
echo [STEP 2] Removing PostgreSQL volume (to reset database)...
docker volume rm docker_postgres_data 2>nul

echo.
echo [STEP 3] Rebuilding Docker image...
docker-compose -f docker-compose-migration.yml build

echo.
echo [STEP 4] Starting fresh services...
docker-compose -f docker-compose-migration.yml up -d

echo.
echo [STEP 5] Waiting for services to start (30 seconds)...
timeout /t 30

echo.
echo [STEP 6] Checking service status...
docker ps

echo.
echo [STEP 7] Checking server logs...
docker logs docker-storage-server-1

echo.
echo [STEP 8] Testing health endpoints...
echo Testing http://localhost:9999/health...
curl http://localhost:9999/health

echo.
echo ============================================
echo DATABASE RECREATION COMPLETE
echo ============================================
echo.
echo If you see "database":"connected" and "storage":"connected" above, everything is working!
echo.
pause
