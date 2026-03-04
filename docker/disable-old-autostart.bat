@echo off
REM Disable old auto-start service on PC Utama

echo.
echo ============================================
echo Disabling old auto-start service...
echo ============================================
echo.

REM Check if old task exists in Task Scheduler
tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH | find /I "node" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Found old Node.js process running
    echo Killing old Node.js processes...
    taskkill /IM node.exe /F
    echo ✓ Killed old Node.js processes
) else (
    echo ✓ No old Node.js process found
)

echo.
echo ============================================
echo Checking Task Scheduler for old auto-start...
echo ============================================
echo.

REM List all tasks related to trimalaksana or storage
schtasks /query /FO LIST | find /I "trimalaksana" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Found scheduled tasks related to trimalaksana
    echo.
    echo To disable old auto-start:
    echo 1. Open Task Scheduler (taskschd.msc)
    echo 2. Look for tasks with "trimalaksana" or "storage" in the name
    echo 3. Right-click and select "Disable"
    echo.
) else (
    echo ✓ No scheduled tasks found for trimalaksana
)

echo.
echo ============================================
echo Next steps:
echo ============================================
echo.
echo 1. Verify only 4 containers running:
echo    docker ps
echo.
echo 2. Check if old container is gone:
echo    docker ps -a
echo.
echo 3. Start fresh services:
echo    start-services.bat
echo.
pause
