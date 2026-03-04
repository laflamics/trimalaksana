@echo off
REM Cleanup old docker container and start fresh

echo.
echo ============================================
echo Cleaning up old docker container...
echo ============================================
echo.

REM Stop and remove old container
docker stop docker-storage-server-1 2>nul
docker rm docker-storage-server-1 2>nul

echo.
echo ============================================
echo Listing remaining containers...
echo ============================================
docker ps -a

echo.
echo ============================================
echo Cleanup complete!
echo ============================================
echo.
echo Next steps:
echo 1. Run: start-services.bat (to start fresh)
echo 2. Clear browser localStorage
echo 3. Delete old data files from data/localStorage/
echo.
pause
