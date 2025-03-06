@echo off
REM Run the Node.js server in a detached background process
start "" /b node server.mjs

REM Give the server a moment to start
timeout /t 1 > nul

REM Open localhost:3300 in the default browser
start http://localhost:3300

REM Close the batch script
exit
