# คู่มือการเพิ่มระบบ Sam_Att, Cash_Cheque และโมดูลใหม่ในอนาคต

คู่มือนี้สำหรับทีมนักพัฒนาโรงพยาบาลสามชุก ในการสร้าง Backend Module สำหรับระบบลงเวลา (Sam_Att), ระบบเงินสดและเช็ค (Cash_Cheque) หรือระบบใหม่ เช่น Inventory

---

## 1. ข้อกำหนดของ Subsystem Router (Contract)

ทุกระบบที่จะนำมาเชื่อมต่อกับ Gateway ต้องปฏิบัติตามกฎ 4 ข้อ:
1. **ต้อง Export Express Router** (`express.Router()`) หรือ Object `{ router: expressRouter }`
2. **ห้ามเรียก `app.listen()` หรือ `https.createServer().listen()`**
3. **จัดการ Database Connection ของระบบตนเอง** (เช่น MySQL, SQL Server, PostgreSQL Pool)
4. **รักษาความปลอดภัยและ Authentication ตามสิทธิ์ของระบบตนเอง**

---

## 2. ตัวอย่างการสร้าง Sam_Att Router

ไฟล์: `C:\inetpub\wwwroot\Sam_Att\backend\router.js`

```javascript
const express = require('express');
const router = express.Router();

// Middleware เฉพาะของ Sam_Att
router.use((req, res, next) => {
  req.system = 'Sam_Att';
  next();
});

// GET /api/Sam_Att/health
router.get('/health', (req, res) => {
  res.json({ status: 'UP', module: 'Sam_Att' });
});

// POST /api/Sam_Att/check-in
router.post('/check-in', async (req, res) => {
  const { employeeId, timestamp, deviceId } = req.body;
  // บันทึกลงฐานข้อมูลของ Sam_Att
  res.json({ success: true, message: 'บันทึกเวลาสำเร็จ', employeeId });
});

module.exports = router;
```

---

## 3. ตัวอย่างการสร้าง Cash_Cheque Router

ไฟล์: `C:\inetpub\wwwroot\Cash_Cheque\backend\router.js`

```javascript
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'UP', module: 'Cash_Cheque' });
});

// GET /api/Cash_Cheque/vouchers
router.get('/vouchers', async (req, res) => {
  // ดึงข้อมูลเช็คและใบสำคัญจ่าย
  res.json({ success: true, data: [] });
});

module.exports = router;
```

---

## 4. การเปิดใช้งานใน Gateway

ในไฟล์ `C:\inetpub\wwwroot\Central-API\.env`:
```env
MODULE_SAM_ATT_ENABLED=true
MODULE_SAM_ATT_PATH=C:\inetpub\wwwroot\Sam_Att\backend\router.js

MODULE_CASH_CHEQUE_ENABLED=true
MODULE_CASH_CHEQUE_PATH=C:\inetpub\wwwroot\Cash_Cheque\backend\router.js
```
หลังจากตั้งค่าแล้ว ให้รีสตาร์ท Gateway ด้วยคำสั่ง:
```cmd
scripts\stop-gateway.bat
scripts\start-gateway.bat
```
และตรวจสอบความพร้อมด้วย:
```cmd
scripts\status-gateway.bat
```
