@echo off
setlocal
title RSQL API Debug

if not defined LOCALAPPDATA (
  echo LOCALAPPDATA was not found.
  echo This debug command needs a Windows user profile folder.
  exit /b 1
)

set "LOG_DIR=%LOCALAPPDATA%\RSQL"
set "LOG_FILE=%LOG_DIR%\rsql-api-debug.log"

if not exist "%LOG_DIR%" (
  mkdir "%LOG_DIR%"
)

if not exist "%LOG_FILE%" (
  type nul > "%LOG_FILE%"
)

echo RSQL API Debug
echo.
echo Watching the local bridge log for this Windows user:
echo %LOG_FILE%
echo.
echo Start or restart the bridge if this window stays empty.
echo Press Ctrl+C to stop watching.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -LiteralPath $env:LOG_FILE -Tail 80 -Wait"
