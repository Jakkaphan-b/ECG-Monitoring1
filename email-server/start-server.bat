@echo off
echo Starting ECG Email Server...
cd /d "E:\github\ECG-Monitoring1\email-server"
echo Server directory: %cd%
echo.
node server.js
pause