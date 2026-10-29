@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================================================
echo        โรงพยาบาลสามชุก - หยุดการทำงานของ CENTRAL API GATEWAY
echo ========================================================================

cd /d "%~dp0\.."

set PID_FILE=gateway.pid
set LOG_DIR=logs
set SHUTDOWN_LOG=%LOG_DIR%\gateway-startup.log

if not exist "%PID_FILE%" (
    echo [แจ้งเตือน] ไม่พบไฟล์ %PID_FILE%
    echo ตรวจสอบว่า Gateway กำลังทำงานอยู่หรือไม่ผ่าน scripts\status-gateway.bat
    exit /b 0
)

set /p GATEWAY_PID=<"%PID_FILE%"

if not defined GATEWAY_PID (
    echo [แจ้งเตือน] ไฟล์ %PID_FILE% ว่างเปล่า กำลังลบไฟล์...
    del "%PID_FILE%" >nul 2>&1
    exit /b 0
)

echo กำลังตรวจสอบ Process ID: %GATEWAY_PID%...
tasklist /FI "PID eq %GATEWAY_PID%" 2>NUL | find /I "%GATEWAY_PID%" >NUL
if errorlevel 1 (
    echo [ข้อมูล] Process ID %GATEWAY_PID% ไม่ได้ทำงานอยู่แล้ว
    del "%PID_FILE%" >nul 2>&1
    echo ลบไฟล์ %PID_FILE% เรียบร้อย
    exit /b 0
)

echo กำลังส่งสัญญาณปิดการทำงานอย่างปลอดภัย (Graceful Shutdown) ไปยัง PID %GATEWAY_PID%...
:: ใช้ taskkill แบบธรรมดา (ไม่ใส่ /F) ก่อน เพื่อให้ Node.js เรียก graceful shutdown listener
taskkill /PID %GATEWAY_PID% >nul 2>&1

:: รอให้ process ปิดตัวลงไม่เกิน 5 วินาที
timeout /t 3 /nobreak >nul

tasklist /FI "PID eq %GATEWAY_PID%" 2>NUL | find /I "%GATEWAY_PID%" >NUL
if not errorlevel 1 (
    echo Process ยังไม่ปิด กำลังบังคับปิดเฉพาะ PID %GATEWAY_PID% ของ Gateway...
    taskkill /F /PID %GATEWAY_PID% >nul 2>&1
)

del "%PID_FILE%" >nul 2>&1
echo [%date% %time%] [STOPPED] Central API Gateway PID %GATEWAY_PID% stopped >> "%SHUTDOWN_LOG%"

echo ========================================================================
echo [สำเร็จ] หยุดการทำงานของ Central API Gateway เรียบร้อยแล้ว
echo ========================================================================
exit /b 0
