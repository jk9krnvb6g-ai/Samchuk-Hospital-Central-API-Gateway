@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================================================
echo        โรงพยาบาลสามชุก - ตรวจสอบสถานะ CENTRAL API GATEWAY
echo ========================================================================

cd /d "%~dp0\.."

set PORT=3002
set PID_FILE=gateway.pid

echo [1/3] ตรวจสอบไฟล์สถานะ Process (gateway.pid)...
if exist "%PID_FILE%" (
    set /p RUNNING_PID=<"%PID_FILE%"
    echo   - พบไฟล์ PID: !RUNNING_PID!
    tasklist /FI "PID eq !RUNNING_PID!" /FO TABLE 2>NUL
) else (
    echo   - ไม่พบไฟล์ gateway.pid (Gateway ไม่ได้รันอยู่ หรือรันเป็น Service)
)

echo.
echo [2/3] ตรวจสอบสถานะ Network Listener บนพอร์ต %PORT%...
set PORT_OCCUPIED=0
for /f "tokens=2,5" %%a in ('netstat -ano ^| findstr /R /C:":%PORT% "') do (
    set PORT_OCCUPIED=1
    echo   - ตรวจพบการฟังการเชื่อมต่อที่ %%a (PID: %%b)
    tasklist /FI "PID eq %%b" /FO TABLE /NH
)

if "%PORT_OCCUPIED%"=="0" (
    echo   - ไม่มี Process ใดครอบครองพอร์ต %PORT% (สถานะ: ปิดอยู่)
)

echo.
echo [3/3] ตรวจสอบความพร้อมของ Health Check API...
powershell -Command "try { $res = Invoke-RestMethod -Uri 'https://10.2.0.13:3002/api/health' -SkipCertificateCheck -TimeoutSec 3; Write-Host '  - การตอบสนองจาก Health Endpoint:' -ForegroundColor Green; $res | ConvertTo-Json -Depth 3 } catch { Write-Host '  - ไม่สามารถเรียก https://10.2.0.13:3002/api/health ได้ (' + $_.Exception.Message + ')' -ForegroundColor Yellow }"

echo ========================================================================
exit /b 0
