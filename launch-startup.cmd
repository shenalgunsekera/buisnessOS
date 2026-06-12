@echo off
setlocal
cd /d "%~dp0"
set NODE_ENV=production
set BUSINESSOS_HIDDEN=1
call "%~dp0node_modules\.bin\electron.cmd" .
endlocal
