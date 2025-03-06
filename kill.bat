@echo off
REM Find and terminate the Node.js process

REM Use taskkill to stop all node processes
taskkill /f /im node.exe > nul 2>&1

REM Inform the user
echo Node.js server stopped.

REM Close the batch script
exit
