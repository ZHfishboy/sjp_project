@echo off
chcp 65001 >nul
title CalcMaster Stopper

echo.
echo 正在停止 CalcMaster 服务...

:: Kill Node.js processes on standard dev ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
    echo 已停止端口 3000 (后端)
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173.*LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
    echo 已停止端口 5173 (前端)
)

:: Fallback: kill all node.exe dev processes
taskkill /f /im node.exe >nul 2>nul

echo [OK] 所有服务已停止
timeout /t 2 /nobreak >nul
