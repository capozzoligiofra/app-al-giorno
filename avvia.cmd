@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js non trovato: installalo da https://nodejs.org & pause & exit /b 1)
start "" "http://localhost:8787"
node tools\serve.mjs
pause
