# Setup script untuk auto-start services (Simple version menggunakan schtasks)
# Run sebagai Administrator!

#Requires -RunAsAdministrator

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AUTO-START SETUP (Simple Version)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$dockerDir = "D:\trimalaksanaapps\PT.Trima Laksana Jaya Pratama\docker"
$startScript = Join-Path $dockerDir "start-services.bat"
$monitorScript = Join-Path $dockerDir "monitor-services.ps1"

# Check if scripts exist
if (-not (Test-Path $startScript)) {
    Write-Host "❌ start-services.bat not found at: $startScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $monitorScript)) {
    Write-Host "❌ monitor-services.ps1 not found at: $monitorScript" -ForegroundColor Red
    exit 1
}

Write-Host "[1] Creating Task Scheduler tasks using schtasks..." -ForegroundColor Yellow
Write-Host ""

# Task 1: Start services on Windows startup
$taskName1 = "Trimalaksana-StartServices"
Write-Host "    Creating task: $taskName1..." -ForegroundColor Gray

try {
    # Remove existing task if exists
    schtasks /query /tn $taskName1 >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Removing existing task..." -ForegroundColor Gray
        schtasks /delete /tn $taskName1 /f >$null 2>&1
        Start-Sleep -Milliseconds 500
    }

    # Create new task using schtasks
    $command = "schtasks /create /tn `"$taskName1`" /tr `"$startScript`" /sc onstart /ru `"$env:USERDOMAIN\$env:USERNAME`" /rl highest /f"
    Write-Host "    Executing: schtasks /create..." -ForegroundColor Gray
    Invoke-Expression $command | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Task '$taskName1' created successfully" -ForegroundColor Green
    } else {
        throw "schtasks returned error code $LASTEXITCODE"
    }
} catch {
    Write-Host "    ❌ Failed to create task '$taskName1'" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Task 2: Monitor services every 5 minutes
$taskName2 = "Trimalaksana-MonitorServices"
Write-Host "    Creating task: $taskName2..." -ForegroundColor Gray

try {
    # Remove existing task if exists
    schtasks /query /tn $taskName2 >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Removing existing task..." -ForegroundColor Gray
        schtasks /delete /tn $taskName2 /f >$null 2>&1
        Start-Sleep -Milliseconds 500
    }

    # Create new task using schtasks
    $monitorCmd = "powershell.exe -ExecutionPolicy Bypass -File `"$monitorScript`""
    $command = "schtasks /create /tn `"$taskName2`" /tr `"$monitorCmd`" /sc minute /mo 5 /ru `"$env:USERDOMAIN\$env:USERNAME`" /rl highest /f"
    Write-Host "    Executing: schtasks /create..." -ForegroundColor Gray
    Invoke-Expression $command | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Task '$taskName2' created successfully" -ForegroundColor Green
    } else {
        throw "schtasks returned error code $LASTEXITCODE"
    }
} catch {
    Write-Host "    ❌ Failed to create task '$taskName2'" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify tasks
Write-Host "[2] Verifying tasks..." -ForegroundColor Yellow
$task1 = schtasks /query /tn $taskName1 /fo list 2>&1
$task2 = schtasks /query /tn $taskName2 /fo list 2>&1

if ($LASTEXITCODE -eq 0 -and $task1 -and $task2) {
    Write-Host "    ✅ All tasks verified" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tasks created:" -ForegroundColor Cyan
    Write-Host "  - $taskName1 (Runs on Windows startup)" -ForegroundColor White
    Write-Host "  - $taskName2 (Runs every 5 minutes)" -ForegroundColor White
} else {
    Write-Host "    ⚠️ Could not verify tasks, but they might be created" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3] Important notes:" -ForegroundColor Yellow
Write-Host "    1. Make sure Docker Desktop is set to 'Start on Windows login'" -ForegroundColor White
Write-Host "       (Docker Desktop → Settings → General → 'Start Docker Desktop when you log in')" -ForegroundColor Gray
Write-Host ""
Write-Host "    2. Make sure Tailscale is set to auto-start" -ForegroundColor White
Write-Host "       (Tailscale → Settings → Start Tailscale on system startup)" -ForegroundColor Gray
Write-Host ""
Write-Host "    3. Monitor logs at: $dockerDir\monitor.log" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test:" -ForegroundColor Yellow
Write-Host "  1. Restart PC to test auto-start" -ForegroundColor White
Write-Host "  2. Check Task Scheduler: taskschd.msc" -ForegroundColor White
Write-Host "  3. Check monitor.log for service status" -ForegroundColor White
Write-Host ""

