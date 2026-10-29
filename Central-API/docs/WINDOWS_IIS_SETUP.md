# คู่มือการติดตั้ง Central API Gateway บน Windows Server และ IIS

คู่มือนี้สำหรับเจ้าหน้าที่ฝ่ายเทคโนโลยีสารสนเทศ โรงพยาบาลสามชุก ในการติดตั้งและตั้งค่าระบบ Central API Gateway

---

## 1. การจัดเตรียมสภาพแวดล้อม Windows Server

### 1.1 ติดตั้ง Node.js LTS
1. ดาวน์โหลดโปรแกรมติดตั้ง Node.js LTS (Windows Installer `.msi`)
2. ติดตั้งไปที่ไดเรกทอรีมาตรฐาน:
   `C:\Program Files\nodejs\`
3. ตรวจสอบเวอร์ชันผ่าน PowerShell / Command Prompt:
   ```cmd
   node -v
   npm -v
   ```
   (ต้องเป็น Node.js เวอร์ชัน 18.x ขึ้นไป)

### 1.2 ติดตั้ง Git (ทางเลือก)
หากต้องการใช้คำสั่ง Git ในการจัดการเวอร์ชันซอร์สโค้ด

---

## 2. การวางไฟล์โครงการ

1. คัดลอกโฟลเดอร์โครงการไปไว้ที่:
   `C:\inetpub\wwwroot\Central-API\`
2. ตรวจสอบสิทธิ์ Folder Permissions (NTFS):
   - คลิกขวาโฟลเดอร์ `Central-API` -> Properties -> Security
   - ให้สิทธิ์ `Read & Execute` สำหรับกลุ่ม `IIS_IUSRS` หรือ User Service ที่ใช้รัน Node.js
   - สำหรับโฟลเดอร์ `logs\` ให้สิทธิ์ `Modify` เพื่อให้บันทึกไฟล์ Log ได้

---

## 3. การสร้างและการผูก SSL Certificate สำหรับ IP 10.2.0.13

เนื่องจากเบราว์เซอร์จะเชื่อมต่อผ่าน IP Address โดยตรง (`https://10.2.0.13:3002/`) ใบรับรอง SSL จำเป็นต้องมี **IP Subject Alternative Name (SAN)**

### วิธีการสร้าง Self-Signed Certificate:
เปิด PowerShell ในสิทธิ์ Administrator แล้วรัน:
```powershell
cd C:\inetpub\wwwroot\Central-API\scripts
.\generate-san-cert.ps1 -TargetIP "10.2.0.13"
```
สคริปต์จะสร้างไฟล์ `certs\samchuk-gateway.pfx` และ `certs\samchuk-gateway.crt`

### การนำเข้าใบรับรองใน Windows Server:
1. กดปุ่ม `Win + R` พิมพ์ `certlm.msc` แล้วกด Enter (เปิด Local Computer Certificates)
2. ไปที่ **Trusted Root Certification Authorities -> Certificates**
3. คลิกขวา -> **All Tasks -> Import...**
4. เลือกไฟล์ `C:\inetpub\wwwroot\Central-API\certs\samchuk-gateway.crt`
5. ดำเนินการจนเสร็จสิ้น (เป็นการยืนยันความปลอดภัยให้เครื่องในโรงพยาบาลไม่แสดงหน้าต่างแจ้งเตือนสีแดง)

---

## 4. การตั้งค่า IIS (Frontend Port 3001)

ระบบ Frontend ยังคงให้บริการผ่าน IIS ตามปกติ:
1. เปิด **IIS Manager** (`inetmgr`)
2. ไปที่ Sites -> ตรวจสอบ Site ที่รันระบบโรงพยาบาลสามชุก
3. ตรวจสอบ Site Bindings:
   - Type: `https`
   - IP address: `10.2.0.13` (หรือ All Unassigned)
   - Port: `3001`
   - SSL certificate: เลือก Certificate ที่รองรับ `10.2.0.13`
4. โฟลเดอร์ Applications ภายใต้พอร์ต 3001:
   - `/Procurement/` -> ชี้ไปยังโฟลเดอร์ Frontend ของ Procurement
   - `/Sam_Att/` -> ชี้ไปยังโฟลเดอร์ Frontend ของ Sam_Att
   - `/Cash_Cheque/` -> ชี้ไปยังโฟลเดอร์ Frontend ของ Cash_Cheque

---

## 5. การตั้งค่า Windows Firewall

ต้องเปิดรับการเชื่อมต่อขาเข้า (Inbound Rules) สำหรับพอร์ต 3001 และ 3002:

```cmd
:: เปิดพอร์ต 3001 สำหรับ Frontend IIS
netsh advfirewall firewall add rule name="Samchuk_Frontend_IIS_3001" dir=in action=allow protocol=TCP localport=3001

:: เปิดพอร์ต 3002 สำหรับ Backend Central Gateway
netsh advfirewall firewall add rule name="Samchuk_Backend_Gateway_3002" dir=in action=allow protocol=TCP localport=3002
```

---

## 6. การทดสอบการเชื่อมต่อ
1. ทดสอบเปิด Browser ไปที่:
   `https://10.2.0.13:3002/api/health`
2. หน้าจอต้องแสดงสถานะ JSON `status: "UP"` และแสดงรายชื่อโมดูล
