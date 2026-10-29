@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================================================
echo        โรงพยาบาลสามชุก - เริ่มต้นระบบ CENTRAL API GATEWAY (PORT 3002)
echo ========================================================================

cd /d "%~dp0\.."

set PORT=3002
set PID_FILE=gateway.pid
set LOG_DIR=logs
set STARTUP_LOG=%LOG_DIR%\gateway-startup.log

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%date% %time%] [INFO] ตรวจสอบสถานะก่อนเริ่มระบบ... >> "%STARTUP_LOG%"

:: 1. ตรวจสอบว่า Gateway กำลังรันอยู่แล้วหรือไม่ผ่านไฟล์ PID
if exist "%PID_FILE%" (
    set /p EXISTING_PID=<"%PID_FILE%"
    if defined EXISTING_PID (
        tasklist /FI "PID eq !EXISTING_PID!" 2>NUL | find /I "!EXISTING_PID!" >NUL
        if not errorlevel 1 (
            echo.
            echo [ข้อผิดพลาด] Central API Gateway กำลังทำงานอยู่แล้ว! (PID: !EXISTING_PID!)
            echo ปฏิเสธการเริ่มระบบซ้ำซ้อนเพื่อป้องกันความเสียหาย
            echo หากต้องการหยุดการทำงาน ให้ใช้คำสั่ง: scripts\stop-gateway.bat
            echo.
            echo [%date% %time%] [ABORT] Gateway is already running with PID !EXISTING_PID! >> "%STARTUP_LOG%"
            pause
            exit /b 1
        ) else (
            echo [แจ้งเตือน] พบไฟล์ %PID_FILE% ตกค้าง แต่ Process ไม่อยู่แล้ว กำลังเคลียร์ไฟล์...
            del "%PID_FILE%" >nul 2>&1
        )
    )
)

:: 2. ตรวจสอบว่าพอร์ต 3002 ถูกใช้งานอยู่หรือไม่
set OCCUPIED_PID=
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%PORT% "') do (
    set OCCUPIED_PID=%%a
    goto :port_occupied
)

goto :port_is_free

:port_occupied
if defined OCCUPIED_PID (
    echo.
    echo ========================================================================
    echo [คำเตือนระดับวิกฤต] พอร์ต %PORT% กำลังถูกใช้งานอยู่โดย Process อื่น!
    echo ========================================================================
    echo Process ID ที่ครอบครองพอร์ต: %OCCUPIED_PID%
    echo.
    tasklist /FI "PID eq %OCCUPIED_PID%" /FO TABLE
    echo.
    echo นโยบายความปลอดภัยของโรงพยาบาลสามชุก:
    echo 1. ขณะนี้ระบบ Procurement เดิมอาจกำลังใช้งานพอร์ต 3002 อยู่
    echo 2. ระบบจะไม่ taskkill /F อัตโนมัติ เพื่อป้องกันระบบจัดซื้อหรือเวชระเบียนสะดุด
    echo 3. ห้ามเปิด Gateway ซ้ำ หรือเปลี่ยนพอร์ตเป็นพอร์ตอื่นโดยพลการ
    echo 4. กรุณาตรวจสอบและประสานงานกับผู้ดูแลระบบ Procurement ก่อนดำเนินการย้ายระบบ
    echo.
    echo [%date% %time%] [ABORT] Port %PORT% is already occupied by PID %OCCUPIED_PID% >> "%STARTUP_LOG%"
    pause
    exit /b 1
)

:port_is_free
:: 3. ตรวจสอบความพร้อมของ Node.js และ Dependencies (ไม่รัน npm install ซ้ำทุกครั้ง)
where node >nul 2>&1
if errorlevel 1 (
    echo [ข้อผิดพลาด] ไม่พบโปรแกรม Node.js ในระบบ กรุณาติดตั้ง Node.js v18 ขึ้นไป
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [แจ้งเตือน] ยังไม่พบโฟลเดอร์ node_modules กรุณารัน 'npm install' ครั้งแรกก่อน
    echo หรือติดต่อผู้ดูแลระบบเพื่อติดตั้ง Dependencies
    pause
    exit /b 1
)

if not exist ".env" (
    echo [แจ้งเตือน] ไม่พบไฟล์ .env ระบบจะคัดลอกจาก .env.example
    copy .env.example .env >nul
    echo กรุณาตรวจสอบและตั้งค่าไฟล์ .env ก่อนเริ่มระบบจริง
)

:: 4. เริ่มต้น Central API Gateway ใน Background Process พร้อม Redirect Logs
echo.
echo [กำลังเริ่มต้น] กำลังเปิด Central API Gateway บน HTTPS Port 3002...
echo บันทึก Log ไปที่: %STARTUP_LOG%

start "Samchuk Central API Gateway" /B node index.js >> "%STARTUP_LOG%" 2>&1

:: รอ 2 วินาทีเพื่อให้ Node.js ทำการ Initialise และเขียนไฟล์ PID
timeout /t 2 /nobreak >nul

if exist "%PID_FILE%" (
    set /p NEW_PID=<"%PID_FILE%"
    echo.
    echo ========================================================================
    echo [สำเร็จ] Central API Gateway เริ่มทำงานเรียบร้อยแล้ว!
    echo Process ID (PID): !NEW_PID!
    echo URL: https://10.2.0.13:3002/
    echo Health Check: https://10.2.0.13:3002/api/health
    echo ========================================================================
    echo [%date% %time%] [SUCCESS] Gateway started successfully with PID !NEW_PID! >> "%STARTUP_LOG%"
) else (
    echo.
    echo [แจ้งเตือน] กำลังเริ่มทำงาน กรุณาตรวจสอบผลการรันในไฟล์ %STARTUP_LOG%
)

exit /b 0
