@echo off
REM Force rebuild of storage server container with latest server.js

echo.
echo ========================================
echo REBUILDING STORAGE SERVER
echo ========================================
echo.

echo [1/4] Stopping containers...
docker-compose down

echo.
echo [2/4] Removing old image to force rebuild...
docker image rm docker-storage-server-1 2>nul
docker image rm docker_storage-server 2>nul

echo.
echo [3/4] Rebuilding and starting containers...
docker-compose up -d --build

echo.
echo [4/4] Waiting for server to start (10 seconds)...
timeout /t 10

echo.
echo ========================================
echo VERIFICATION
echo ========================================
echo.

echo Testing server health...
curl -s http://localhost:9999/health | findstr "status"

echo.
echo Testing image download headers...
curl -I http://localhost:9999/api/blob/download/packaging/90c0cf4d-a93a-4e91-b11e-3695f1e592e9 2>nul | findstr "Content-Type Content-Disposition"

echo.
echo ========================================
echo DONE!
echo ========================================
echo Server is running on port 9999
echo MinIO Console: http://localhost:9001
echo.
