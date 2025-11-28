@echo off
title MAARGA Biker Tracking App Launcher
echo.
echo ========================================
echo    MAARGA - Biker Tracking App
echo ========================================
echo.
echo Starting your biker tracking application...
echo.

REM Navigate to the app directory
cd /d "%~dp0"

REM Open the main app file in default browser
echo Opening MAARGA app in your browser...
start "" "index.html"

echo.
echo ========================================
echo  MAARGA App Features:
echo ========================================
echo  * Real-time GPS tracking
echo  * 500m geo-fence safety zone  
echo  * Smart speed notifications
echo  * Emergency SOS alerts
echo  * Group coordination
echo  * Stop detection system
echo ========================================
echo.
echo The app is now running in your browser!
echo.
echo If it doesn't open automatically, you can:
echo 1. Navigate to this folder in File Explorer
echo 2. Double-click on "index.html"
echo.
echo Press any key to exit this launcher...
pause >nul