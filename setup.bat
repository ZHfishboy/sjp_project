@echo off
title CalcMaster Setup

echo.
echo ==========================================
echo   CalcMaster Setup
echo ==========================================
echo.

cd /d "%~dp0"

:: Check Node
echo [1/2] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install: https://nodejs.org
    pause
    exit /b 1
)
echo        Node.js OK
node -v

:: .env
echo.
echo [2/2] Installing dependencies...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo        Created backend\.env
) else (
    echo        backend\.env already exists
)

:: Install backend
cd backend
call npm install
cd ..

:: Install frontend
cd frontend
call npm install
cd ..

echo.
echo ==========================================
echo   Setup complete! Run start.bat to launch.
echo ==========================================
echo.
pause
