# แผนการสำรองข้อมูล การติดตั้ง (Deployment) และการย้อนกลับฉุกเฉิน (Rollback Plan)

มาตรฐานการปฏิบัติงานด้านความมั่นคงปลอดภัยสารสนเทศ โรงพยาบาลสามชุก

---

## 1. แผนการสำรองข้อมูลก่อนเริ่มดำเนินการ (Pre-Deployment Backup)

ก่อนดำเนินการใดๆ กับระบบ Production ให้ดำเนินการ Backup ตามคำสั่งนี้:

### 1.1 สำรองไฟล์ระบบ Procurement เดิม
```cmd
mkdir C:\Backup_Hospital\Procurement_%date:~10,4%%date:~4,2%%date:~7,2%
robocopy C:\inetpub\wwwroot\Procurement C:\Backup_Hospital\Procurement_%date:~10,4%%date:~4,2%%date:~7,2% /E /R:3 /W:5
```

### 1.2 สำรองการตั้งค่า IIS Configuration
```cmd
%windir%\system32\inetsrv\appcmd.exe add backup "Pre_Gateway_Migration"
```

---

## 2. ขั้นตอนการติดตั้งและการสลับระบบ (Cutover Procedure)

**ช่วงเวลาปฏิบัติการที่แนะนำ**: วันเสาร์หรืออาทิตย์ เวลา 20:00 - 22:00 น. นอกช่วงเวลาทำการตรวจโรคทั่วไป

### ตารางลำดับการปฏิบัติงาน (Runsheet)
| เวลา | ขั้นตอน | ผู้รับผิดชอบ | การตรวจสอบ (Verification) |
|---|---|---|---|
| 20:00 | ประกาศ Maintenance Window ชั่วคราว 30 นาที | IT Support | แจ้งกลุ่มไลน์โรงพยาบาล |
| 20:05 | สั่งหยุด Process Procurement Backend เดิมที่ใช้พอร์ต 3002 | System Admin | รัน `scripts\check-port.bat` ต้องรายงานว่า **พอร์ต 3002 ว่าง** |
| 20:10 | นำไฟล์ Central API Gateway ลงที่ `C:\inetpub\wwwroot\Central-API\` | Developer | ตรวจสอบไฟล์ครบถ้วน |
| 20:15 | ตรวจสอบไฟล์ `.env` และ Certificate | System Admin | ตรวจสอบ Thumbprint และ Path ของ Cert |
| 20:18 | รัน `npm test` เพื่อยืนยันสุขภาพของ Gateway | Developer | ต้องผ่าน 10/10 PASS |
| 20:20 | สั่งเริ่ม Gateway ด้วย `scripts\start-gateway.bat` | System Admin | ดู log ใน `logs\gateway-startup.log` |
| 20:22 | ตรวจสอบสถานะด้วย `scripts\status-gateway.bat` | System Admin | Endpoint `https://10.2.0.13:3002/api/health` ต้องตอบสถานะ UP |
| 20:25 | ทดสอบการทำงาน End-to-End จาก Frontend พอร์ต 3001 | QA / Tester | Login, ค้นหาใบสั่งซื้อ, ดูรายการสินค้า |
| 20:30 | สรุปผลและปิดประกาศสิ้นสุด Maintenance | IT Director | ระบบเปิดให้บริการปกติ |

---

## 3. แผนการย้อนกลับฉุกเฉิน (Emergency Rollback Plan)

หากเกิดปัญหาขัดข้องที่แก้ไขไม่ได้ภายใน **15 นาที** ให้ตัดสินใจสั่ง Rollback ทันที:

### ลำดับขั้นตอน Rollback:
1. หยุด Central API Gateway:
   ```cmd
   cd /d C:\inetpub\wwwroot\Central-API\
   scripts\stop-gateway.bat
   ```
2. ตรวจสอบว่าพอร์ต 3002 หลุดจากการจอง:
   ```cmd
   scripts\check-port.bat
   ```
3. เริ่มต้น Procurement Backend เดิมตามวิธีก่อนการปรับปรุง
4. ตรวจสอบว่าระบบ Procurement เดิมกลับมาทำงานปกติ
5. บันทึกสาเหตุของปัญหาเพื่อวิเคราะห์และแก้ไขในรอบถัดไป
