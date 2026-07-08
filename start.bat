@echo off
title Exam Photo Tool - Keep this window open
cd /d "C:\Users\666\.kun\default_workspace\exam-photo-tool"

echo [1/2] Starting API server on port 3001...
start "API-Server" cmd /c "node server.js"

echo [2/2] Starting web server on port 5173...
npx vite --host 0.0.0.0 --port 5173

echo.
echo ============================================
echo Both servers are running!
echo Open http://localhost:5173 in your browser
echo.
echo DO NOT CLOSE this window!
echo ============================================
pause
