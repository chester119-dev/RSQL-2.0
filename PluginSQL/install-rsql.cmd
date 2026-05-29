@echo off
setlocal

set "SCRIPT=%~dp0scripts\install-rsql.ps1"

if not exist "%SCRIPT%" (
  echo Could not find installer script:
  echo %SCRIPT%
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
exit /b %ERRORLEVEL%
