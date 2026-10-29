/**
 * @file modules/example-module-template/router.sample.js
 * ตัวอย่าง Backend Router สำหรับระบบใหม่ (เช่น Inventory หรือ HR)
 * 
 * ข้อบังคับสำคัญ:
 * 1. ต้อง export Express Router
 * 2. ห้ามเรียก app.listen() หรือ https.createServer().listen()
 * 3. สามารถเชื่อมต่อ Database หรือมี Middleware ย่อยของตัวเองได้ตามปกติ
 */

const express = require('express');
const router = express.Router();

// Middleware เฉพาะระบบ (ถ้ามี)
router.use((req, res, next) => {
  req.subsystemName = 'Inventory';
  next();
});

// GET /api/Inventory/health
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    subsystem: 'Inventory',
    time: new Date().toISOString()
  });
});

// GET /api/Inventory/items
router.get('/items', (req, res) => {
  // ดึงข้อมูลจากฐานข้อมูลของระบบ Inventory โดยเฉพาะ
  res.json({
    success: true,
    data: [
      { id: 'MED-001', name: 'Paracetamol 500mg', stock: 12000, unit: 'เม็ด' },
      { id: 'MED-002', name: 'Amoxicillin 500mg', stock: 4500, unit: 'แคปซูล' }
    ]
  });
});

module.exports = router;
