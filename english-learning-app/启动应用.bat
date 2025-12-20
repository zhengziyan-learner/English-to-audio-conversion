@echo off
chcp 65001 >nul 2>&1

echo ========================================
echo Starting English Learning App...
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "Backend-Service" cmd /k "cd /d D:\English change\english-learning-app\backend && npm start"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server...
start "Frontend-Service" cmd /k "cd /d D:\English change\english-learning-app\frontend && npm run dev"

echo Waiting for frontend to start...
timeout /t 4 /nobreak >nul

echo.
echo ========================================
echo Opening Browser...
echo ========================================
start http://localhost:5173

echo.
echo Startup Complete!
echo.
echo Tips:
echo   - Backend window: Backend-Service
echo   - Frontend window: Frontend-Service  
echo   - To stop: Press Ctrl+C in each window
echo   - Or run: close-app.bat
echo.
pause
