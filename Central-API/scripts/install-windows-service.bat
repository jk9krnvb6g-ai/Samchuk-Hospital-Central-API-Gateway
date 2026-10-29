@echo off
chcp 65001 >nul
echo ========================================================================
echo  โรงพยาบาลสามชุก - คำแนะนำติดตั้ง Central API Gateway เป็น Windows Service
echo ========================================================================
echo.
echo แนะนำให้ใช้ NSSM (Non-Sucking Service Manager) หรือ WinSW
echo เพื่อให้ Gateway เริ่มต้นทำงานอัตโนมัติเมื่อ Windows Server บูตเครื่องใหม่
echo.
echo ตัวอย่างคำสั่งด้วย NSSM:
echo   1. ดาวน์โหลด nssm.exe แล้วคัดลอกมาที่ C:\inetpub\wwwroot\Central-API\
echo   2. เปิด CMD ด้วยสิทธิ์ Administrator
echo   3. รันคำสั่งต่อไปนี้:
echo.
echo      nssm install SamchukCentralGateway "C:\Program Files\nodejs\node.exe" "C:\inetpub\wwwroot\Central-API\index.js"
echo      nssm set SamchukCentralGateway AppDirectory "C:\inetpub\wwwroot\Central-API"
echo      nssm set SamchukCentralGateway AppStdout "C:\inetpub\wwwroot\Central-API\logs\service-stdout.log"
echo      nssm set SamchukCentralGateway AppStderr "C:\inetpub\wwwroot\Central-API\logs\service-stderr.log"
echo      nssm set SamchukCentralGateway Start SERVICE_AUTO_START
echo.
echo   4. เริ่มต้น Service:
echo      nssm start SamchukCentralGateway
echo.
echo   5. ตรวจสอบสถานะ Service:
echo      sc query SamchukCentralGateway
echo.
echo ========================================================================
pause
