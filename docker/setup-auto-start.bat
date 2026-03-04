@echo off
REM ============================================
REM Setup Auto-Start for Trimalaksana Services
REM Run this ONCE to setup auto-start on PC restart
REM ============================================

setlocal enabledelayedexpansion

REM Get current directory
set SCRIPT_DIR=%~dp0
set SCRIPT_PATH=%SCRIPT_DIR%start-services.bat

echo.
echo ============================================
echo Setting up Auto-Start
echo ============================================
echo.

REM Check if running as admin
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator
    echo.
    echo Please:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo ✓ Running as Administrator
echo.

REM Create Task Scheduler entry
echo Creating Task Scheduler entry...
echo.

REM Delete existing task if it exists
schtasks /delete /tn "Trimalaksana Services" /f >nul 2>&1

REM Create new task
schtasks /create /tn "Trimalaksana Services" /tr "%SCRIPT_PATH%" /sc onstart /ru SYSTEM /f

if errorlevel 1 (
    echo ERROR: Failed to create Task Scheduler entry
    pause
    exit /b 1
)

echo ✓ Task Scheduler entry created
echo.

REM Verify task was created
schtasks /query /tn "Trimalaksana Services" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to verify Task Scheduler entry
    pause
    exit /b 1
)

echo ============================================
echo ✓ Auto-Start Setup Complete!
echo ============================================
echo.
echo Services will now start automatically when PC restarts.
echo.
echo To verify:
echo 1. Open Task Scheduler
echo 2. Look for "Trimalaksana Services"
echo 3. Should be set to run at startup
echo.
echo To disable auto-start:
echo 1. Open Task Scheduler
echo 2. Find "Trimalaksana Services"
echo 3. Right-click and select "Disable"
echo.
pause
