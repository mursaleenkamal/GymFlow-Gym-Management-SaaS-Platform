@echo off
title GymFlow Mobile Tunnel
echo ================================================================
echo          GymFlow Mobile Access & Temporary URL
echo ================================================================
echo.

echo 1. DIRECT LOCAL WI-FI ACCESS (Fastest, if mobile is on same Wi-Fi):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo    http:%%a:3004
)
echo.
echo 2. STARTING CLOUDFLARE SECURE TUNNEL (Works anywhere on 4G/5G/any Wi-Fi):
echo    No passwords required.
echo.
.\cloudflared.exe tunnel --url http://localhost:3004 --http-host-header localhost
pause
