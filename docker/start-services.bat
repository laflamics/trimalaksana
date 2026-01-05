@echo off
REM Auto-start script untuk Docker container dan Tailscale funnel
REM Run via Task Scheduler saat Windows startup

echo ========================================
echo Starting Services - %date% %time%
echo ========================================

REM Set working directory
cd /d "D:\trimalaksanaapps\PT.Trima Laksana Jaya Pratama\docker"

REM Wait for Docker Desktop to be ready (max 2 minutes)
echo [1/3] Waiting for Docker Desktop...
set /a counter=0
:wait_docker
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    echo     Docker is ready!
    goto start_docker
)
set /a counter+=1
if %counter% geq 24 (
    echo     ERROR: Docker not ready after 2 minutes
    exit /b 1
)
timeout /t 5 /nobreak >nul
goto wait_docker

:start_docker
REM Start Docker container
echo [2/3] Starting Docker container...
docker-compose up -d
if %errorlevel% neq 0 (
    echo     ERROR: Failed to start Docker container
    exit /b 1
)
echo     Container started successfully

REM Wait for container to be ready
echo     Waiting for container to be ready...
timeout /t 10 /nobreak >nul

REM Start Tailscale funnel in background
echo [3/3] Starting Tailscale funnel...
REM Check if funnel is already running
tailscale status | findstr /C:"Funnel" >nul 2>&1
if %errorlevel% equ 0 (
    echo     Tailscale funnel is already running
) else (
    echo     Starting Tailscale funnel in background...
    REM Start funnel in background using PowerShell (detached process)
    powershell -Command "$proc = Start-Process -FilePath 'tailscale' -ArgumentList 'funnel','8888' -WindowStyle Hidden -PassThru; Write-Host 'Process started with PID:' $proc.Id"
    REM Wait a bit for funnel to start
    timeout /t 5 /nobreak >nul
    REM Verify it started
    tailscale status | findstr /C:"Funnel" >nul 2>&1
    if %errorlevel% equ 0 (
        echo     Tailscale funnel started successfully
    ) else (
        echo     WARNING: Tailscale funnel might not have started
    )
)

echo ========================================
echo All services started - %date% %time%
echo ========================================

REM Keep window open for 5 seconds to see results
timeout /t 5 /nobreak >nul

