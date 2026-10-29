@echo off
chcp 65001 >nul
echo ========================================================================
echo        โรงพยาบาลสามชุก - ตรวจสอบสถานะการใช้งานพอร์ต 3002
echo ========================================================================

set PORT=3002
set OCCUPIED=0

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%PORT% "') do (
    set OCCUPIED=1
    set TARGET_PID=%%a
    goto :found_process
)

:found_process
if "%OCCUPIED%"=="1" (
    echo [แจ้งเตือน] ตรวจพบว่าพอร์ต %PORT% กำลังถูกใช้งานอยู่!
    echo PID ของ Process ที่ครอบครองพอร์ต: %TARGET_PID%
    echo.
    echo รายละเอียด Process จาก Task Manager:
    tasklist /FI "PID eq %TARGET_PID%" /FO TABLE
    echo.
    echo --------------------------------------------------------------------
    echo [คำเตือนความปลอดภัย]:
    echo ขณะนี้อาจเป็นระบบ Procurement เดิมที่กำลังทำงานอยู่
    echo ห้ามสั่ง taskkill /F โดยเด็ดขาดโดยไม่ได้รับอนุญาตจากหัวหน้างาน
    echo --------------------------------------------------------------------
    exit /b 1
) else (
    echo [สถานะปกติ] พอร์ต %PORT% ว่างอยู่ พร้อมสำหรับการเริ่มต้น Gateway
    exit /b 0
)
