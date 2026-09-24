@echo off
:: Auto-elevate to Administrator
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /B
)

echo ====================================================
echo  Configuring Windows Firewall for GymFlow (Port 3004)
echo ====================================================
netsh advfirewall firewall delete rule name="GymFlow Dev Server (Port 3004)" >nul 2>&1
netsh advfirewall firewall add rule name="GymFlow Dev Server (Port 3004)" dir=in action=allow protocol=TCP localport=3004 profile=any

echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Port 3004 is now OPEN in Windows Firewall!
    echo.
    echo Accessible on your local network at:
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
        echo   http:%%a:3004
    )
) else (
    echo [ERROR] Failed to add firewall rule.
)
echo.
pause
