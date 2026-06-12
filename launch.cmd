@echo off
setlocal
cd /d "%~dp0"
set NODE_ENV=production
call "%~dp0node_modules\.bin\electron.cmd" .
endlocal
