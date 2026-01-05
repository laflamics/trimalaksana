# Monitoring script untuk Docker container dan Tailscale funnel
# Run setiap 5 menit via Task Scheduler
# Auto-restart jika service mati

$ErrorActionPreference = "Continue"
$logFile = "D:\trimalaksanaapps\PT.Trima Laksana Jaya Pratama\docker\monitor.log"
$dockerDir = "D:\trimalaksanaapps\PT.Trima Laksana Jaya Pratama\docker"

function Write-Log {
    param($message, $level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$level] $message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $logMessage
}

function Check-DockerContainer {
    Write-Log "Checking Docker container..."
    try {
        $container = docker ps --filter "name=docker-storage-server-1" --format "{{.Names}}" 2>&1
        if ($container -eq "docker-storage-server-1") {
            Write-Log "✅ Docker container is running"
            return $true
        } else {
            Write-Log "❌ Docker container is NOT running" "WARN"
            return $false
        }
    } catch {
        Write-Log "❌ Error checking Docker container: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Start-DockerContainer {
    Write-Log "Starting Docker container..."
    try {
        Push-Location $dockerDir
        docker-compose up -d 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "✅ Docker container started successfully"
            Start-Sleep -Seconds 5
            return $true
        } else {
            Write-Log "❌ Failed to start Docker container" "ERROR"
            return $false
        }
    } catch {
        Write-Log "❌ Error starting Docker container: $($_.Exception.Message)" "ERROR"
        return $false
    } finally {
        Pop-Location
    }
}

function Check-TailscaleFunnel {
    Write-Log "Checking Tailscale funnel..."
    try {
        # First check if funnel process is running
        $funnelProcess = Get-Process -Name "tailscale" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*funnel*8888*" }
        if (-not $funnelProcess) {
            # Check tailscale status for funnel info
            $status = & tailscale status 2>&1
            if ($status -match "Funnel.*8888") {
                Write-Log "✅ Tailscale funnel is active (from status)"
                return $true
            } else {
                Write-Log "❌ Tailscale funnel process not found" "WARN"
                return $false
            }
        }
        
        # Check if port 8888 is accessible via Tailscale
        $response = Invoke-WebRequest -Uri "https://server-tljp.tail75a421.ts.net/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ Tailscale funnel is active and accessible"
            return $true
        } else {
            Write-Log "⚠️ Tailscale funnel process exists but returned status $($response.StatusCode)" "WARN"
            return $false
        }
    } catch {
        # Try localhost as fallback
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8888/health" -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Log "⚠️ Server is running locally but Tailscale funnel might be down" "WARN"
                return $false
            }
        } catch {
            Write-Log "❌ Server not accessible (neither Tailscale nor localhost)" "ERROR"
            return $false
        }
        return $false
    }
}

function Start-TailscaleFunnel {
    Write-Log "Starting Tailscale funnel..."
    try {
        # Check if already running first
        $status = & tailscale status 2>&1
        if ($status -match "Funnel.*8888") {
            Write-Log "✅ Tailscale funnel is already running"
            return $true
        }
        
        # Start funnel in background
        Write-Log "Starting Tailscale funnel process in background..."
        $process = Start-Process -FilePath "tailscale" -ArgumentList "funnel","8888" -WindowStyle Hidden -PassThru -ErrorAction Stop
        
        if ($process) {
            Write-Log "✅ Tailscale funnel process started (PID: $($process.Id))"
            Start-Sleep -Seconds 5  # Wait for funnel to initialize
            
            # Verify it's running
            $status = & tailscale status 2>&1
            if ($status -match "Funnel.*8888") {
                Write-Log "✅ Tailscale funnel verified as running"
                return $true
            } else {
                Write-Log "⚠️ Tailscale funnel process started but not showing in status" "WARN"
                return $true  # Assume it's starting
            }
        } else {
            Write-Log "❌ Failed to start Tailscale funnel process" "ERROR"
            return $false
        }
    } catch {
        Write-Log "❌ Error starting Tailscale funnel: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Main monitoring logic
Write-Log "========================================"
Write-Log "Service Monitor Started"
Write-Log "========================================"

# Check Docker container
$dockerRunning = Check-DockerContainer
if (-not $dockerRunning) {
    Write-Log "Attempting to restart Docker container..." "WARN"
    $dockerStarted = Start-DockerContainer
    if (-not $dockerStarted) {
        Write-Log "Failed to restart Docker container. Manual intervention required." "ERROR"
    }
} else {
    # Container is running, check if it's healthy
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:8888/health" -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($health.StatusCode -eq 200) {
            Write-Log "✅ Docker container is healthy"
        } else {
            Write-Log "⚠️ Docker container returned non-200 status" "WARN"
        }
    } catch {
        Write-Log "⚠️ Docker container is running but not responding to health check" "WARN"
    }
}

# Skip Tailscale funnel monitoring (user requested no monitoring for funnel)
# Funnel is started in background during startup, no auto-restart needed
Write-Log "Skipping Tailscale funnel monitoring (running in background only)" "INFO"

Write-Log "========================================"
Write-Log "Service Monitor Completed"
Write-Log "========================================"

