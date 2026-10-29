# คู่มือการเชื่อมต่อระบบจัดซื้อจัดจ้าง (Procurement Router Migration)

เอกสารนี้อธิบายการปรับแต่ง Source Code ของระบบจัดซื้อจัดจ้าง (Procurement) เดิม เพื่อให้สามารถ Mount เข้าสู่ Central API Gateway ได้โดยไม่กระทบ Database Connection หรือ Business Logic เดิม

---

## 1. หลักการทำงานเดิม vs หลักการใหม่

### สถาปัตยกรรมเดิม (Standalone Process):
- โฟลเดอร์: `C:\inetpub\wwwroot\Procurement\backend\`
- ไฟล์เริ่มต้นเปิดเซิร์ฟเวอร์ด้วยตนเอง: `app.listen(3002)`
- ปัญหา: เมื่อระบบอื่นต้องการพอร์ต 3002 จะเกิดพอร์ตชนกัน (Port Conflict EADDRINUSE)

### สถาปัตยกรรมใหม่ (Pluggable Router):
- โฟลเดอร์ยังอยู่ที่เดิม: `C:\inetpub\wwwroot\Procurement\backend\`
- Database Pool และ Business Logic ทั้งหมดอยู่ที่เดิม
- เปลี่ยนจากการเรียก `app.listen(3002)` มาเป็นการ Export `express.Router()`
- Central API Gateway เป็นผู้รับหน้าที่เปิด HTTPS Port 3002 เพียงตัวเดียว และส่งต่อ Request ที่มี Prefix `/api/Procurement/` เข้าสู่ Router นี้

---

## 2. ขั้นตอนการแก้ไขโค้ดฝั่ง Procurement เดิม

สร้างไฟล์ใหม่ชื่อ `router.js` ในโฟลเดอร์ Backend ของ Procurement:
`C:\inetpub\wwwroot\Procurement\backend\router.js`

```javascript
/**
 * Procurement Backend Router for Samchuk Central API Gateway
 */
const express = require('express');
const router = express.Router();

// 1. นำเข้าโมดูลหรือ Routes เดิมของ Procurement
// (ปรับพาธตามโครงสร้างไฟล์เดิมของ Procurement)
const authController = require('./controllers/authController');
const orderRoutes = require('./routes/orders');
const vendorRoutes = require('./routes/vendors');
const reportRoutes = require('./routes/reports');

// 2. Middleware ประจำโมดูล Procurement (เช่น ตรวจสอบ Database หรือ Session เดิม)
router.use((req, res, next) => {
  // ไม่เขียนทับ req.id หรือ Header หลักของ Gateway
  req.subsystem = 'Procurement';
  next();
});

// 3. เส้นทาง Health Check ของ Procurement
router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    module: 'Procurement',
    dbConnected: true,
    timestamp: new Date().toISOString()
  });
});

// 4. เส้นทาง API หลักของระบบจัดซื้อจัดจ้าง
// สังเกตว่าไม่ต้องใส่ prefix '/api/Procurement' ในนี้แล้ว เพราะ Gateway เป็นผู้จัดการให้
router.post('/login', authController.login);
router.use('/orders', orderRoutes);
router.use('/vendors', vendorRoutes);
router.use('/reports', reportRoutes);

// 5. ส่งออก Router (ห้ามเรียก app.listen ในไฟล์นี้เด็ดขาด)
module.exports = router;
```

---

## 3. การกำหนดค่าใน Central API Gateway

ในไฟล์ `C:\inetpub\wwwroot\Central-API\.env`:
```env
MODULE_PROCUREMENT_ENABLED=true
MODULE_PROCUREMENT_PATH=C:\inetpub\wwwroot\Procurement\backend\router.js
```

---

## 4. ผลลัพธ์ URL หลังการเชื่อมต่อ

| รายการ API | URL ที่เรียกใช้งานจาก Frontend (พอร์ต 3001) |
|---|---|
| เข้าระบบ | `POST https://10.2.0.13:3002/api/Procurement/login` |
| รายการสั่งซื้อ | `GET https://10.2.0.13:3002/api/Procurement/orders` |
| ข้อมูลผู้ขาย | `GET https://10.2.0.13:3002/api/Procurement/vendors` |
| ตรวจสุขภาพระบบ | `GET https://10.2.0.13:3002/api/Procurement/health` |
