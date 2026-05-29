@echo off
set "ROOT=%~dp0"

start "RSQL Bridge :34872" cmd /k "cd /d ""%ROOT%bridge"" && npm.cmd run dev"
start "RSQL Web :5173" cmd /k "cd /d ""%ROOT%web"" && npm.cmd run dev"

echo RSQL is starting.
echo Bridge: http://localhost:34872/health
echo Web:    http://localhost:5173
