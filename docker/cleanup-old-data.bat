@echo off
REM Delete all old JSON data files to start fresh

echo.
echo ============================================
echo Deleting old localStorage data files...
echo ============================================
echo.

REM Navigate to data/localStorage folder
cd /d "%~dp0..\data\localStorage"

REM Delete all JSON files
del /q *.json 2>nul

echo ✓ Deleted all old data files

echo.
echo ============================================
echo Remaining files in data/localStorage:
echo ============================================
dir /b

echo.
echo ============================================
echo Cleanup complete!
echo ============================================
echo.
echo Next steps on Laptop Dev:
echo 1. Open browser DevTools (F12)
echo 2. Go to Application > Local Storage
echo 3. Right-click and "Clear All"
echo 4. Reload the page
echo 5. Test adding new data - should persist to server
echo.
pause
