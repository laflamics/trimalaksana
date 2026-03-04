@echo off
REM ============================================
REM Clean Restart - Port 9999 Only
REM ============================================

echo.
echo [STEP 1] Stopping all services...
docker-compose -f docker-compose-migration.yml down

echo.
echo [STEP 2] Removing PostgreSQL volume...
docker volume rm docker_postgres_data 2>nul

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
curl http://localhost:9999/health

echo.
echo ============================================
echo RESTART COMPLETE
echo ============================================
echo.
pause
