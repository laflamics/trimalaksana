@echo off
REM Cleanup - Remove all old containers, volumes, and data

echo.
echo ============================================
echo CLEANUP - Removing all old data
echo ============================================
echo.

REM Step 1: Stop containers
echo [STEP 1] Stopping containers...
docker-compose -f docker-compose.yml down -v 2>nul

REM Step 2: Remove volumes
echo [STEP 2] Removing volumes...
docker volume rm trimalaksana-postgres-data 2>nul
docker volume rm trimalaksana-minio-data 2>nul
docker volume rm postgres_data 2>nul
docker volume rm minio_data 2>nul

REM Step 3: Remove images
echo [STEP 3] Removing images...
docker rmi docker-storage-server:latest 2>nul
docker image prune -f

REM Step 4: Remove local data folders
echo [STEP 4] Removing local data folders...
if exist data rmdir /s /q data 2>nul
if exist updates rmdir /s /q updates 2>nul

echo.
echo ✅ Cleanup complete!
echo.
echo Next: Run fresh-setup.bat to start fresh
echo.
pause
