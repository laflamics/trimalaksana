# Setup script untuk auto-start services
# Run sekali untuk setup Task Scheduler tasks
# IMPORTANT: Run as Administrator!

#Requires -RunAsAdministrator

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AUTO-START SETUP" -ForegroundColor Cyan
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

Write-Host "[1] Creating Task Scheduler tasks..." -ForegroundColor Yellow

# Task 1: Start services on Windows startup
$taskName1 = "Trimalaksana-StartServices"
$taskDescription1 = "Auto-start Docker container and Tailscale funnel on Windows startup"

Write-Host "    Creating task: $taskName1..." -ForegroundColor Gray
try {
    # Remove existing task if exists
    $existingTask = Get-ScheduledTask -TaskName $taskName1 -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "    Removing existing task..." -ForegroundColor Gray
        Unregister-ScheduledTask -TaskName $taskName1 -Confirm:$false -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }

    # Create new task
    Write-Host "    Configuring task action..." -ForegroundColor Gray
    $action = New-ScheduledTaskAction -Execute $startScript -WorkingDirectory $dockerDir
    
    Write-Host "    Configuring task trigger..." -ForegroundColor Gray
    $trigger = New-ScheduledTaskTrigger -AtStartup
    
    Write-Host "    Configuring task principal..." -ForegroundColor Gray
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
    
    Write-Host "    Configuring task settings..." -ForegroundColor Gray
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false

    Write-Host "    Registering task..." -ForegroundColor Gray
    $result = Register-ScheduledTask -TaskName $taskName1 -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $taskDescription1 -ErrorAction Stop
    
    if ($result) {
        Write-Host "    ✅ Task '$taskName1' created successfully" -ForegroundColor Green
    } else {
        throw "Task registration returned null"
    }
} catch {
    Write-Host "    ❌ Failed to create task '$taskName1'" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "    TROUBLESHOOTING:" -ForegroundColor Yellow
    Write-Host "    1. Make sure you run PowerShell as Administrator" -ForegroundColor White
    Write-Host "    2. Check if task already exists: Get-ScheduledTask -TaskName '$taskName1'" -ForegroundColor White
    Write-Host "    3. Try manual: schtasks /create /tn '$taskName1' /tr `"$startScript`" /sc onstart /ru `"$env:USERDOMAIN\$env:USERNAME`"" -ForegroundColor White
    exit 1
}

# Task 2: Monitor services every 5 minutes
$taskName2 = "Trimalaksana-MonitorServices"
$taskDescription2 = "Monitor and auto-restart Docker container and Tailscale funnel every 5 minutes"

Write-Host "    Creating task: $taskName2..." -ForegroundColor Gray
try {
    # Remove existing task if exists
    $existingTask = Get-ScheduledTask -TaskName $taskName2 -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "    Removing existing task..." -ForegroundColor Gray
        Unregister-ScheduledTask -TaskName $taskName2 -Confirm:$false -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }

    # Create new task
    Write-Host "    Configuring task action..." -ForegroundColor Gray
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$monitorScript`""
    
    Write-Host "    Configuring task trigger..." -ForegroundColor Gray
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
    
    Write-Host "    Configuring task principal..." -ForegroundColor Gray
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
    
    Write-Host "    Configuring task settings..." -ForegroundColor Gray
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false

    Write-Host "    Registering task..." -ForegroundColor Gray
    $result = Register-ScheduledTask -TaskName $taskName2 -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $taskDescription2 -ErrorAction Stop
    
    if ($result) {
        Write-Host "    ✅ Task '$taskName2' created successfully" -ForegroundColor Green
    } else {
        throw "Task registration returned null"
    }
} catch {
    Write-Host "    ❌ Failed to create task '$taskName2'" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "    TROUBLESHOOTING:" -ForegroundColor Yellow
    Write-Host "    1. Make sure you run PowerShell as Administrator" -ForegroundColor White
    Write-Host "    2. Check if task already exists: Get-ScheduledTask -TaskName '$taskName2'" -ForegroundColor White
    Write-Host "    3. Try manual: schtasks /create /tn '$taskName2' /tr `"powershell.exe -ExecutionPolicy Bypass -File `"$monitorScript`"`" /sc minute /mo 5 /ru `"$env:USERDOMAIN\$env:USERNAME`"" -ForegroundColor White
    exit 1
}

Write-Host ""

# Verify tasks
Write-Host "[2] Verifying tasks..." -ForegroundColor Yellow
$task1 = Get-ScheduledTask -TaskName $taskName1 -ErrorAction SilentlyContinue
$task2 = Get-ScheduledTask -TaskName $taskName2 -ErrorAction SilentlyContinue

if ($task1 -and $task2) {
    Write-Host "    ✅ All tasks verified" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tasks created:" -ForegroundColor Cyan
    Write-Host "  - $taskName1 (Runs on Windows startup)" -ForegroundColor White
    Write-Host "  - $taskName2 (Runs every 5 minutes)" -ForegroundColor White
} else {
    Write-Host "    ❌ Some tasks not found" -ForegroundColor Red
    exit 1
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

