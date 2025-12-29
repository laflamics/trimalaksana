# Force cleanup script untuk build apps
Write-Host "🧹 Force Cleanup untuk Build Apps..." -ForegroundColor Cyan

# 1. Kill semua proses yang mungkin lock file
Write-Host "`n🔪 Killing processes..." -ForegroundColor Yellow
$processes = @(
    "PT.Trima Laksana Jaya Pratama.exe",
    "electron.exe"
)

foreach ($proc in $processes) {
    try {
        Get-Process -Name $proc.Replace(".exe", "") -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Killed: $proc" -ForegroundColor Green
    } catch {
        # Ignore
    }
}

# Wait untuk proses benar-benar close
Start-Sleep -Seconds 3

# 2. Hapus file installer dengan force
$releaseDir = Join-Path $PSScriptRoot "..\release-build"
if (Test-Path $releaseDir) {
    Write-Host "`n🗑️  Deleting installer files..." -ForegroundColor Yellow
    
    $installerFiles = Get-ChildItem -Path $releaseDir -Filter "*.exe" -ErrorAction SilentlyContinue | 
        Where-Object { $_.Name -like "*Setup*" -or $_.Name -like "*installer*" -or $_.Name -like "*PT.Trima*" }
    
    foreach ($file in $installerFiles) {
        try {
            # Unlock file dulu
            $filePath = $file.FullName
            Write-Host "  🎯 Deleting: $($file.Name)" -ForegroundColor Cyan
            
            # Force delete dengan retry
            $retryCount = 0
            $maxRetries = 5
            while ($retryCount -lt $maxRetries) {
                try {
                    Remove-Item -Path $filePath -Force -ErrorAction Stop
                    Write-Host "    ✓ Deleted: $($file.Name)" -ForegroundColor Green
                    break
                } catch {
                    $retryCount++
                    if ($retryCount -lt $maxRetries) {
                        Start-Sleep -Milliseconds 500
                    } else {
                        Write-Host "    ⚠ Could not delete: $($file.Name) (will be overwritten)" -ForegroundColor Yellow
                    }
                }
            }
        } catch {
            Write-Host "    ⚠ Error: $_" -ForegroundColor Red
        }
    }
}

# 3. Hapus blockmap files
if (Test-Path $releaseDir) {
    $blockmapFiles = Get-ChildItem -Path $releaseDir -Filter "*.blockmap" -ErrorAction SilentlyContinue
    foreach ($file in $blockmapFiles) {
        try {
            Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
            Write-Host "  ✓ Deleted blockmap: $($file.Name)" -ForegroundColor Green
        } catch {
            # Ignore
        }
    }
}

Write-Host "`n✅ Force cleanup completed!" -ForegroundColor Green
