@echo off
REM Kill aplikasi sebelum installer dimulai
REM Script ini akan di-include ke installer

taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T >nul 2>&1
timeout /t 1 /nobreak >nul
taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T >nul 2>&1
timeout /t 1 /nobreak >nul
taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T >nul 2>&1
