@echo off
echo Starting Holytron DM-640 (TempleOS)...
echo Opening browser...

start http://localhost:3000

python -m http.server 3000
if %errorlevel% equ 0 goto end

py -3 -m http.server 3000
if %errorlevel% equ 0 goto end

python3 -m http.server 3000
if %errorlevel% equ 0 goto end

npx serve -l 3000
if %errorlevel% equ 0 goto end

echo Could not find Python or Node.js installed to start a local server.
echo Please install Python (python.org) or Node.js (nodejs.org).

:end
pause
