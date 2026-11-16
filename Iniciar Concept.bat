@echo off
cd /d "%~dp0"
title Concept

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Concept necesita Node.js para funcionar.
  echo   Descargalo en https://nodejs.org y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

echo.
echo   Abriendo Concept...
start "Concept" /min cmd /d /c node server.mjs --desktop
