@echo off
chcp 65001 >nul
echo ========================================================================
echo   โรงพยาบาลสามชุก - รันสคริปต์สร้าง Certificate SAN IP 10.2.0.13
echo ========================================================================

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "generate-san-cert.ps1" -TargetIP "10.2.0.13"

echo.
echo การดำเนินการเสร็จสิ้น กรุณาตรวจสอบโฟลเดอร์ certs\
pause
