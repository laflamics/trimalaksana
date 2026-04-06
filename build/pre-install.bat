@echo off
REM Script untuk kill aplikasi sebelum installer dimulai
REM Script ini akan dijalankan sebelum installer NSIS

echo Closing PT.Trima Laksana Jaya Pratama...

taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T >nul 2>&1
timeout /t 3 /nobreak >nul
taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T >nul 2>&1
timeout /t 3 /nobreak >nul
taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T >nul 2>&1
timeout /t 3 /nobreak >nul

wmic process where name="PT.Trima Laksana Jaya Pratama.exe" delete >nul 2>&1
timeout /t 3 /nobreak >nul

powershell -Command "Get-Process -Name 'PT.Trima Laksana Jaya Pratama' -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1
timeout /t 3 /nobreak >nul

echo Application closed. Starting installer...

