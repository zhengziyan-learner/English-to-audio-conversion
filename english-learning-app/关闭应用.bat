@echo off
chcp 65001 >nul 2>&1

echo ========================================
echo Closing English Learning App...
echo ========================================
echo.

echo Stopping backend services...
taskkill /f /im node.exe 2>nul
if %errorlevel%==0 (
    echo Backend services stopped successfully
) else (
    echo No backend services running
)

echo.
echo ========================================
echo All Services Closed
echo ========================================
echo.
pause
