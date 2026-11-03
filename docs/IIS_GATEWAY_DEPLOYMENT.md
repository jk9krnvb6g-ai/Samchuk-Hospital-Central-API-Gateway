# คู่มือการติดตั้งและ Deploy Gateway Management Console บน IIS (URL: https://10.2.0.13:3001/Gateway/)

เอกสารนี้จัดทำขึ้นสำหรับเจ้าหน้าที่ฝ่ายเทคโนโลยีสารสนเทศ โรงพยาบาลสามชุก เพื่อนำ **Central API Gateway V2 — Management Console** ไปติดตั้งและให้บริการผ่าน IIS Web Server

---

## 1. ภาพรวมสถาปัตยกรรมการให้บริการผ่าน IIS

```
[ เครื่องลูกข่าย / ผู้ดูแลระบบ IT ]
       │
       │ (HTTPS Port 3001)
       ▼
[ IIS Web Server บน Windows Server (IP: 10.2.0.13) ]
  ├── https://10.2.0.13:3001/Procurement/  (ระบบจัดซื้อจัดจ้าง)
  ├── https://10.2.0.13:3001/Sam_Att/      (ระบบบันทึกเวลา)
  ├── https://10.2.0.13:3001/Cash_Cheque/  (ระบบการเงินและเช็ค)
  └── https://10.2.0.13:3001/Gateway/      (Gateway Management Console)
            │
            │ (Reverse Proxy: /Gateway/api/* ➔ https://127.0.0.1:3002/api/*)
            ▼
[ Central API Gateway Node.js (พอร์ต 3002 เท่านั้น) ]
```

---

## 2. ขั้นตอนการ Build Frontend

### 2.1 รันคำสั่ง Build
บนเครื่องคอมพิวเตอร์สำหรับพัฒนา หรือบนเซิร์ฟเวอร์ ให้เปิด Command Prompt / PowerShell แล้วรันคำสั่ง:

```cmd
cd C:\inetpub\wwwroot\Central-API\
npm run build
```

ระบบจะสร้างโฟลเดอร์ `dist/` ซึ่งประกอบด้วยไฟล์ HTML, CSS, JavaScript แบบ Optimized Production Bundle

> **หมายเหตุเรื่อง Base Path:** ในไฟล์ `vite.config.ts` ได้กำหนดค่า `base: './'` ไว้เป็นมาตรฐาน ทำให้ไฟล์ที่ Build สามารถรันได้ทั้งใน Subdirectory `/Gateway/` และ Root Directory โดยไม่มีปัญหาเรื่อง Asset 404

---

## 3. การสร้าง Application บน IIS

1. เปิด **IIS Manager** (`inetmgr`) บน Windows Server
2. ในแผง **Connections** ด้านซ้าย:
   - ขยาย **Sites**
   - คลิกขวาที่ Site ที่ผูกกับพอร์ต 3001 (เช่น `Samchuk_Hospital_Site`)
   - เลือก **Add Application...**
3. กำหนดค่าดังนี้:
   - **Alias:** `Gateway`
   - **Application pool:** เลือก `DefaultAppPool` หรือ Pool ที่กำหนดค่าเป็น `.NET CLR version: No Managed Code`
   - **Physical path:** `C:\inetpub\wwwroot\Gateway\` (หรือชี้ไปยังโฟลเดอร์ `dist/`)
4. คลิก **OK**

---

## 4. การตั้งค่า web.config สำหรับ SPA และ Reverse Proxy

ในโฟลเดอร์ `C:\inetpub\wwwroot\Gateway\` ให้สร้างไฟล์ `web.config` ดังนี้:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- กฎที่ 1: ส่งต่อคำขอ API ไปยัง Central Gateway พอร์ต 3002 (IIS ARR Reverse Proxy) -->
        <!-- หมายเหตุ: หาก Node.js รันเป็น Local HTTP ด้านหลัง IIS ให้ชี้ไปที่ http://127.0.0.1:3002 -->
        <!-- หาก Node.js รันเป็น HTTPS Direct Listener ให้ชี้ไปที่ https://127.0.0.1:3002 -->
        <rule name="ReverseProxyToGatewayAPI" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:3002/api/{R:1}" />
        </rule>

        <!-- กฎที่ 2: SPA Client-side Routing Fallback -->
        <rule name="ReactGatewayRoutes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/Gateway/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- ป้องกันการแสดง Directory Browsing -->
    <directoryBrowse enabled="false" />

    <!-- ตั้งค่า Cache สำหรับ Static Assets -->
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>
```

> **ข้อกำหนดเบื้องต้นของ IIS:** จำเป็นต้องติดตั้งโมดูล **URL Rewrite** และ **Application Request Routing (ARR)** บน IIS เพื่อให้สามารถทำหน้าที่เป็น Reverse Proxy ไปยังพอร์ต 3002 ได้

---

## 5. การทดสอบการเข้าถึง

1. เปิดเบราว์เซอร์ไปที่:
   ```
   https://10.2.0.13:3001/Gateway/
   ```
2. หน้าจอควรแสดงผล **Gateway Management Console** ในโหมด Light หรือ Dark Mode
3. แถบสถานะด้านบนขวาควรแสดงสถานะการเชื่อมต่อ:
   - `ออนไลน์ปกติ (UP)` พร้อมเวลา Latency ในระดับมิลลิวินาที
   - หากเซิร์ฟเวอร์ Gateway พอร์ต 3002 ยังไม่ได้เริ่มทำงาน หน้าจอจะแสดงสถานะ `ออฟไลน์ (Offline)` และให้คำแนะนำในการเริ่ม Service

---

## 6. แผนการ Rollback และการแก้ไขปัญหา (Troubleshooting)

- **หากเปิดหน้า `/Gateway/` แล้วพบข้อผิดพลาด HTTP 500.19:** ตรวจสอบว่าได้ติดตั้ง IIS URL Rewrite Module แล้วหรือไม่
- **หากเรียก API ไม่ได้ (HTTP 502 Bad Gateway):** ตรวจสอบว่า Process Central API Gateway บนพอร์ต 3002 กำลังทำงานอยู่หรือไม่ โดยรัน:
  ```cmd
  C:\inetpub\wwwroot\Central-API\scripts\status-gateway.bat
  ```
- **การ Rollback:** หากต้องการปิดหน้า Management Console สามารถลบ Application `Gateway` ออกจาก IIS Site ได้ทันทีโดยไม่กระทบกับระบบ Procurement, Sam_Att, และ Cash_Cheque
