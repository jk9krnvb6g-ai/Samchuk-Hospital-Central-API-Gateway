# Central API Gateway - โรงพยาบาลสามชุก (Samchuk Hospital)

ระบบ **Central API Gateway** พัฒนาด้วย **Node.js + Express** สำหรับติดตั้งบน **Windows Server** และทำงานร่วมกับ **IIS** ทำหน้าที่เป็นประตูทางผ่านศูนย์กลางสำหรับบริการ Backend API ทั้งหมดของโรงพยาบาลสามชุก

---

## สารบัญ

1. [ภาพรวมสถาปัตยกรรม (Architecture Overview)](#1-ภาพรวมสถาปัตยกรรม)
2. [ข้อกำหนดพอร์ตและเครือข่าย (Port & Network Rules)](#2-ข้อกำหนดพอร์ตและเครือข่าย)
3. [โครงสร้างไดเรกทอรีโครงการ](#3-โครงสร้างไดเรกทอรีโครงการ)
4. [รายการไฟล์และหน้าที่การทำงาน](#4-รายการไฟล์และหน้าที่การทำงาน)
5. [การติดตั้งและตั้งค่าบน Windows Server](#5-การติดตั้งและตั้งค่าบน-windows-server)
6. [การกำหนดค่า HTTPS และ SSL Certificate (SAN IP 10.2.0.13)](#6-การกำหนดค่า-https-และ-ssl-certificate)
7. [การทำงานของระบบ Module Registry & Adapter Interface](#7-การทำงานของระบบ-module-registry)
8. [คู่มือขั้นตอนเชื่อมต่อ Procurement Router (ระบบจัดซื้อเดิม)](#8-คู่มือขั้นตอนเชื่อมต่อ-procurement-router)
9. [คู่มือขั้นตอนเพิ่ม Sam_Att และ Cash_Cheque](#9-คู่มือขั้นตอนเพิ่ม-sam_att-และ-cash_cheque)
10. [คู่มือการเพิ่มระบบใหม่ในอนาคต (เช่น Inventory)](#10-คู่มือการเพิ่มระบบใหม่ในอนาคต)
11. [สคริปต์ควบคุม Windows BAT (Start, Stop, Status, Check-Port)](#11-สคริปต์ควบคุม-windows-bat)
12. [การทดสอบระบบแบบอัตโนมัติ (Automated Tests)](#12-การทดสอบระบบแบบอัตโนมัติ)
13. [แผนการสำรองข้อมูล การย้ายระบบ และ Rollback (Change Management)](#13-แผนการสำรองข้อมูล-การย้ายระบบ-และ-rollback)
14. [สรุปข้อควรปฏิบัติก่อนนำขึ้นใช้งานจริงบน Production](#14-สรุปข้อควรปฏิบัติก่อนนำขึ้นใช้งานจริงบน-production)

---

## 1. ภาพรวมสถาปัตยกรรม

```
+-----------------------------------------------------------------------------------+
|                        Windows Server (IP: 10.2.0.13)                             |
|                                                                                   |
|  [ Frontend Layer: IIS Web Server ]                                               |
|  - Binding: HTTPS Port 3001                                                       |
|  - Path: https://10.2.0.13:3001/Procurement/                                      |
|  - Path: https://10.2.0.13:3001/Sam_Att/                                          |
|  - Path: https://10.2.0.13:3001/Cash_Cheque/                                      |
|                                                                                   |
|         │ (AJAX / Fetch API Calls ข้ามพอร์ตพร้อม credentials: true)                |
|         ▼                                                                         |
|  [ Backend Gateway Layer: Central API Gateway (Node.js) ]                         |
|  - Binding: HTTPS Port 3002 ONLY (ห้ามเปิดพอร์ตอื่น)                                 |
|  - Host: 0.0.0.0:3002 (หรือ 10.2.0.13:3002)                                       |
|  - Security: TLS 1.2+, Helmet Headers, Strict CORS Allowlist (3001 Only)          |
|  - Rate Limiting, Sanitized Audit Logs, Correlation ID Tracking                   |
|                                                                                   |
|         │                                                                         |
|         ├── /api/Procurement/ ──> [ Procurement Router ]                          |
|         │                          ├── Database: Procurement DB Pool              |
|         │                          └── Logic: จัดซื้อจัดจ้าง (ไม่เปิด Port แยก)       |
|         │                                                                         |
|         ├── /api/Sam_Att/     ──> [ Sam_Att Router ]                              |
|         │                          ├── Database: Attendance DB Pool               |
|         │                          └── Logic: ลงเวลาปฏิบัติงาน (ไม่เปิด Port แยก)     |
|         │                                                                         |
|         ├── /api/Cash_Cheque/ ──> [ Cash_Cheque Router ]                          |
|         │                          ├── Database: Cash/Finance DB Pool             |
|         │                          └── Logic: เงินสดและเช็ค (ไม่เปิด Port แยก)         |
|         │                                                                         |
|         └── /api/health       ──> [ Gateway Health & Diagnostics ]                |
+-----------------------------------------------------------------------------------+
```

---

## 2. ข้อกำหนดพอร์ตและเครือข่าย

1. **HTTPS Port 3001**: ใช้งานเฉพาะ Frontend Web Application ผ่าน IIS เท่านั้น
2. **HTTPS Port 3002**: ใช้งานเฉพาะ Backend API ผ่าน Central API Gateway เท่านั้น
3. **ห้ามเปิด TCP HTTP/HTTPS Listener บนพอร์ตอื่นโดยเด็ดขาด** (รวมถึง 127.0.0.1:3003 หรือพอร์ตชั่วคราวอื่น)
4. **ห้ามสร้าง Backend Server แยก Process ที่เปิดพอร์ตของตัวเอง**
5. **ห้ามใช้ HTTP ธรรมดา** ทั้งหมดต้องเข้ารหัสผ่าน HTTPS

---

## 3. โครงสร้างไดเรกทอรีโครงการ

ติดตั้งที่พาธมาตรฐานบน Windows Server:
`C:\inetpub\wwwroot\Central-API\`

```
Central-API/
├── index.js                     # HTTPS Listener, Pre-flight Port Check, Graceful Shutdown
├── app.js                       # Express Application Core (แยกจาก Listener เพื่อทดสอบได้)
├── package.json                 # Node.js Dependencies และคำสั่งสคริปต์
├── .env.example                 # ตัวอย่างการกำหนดค่า Environment Variables
├── config/
│   ├── index.js                 # รวมการตั้งค่าและการตรวจสอบความถูกต้อง (Validation)
│   ├── tls.js                   # ตัวโหลดใบรับรอง SSL/TLS (รองรับ PEM และ PFX)
│   ├── cors.js                  # การกำหนดสิทธิ์ CORS สำหรับ HTTPS 3001
│   └── modules.js              # รายการ Subsystem Modules ที่ลงทะเบียนในระบบ
├── middleware/
│   ├── request-id.js            # กำหนด X-Correlation-ID สำหรับติดตามคำขอ
│   ├── security.js              # Helmet Security Headers (HSTS, NoSniff, FrameGuard)
│   ├── logger.js                # บันทึกประวัติคำขอโดย Masking ข้อมูลสำคัญ (Passwords, Tokens, CID)
│   ├── rate-limit.js            # In-Memory Rate Limiter ป้องกันการยิงถล่มฐานข้อมูล
│   └── error-handler.js         # ป้องกันการเปิดเผย Stack Trace และจัดการ 404 / 403 / 500
├── modules/
│   ├── registry.js              # Module Registry รองรับการ Mount และเพิ่มโมดูลใหม่แบบ Dynamic
│   ├── adapter-interface.js     # สัญญาเชื่อมต่อ (Interface Contract) สำหรับ Subsystem Router
│   ├── procurement/             # Adapter สำหรับระบบจัดซื้อจัดจ้าง
│   │   ├── index.js
│   │   └── adapter.js
│   ├── sam-att/                 # Adapter สำหรับระบบลงเวลาปฏิบัติงาน
│   │   ├── index.js
│   │   └── adapter.js
│   ├── cash-cheque/             # Adapter สำหรับระบบเงินสดและเช็ค
│   │   ├── index.js
│   │   └── adapter.js
│   └── example-module-template/ # แม่แบบสำหรับการพัฒนาระบบใหม่ (เช่น Inventory)
│       └── router.sample.js
├── scripts/
│   ├── check-port.bat           # ตรวจสอบว่าพอร์ต 3002 ว่างหรือมี Process ใดครอบครอง (พร้อมแสดง PID)
│   ├── start-gateway.bat        # ตรวจสอบเงื่อนไขความปลอดภัยและเริ่มทำงาน Gateway
│   ├── stop-gateway.bat         # ปิด Gateway อย่างปลอดภัยด้วย PID โดยไม่กระทบ Process อื่น
│   ├── status-gateway.bat       # ตรวจสอบสถานะการทำงานและทดสอบ Health API
│   ├── generate-san-cert.ps1    # PowerShell สร้าง Self-Signed Certificate SAN IP 10.2.0.13
│   ├── generate-san-cert.bat    # สคริปต์รัน PowerShell สร้างใบรับรอง
│   └── install-windows-service.bat # คู่มือและสคริปต์ลงทะเบียนเป็น Windows Service
└── tests/
    ├── in-process-tester.js     # ตัวจำลอง HTTP Request ในหน่วยความจำ (Zero Network Socket)
    └── run-tests.js             # ชุดทดสอบอัตโนมัติครบทั้ง 10 ข้อกำหนด
```

---

## 4. รายการไฟล์และหน้าที่การทำงาน

| ไฟล์ / โฟลเดอร์ | หน้าที่รับผิดชอบ |
|---|---|
| `index.js` | รับผิดชอบเรื่อง Network Lifecycle: ตรวจสอบพอร์ต 3002 ซ้ำซ้อน, โหลด TLS Certificate, เริ่มต้น https.createServer, เขียน/ลบ gateway.pid, ดักจับ SIGINT/SIGTERM เพื่อ Graceful Shutdown |
| `app.js` | นิยาม Express Application Pipeline: ลำดับ Middleware ความปลอดภัย, Request ID, CORS, Parsers, Rate Limiting, Health Endpoint (`/api/health`), Dynamic Route Dispatching, 404 & Error Handler |
| `config/tls.js` | โหลด SSL/TLS Cert และ Key จาก Environment Variables; ปฏิเสธการทำงานหากไม่พบไฟล์; บังคับใช้ TLS 1.2+ และไม่อนุญาตการปิด Reject Unauthorized |
| `config/cors.js` | ควบคุม Origin Allowlist เฉพาะ `https://10.2.0.13:3001` และเปิด `credentials: true` เพื่อให้ส่ง Cookie/Session ข้ามพอร์ต 3001 -> 3002 ได้อย่างปลอดภัย |
| `middleware/logger.js` | บันทึก Log การทำงานทั้ง Console และ File รายวัน โดยอัตโนมัติ Mask ค่า Password, CID, Auth Header, Token ป้องกันข้อมูลรั่วไหล |
| `middleware/error-handler.js` | ดักจับ Error ทั้งหมด; ซ่อน Stack Trace ใน Production; ส่งออก JSON Schema มาตรฐานพร้อม Correlation ID |
| `modules/registry.js` | จัดการวงจรชีวิตของ Subsystem Modules; โหลด Router จาก External Path หรือเปิด Adapter Fallback (503 NOT_CONFIGURED) อย่างปลอดภัย |
| `modules/adapter-interface.js` | ตรวจสอบ Contract ของโมดูลภายนอก ห้ามโมดูลย่อยเรียก `.listen()` และสร้าง Fallback Router |

---

## 5. การติดตั้งและตั้งค่าบน Windows Server

### ข้อกำหนดขั้นต่ำ
- Windows Server 2016 / 2019 / 2022
- Node.js LTS (v18.x, v20.x หรือ v22.x) ติดตั้งที่ `C:\Program Files\nodejs\`
- สิทธิ์ Local Administrator บน Windows Server

### ขั้นตอนการติดตั้ง
1. คัดลอกโฟลเดอร์โครงการไปไว้ที่:
   `C:\inetpub\wwwroot\Central-API\`
2. เปิด Command Prompt (CMD) ในโหมด Administrator:
   ```cmd
   cd /d C:\inetpub\wwwroot\Central-API
   ```
3. คัดลอกไฟล์การตั้งค่าและแก้ไขให้ตรงกับสภาพแวดล้อม:
   ```cmd
   copy .env.example .env
   ```
4. ติดตั้ง Node.js Dependencies:
   ```cmd
   npm install --production
   ```
5. รัน Automated Test เพื่อยืนยันความพร้อมของซอร์สโค้ด:
   ```cmd
   npm test
   ```

---

## 6. การกำหนดค่า HTTPS และ SSL Certificate

Gateway บังคับใช้ HTTPS บนพอร์ต 3002 โดยรองรับการเชื่อมต่อผ่าน IP `10.2.0.13` ผ่านกลไก **Subject Alternative Name (SAN)**

### วิธีที่ 1: การใช้ใบรับรองจาก Windows Certificate Store (แนะนำ)
หากองค์กรมี CA ภายใน หรือออกใบรับรองสำหรับ IP 10.2.0.13 ในรูปแบบ PFX:
1. นำไฟล์ `.pfx` มาวางที่ `C:\inetpub\wwwroot\Central-API\certs\samchuk-gateway.pfx`
2. ตั้งค่าในไฟล์ `.env`:
   ```env
   SSL_ENABLED=true
   SSL_PFX_PATH=C:\inetpub\wwwroot\Central-API\certs\samchuk-gateway.pfx
   SSL_PASSPHRASE=รหัสผ่านPFXของคุณ
   ```

### วิธีที่ 2: การสร้าง Self-Signed Certificate ด้วย PowerShell (พร้อม SAN IP 10.2.0.13)
เราเตรียมสคริปต์อัตโนมัติไว้ใน `scripts/generate-san-cert.ps1`:
1. รันสคริปต์:
   ```cmd
   scripts\generate-san-cert.bat
   ```
2. สคริปต์จะสร้างไฟล์:
   - `certs\samchuk-gateway.crt` (Public Certificate)
   - `certs\samchuk-gateway.pfx` (PFX พร้อม Private Key)
3. ติดตั้ง `samchuk-gateway.crt` ลงใน:
   **Local Computer -> Trusted Root Certification Authorities**
   เพื่อให้ Browser และเครื่องลูกข่ายเชื่อถือ IP `10.2.0.13` โดยไม่มีข้อความเตือนความไม่ปลอดภัย

---

## 7. การทำงานของระบบ Module Registry

Module Registry ถูกออกแบบตามสถาปัตยกรรม Micro-Kernel / Pluggable Modular System:
- Gateway เป็นเพียง Reverse Router Host
- ไม่มีการรวม Database Pool เข้ามาใน Gateway
- แต่ละระบบมี Connection String, User Auth, และ Query Logic ของตัวเอง
- หากไฟล์ระบบย่อยยังไม่พร้อม Gateway จะตอบกลับ:
  ```json
  {
    "success": false,
    "error": {
      "code": "MODULE_NOT_CONFIGURED",
      "systemId": "procurement",
      "systemName": "Procurement (ระบบจัดซื้อจัดจ้าง)",
      "prefix": "/api/Procurement",
      "message": "ระบบ Procurement (ระบบจัดซื้อจัดจ้าง) ยังไม่ได้ลงทะเบียน Backend Router เข้าสู่ Central Gateway",
      "correlationId": "samchuk-1793263313093-855e24d2"
    }
  }
  ```

---

## 8. คู่มือขั้นตอนเชื่อมต่อ Procurement Router (ระบบจัดซื้อเดิม)

> **ข้อควรระวังสำคัญ**: ปัจจุบัน Procurement Backend เดิมกำลังใช้งานพอร์ต 3002 อยู่บนเซิร์ฟเวอร์จริง **ห้ามสั่งหยุด Procurement หรือสั่งทับซ้อนในเวลาราชการ**

### ขั้นตอนการปรับแต่ง Procurement Backend เดิมให้เป็น Router:
1. เข้าไปที่โฟลเดอร์ของระบบ Procurement:
   `C:\inetpub\wwwroot\Procurement\backend\`
2. ตรวจสอบไฟล์ Entry Point เดิม (เช่น `server.js` หรือ `index.js`)
3. แยกส่วน Router ออกมาเป็นไฟล์ `router.js` ตัวอย่างเช่น:
   ```javascript
   // C:\inetpub\wwwroot\Procurement\backend\router.js
   const express = require('express');
   const router = express.Router();
   
   // Import Route ย่อยของ Procurement ตามโครงสร้างเดิม
   const authRoutes = require('./routes/auth');
   const purchaseOrderRoutes = require('./routes/purchase-order');
   const vendorRoutes = require('./routes/vendor');
   
   // เชื่อมต่อ Route ย่อย
   router.use('/auth', authRoutes);
   router.use('/purchase-orders', purchaseOrderRoutes);
   router.use('/vendors', vendorRoutes);
   
   // ห้ามเรียก app.listen() หรือ https.createServer() ในไฟล์นี้!
   module.exports = router;
   ```
4. ในไฟล์ `.env` ของ Central-API ให้กำหนด:
   ```env
   MODULE_PROCUREMENT_ENABLED=true
   MODULE_PROCUREMENT_PATH=C:\inetpub\wwwroot\Procurement\backend\router.js
   ```

---

## 9. คู่มือขั้นตอนเพิ่ม Sam_Att และ Cash_Cheque

สำหรับระบบ **Sam_Att** (ลงเวลา) และ **Cash_Cheque** (เงินสดและเช็ค):

1. ในโฟลเดอร์ของแต่ละระบบ ให้สร้างไฟล์ `router.js` ที่ export `express.Router()`
2. กำหนดพาธในไฟล์ `.env` ของ Gateway:
   ```env
   MODULE_SAM_ATT_ENABLED=true
   MODULE_SAM_ATT_PATH=C:\inetpub\wwwroot\Sam_Att\backend\router.js

   MODULE_CASH_CHEQUE_ENABLED=true
   MODULE_CASH_CHEQUE_PATH=C:\inetpub\wwwroot\Cash_Cheque\backend\router.js
   ```
3. เมื่อ Gateway เริ่มทำงาน จะตรวจพบไฟล์และ Mount เข้าที่:
   - `https://10.2.0.13:3002/api/Sam_Att/*`
   - `https://10.2.0.13:3002/api/Cash_Cheque/*`

---

## 10. คู่มือการเพิ่มระบบใหม่ในอนาคต (เช่น Inventory)

คุณสามารถเพิ่มระบบใหม่ได้โดยไม่ต้องแก้ไข Core Engine ของ Gateway:

### วิธีที่ 1: ผ่านไฟล์ `.env`
ในไฟล์ `.env`:
```env
MODULE_INVENTORY_ENABLED=true
MODULE_INVENTORY_PATH=C:\inetpub\wwwroot\Inventory\backend\router.js
```

### วิธีที่ 2: ผ่านโค้ดหรือโมดูลภายนอก
```javascript
const registry = require('./modules/registry');

registry.register({
  id: 'inventory',
  name: 'Inventory (ระบบพัสดุและคลังยา)',
  prefix: '/api/Inventory',
  enabled: true,
  externalPath: 'C:\\inetpub\\wwwroot\\Inventory\\backend\\router.js'
});
```

---

## 11. สคริปต์ควบคุม Windows BAT

| สคริปต์ | การทำงาน | มาตรการความปลอดภัย |
|---|---|---|
| `scripts\check-port.bat` | ตรวจสอบพอร์ต 3002 ผ่าน `netstat -ano` | แสดง PID และชื่อ Process ปัจจุบันอย่างชัดเจน |
| `scripts\start-gateway.bat` | เริ่มต้น Gateway | **ตรวจสอบพอร์ตก่อนเริ่ม** หากพบพอร์ต 3002 ถูกใช้งาน จะยกเลิกทันที (ไม่สั่ง taskkill /F อัตโนมัติเด็ดขาด) |
| `scripts\stop-gateway.bat` | หยุด Gateway | อ่าน PID จาก `gateway.pid` และส่ง Graceful Shutdown เฉพาะ Process ของ Gateway เท่านั้น |
| `scripts\status-gateway.bat` | ตรวจสอบสถานะ | ตรวจสอบทั้ง PID, Socket Listening และเรียกทดสอบ Health Check API |

---

## 12. การทดสอบระบบแบบอัตโนมัติ (Automated Tests)

รันชุดทดสอบด้วยคำสั่ง:
```cmd
npm test
```
หรือ
```cmd
node tests/run-tests.js
```

### รายการ 10 การทดสอบที่ครอบคลุม:
1. **Gateway ลงทะเบียน Router ของระบบต่างๆ ได้** (Procurement, Sam_Att, Cash_Cheque)
2. **API Prefix ของแต่ละระบบถูกต้องตามตัวพิมพ์ (Exact Case)**
3. **ไม่มี Route Conflict หรือ Shadowing**
4. **Module แยกขาดและไม่เปิด Listener ของตัวเอง** (ป้องกัน Conflict)
5. **Error Handling ทำงานถูกต้อง** (ตอบกลับ 404 และ 403 แบบ JSON Schema ไร้ Stack Trace)
6. **Health Check ทำงานสมบูรณ์** (ตอบกลับสถานะ UP และไม่เปิดเผยรหัสผ่านหรือความลับ)
7. **HTTPS Configuration ถูกต้อง** (รองรับ IP SAN 10.2.0.13 และปฏิเสธ rejectUnauthorized=false)
8. **Gateway ปฏิเสธการเริ่มเมื่อพอร์ต 3002 ถูกครอบครอง** (Pre-flight EADDRINUSE Protection)
9. **ไม่มีการเปลี่ยนพอร์ตโดยอัตโนมัติ** (บังคับใช้เฉพาะพอร์ต 3002 ตามกฎโรงพยาบาล)
10. **สามารถเพิ่ม Module ใหม่ (เช่น Inventory) ได้โดยไม่เปลี่ยนโครงสร้างหลัก**

---

## 13. แผนการสำรองข้อมูล การย้ายระบบ และ Rollback

### ระยะที่ 1: ขั้นเตรียมการ (Pre-Cutover)
1. สำรองข้อมูลโฟลเดอร์ Procurement เดิมทั้งหมด:
   ```cmd
   robocopy C:\inetpub\wwwroot\Procurement C:\Backup_Hospital\Procurement_PreGateway /E
   ```
2. ติดตั้ง Central API Gateway ที่ `C:\inetpub\wwwroot\Central-API\`
3. ทดสอบการรัน `npm test` เพื่อตรวจสอบความสมบูรณ์ของโค้ด

### ระยะที่ 2: ขั้นตอนสลับระบบ (Cutover Window - ดำเนินการนอกเวลาราชการ เช่น 20:00 น.)
1. หยุด Service หรือ Process ของ Procurement Backend เดิมที่ใช้พอร์ต 3002
2. รัน `scripts\check-port.bat` เพื่อยืนยันว่าพอร์ต 3002 ว่างจริง
3. รัน `scripts\start-gateway.bat` เพื่อเปิด Central API Gateway
4. รัน `scripts\status-gateway.bat` และทดสอบเรียก:
   `https://10.2.0.13:3002/api/Procurement/health`
5. ทดสอบเปิดระบบ Frontend ที่ `https://10.2.0.13:3001/Procurement/` และทดสอบฟังก์ชันจัดซื้อจริง

### ระยะที่ 3: แผนย้อนกลับฉุกเฉิน (Emergency Rollback Plan)
หากพบปัญหาที่แก้ไขไม่ได้ภายใน 15 นาที:
1. รัน `C:\inetpub\wwwroot\Central-API\scripts\stop-gateway.bat`
2. คืนค่าและเริ่มต้น Procurement Backend เดิมตามขั้นตอนปกติ
3. ตรวจสอบว่าพอร์ต 3002 กลับมาให้บริการระบบเดิมสมบูรณ์

---

## 14. สรุปข้อควรปฏิบัติก่อนนำขึ้นใช้งานจริงบน Production

- [ ] **ห้ามรัน `start-gateway.bat` บน Production ขณะที่ Procurement เดิมยังทำงานอยู่**
- [ ] ติดตั้ง SSL Certificate พร้อม SAN IP `10.2.0.13` ให้เรียบร้อย
- [ ] ตรวจสอบว่า IIS Application Pools ของระบบ Frontend พอร์ต 3001 ยังคงทำงานตามปกติ
- [ ] ประสานงานกับทีมผู้พัฒนาระบบ Procurement, Sam_Att และ Cash_Cheque เพื่อกำหนดวันสลับระบบ (Cutover Day)
