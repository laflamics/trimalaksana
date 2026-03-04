@echo off
REM ============================================
REM Fix PostgreSQL Connection Issue
REM ============================================
REM Problem: Server couldn't find PostgreSQL container
REM Solution: Use proper Docker network instead of bridge mode
REM ============================================

echo.
echo [STEP 1] Stopping all services...
docker-compose -f docker-compose-migration.yml down

echo.
echo [STEP 2] Removing old network (if exists)...
docker network rm trimalaksana-network 2>nul

echo.
echo [STEP 3] Rebuilding Docker image...
docker-compose -f docker-compose-migration.yml build

echo.
echo [STEP 4] Starting fresh services with proper networking...
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
echo Testing https://server-tljp.tail75a421.ts.net/health...
curl https://server-tljp.tail75a421.ts.net/health

echo.
echo ============================================
echo FIX COMPLETE
echo ============================================
echo.
echo If you see "status":"ok" above, PostgreSQL connection is working!
echo.
pause
