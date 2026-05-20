@echo off
title CalcMaster

echo.
echo ==========================================
echo   CalcMaster Starting...
echo   Backend  : http://localhost:3000
echo   Frontend : http://localhost:5173
echo   Health   : http://localhost:3000/api/v1/health
echo   Press Ctrl+C to stop
echo ==========================================
echo.

cd /d "%~dp0"

:: Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    pause
    exit /b 1
)

:: .env
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
)

:: Install if missing
if not exist "node_modules" call npm install
if not exist "backend\node_modules" (cd backend && call npm install && cd ..)
if not exist "frontend\node_modules" (cd frontend && call npm install && cd ..)

:: Start
call npm run dev
pause
