#!/bin/bash
# CalcMaster One-Click Launcher (Git Bash / WSL / Linux)

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     CalcMaster 一键启动器 v1.0           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Node
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found. Install: https://nodejs.org"
    exit 1
fi

# .env
if [ ! -f "backend/.env" ]; then
    echo "[SETUP] Creating .env..."
    cp backend/.env.example backend/.env
fi

# Install deps
if [ ! -d "node_modules" ]; then
    echo "[SETUP] Installing launcher deps..."
    npm install --silent
fi

if [ ! -d "backend/node_modules" ]; then
    echo "[SETUP] Installing backend deps..."
    (cd backend && npm install --silent)
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "[SETUP] Installing frontend deps..."
    (cd frontend && npm install --silent)
fi

echo ""
echo "┌──────────────────────────────────────────┐"
echo "│  CalcMaster 启动中...                     │"
echo "│                                          │"
echo "│  Backend  : http://localhost:3000         │"
echo "│  Frontend : http://localhost:5173         │"
echo "│                                          │"
echo "│  Press Ctrl+C to stop all                │"
echo "└──────────────────────────────────────────┘"
echo ""

# Launch both
npm run dev
