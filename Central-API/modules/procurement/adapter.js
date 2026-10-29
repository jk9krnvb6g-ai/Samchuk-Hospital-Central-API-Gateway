/**
 * @file modules/procurement/adapter.js
 * Guide and Helper for adapting existing Procurement backend to Express Router
 * 
 * ข้อควรทราบสำหรับการเชื่อมต่อระบบจัดซื้อจัดจ้าง (Procurement) เดิม:
 * 1. นำไฟล์ Express Router ของ Procurement เดิมมา export ออกไป
 * 2. ห้ามเรียก app.listen(3002) ภายในไฟล์ router ของ Procurement
 * 3. เก็บการเชื่อมต่อฐานข้อมูล (Database Pool), Authentication (JWT/Session)
 *    และ Business Logic ไว้ที่โฟลเดอร์ Procurement เดิมทั้งหมด
 * 4. กำหนด MODULE_PROCUREMENT_PATH ใน .env ของ Gateway ชี้มายังไฟล์ router นี้
 */

/**
 * ตัวอย่างโค้ดที่ฝั่ง Procurement เดิมต้องแก้ไขในไฟล์ backend entry:
 * 
 * // ก่อนปรับปรุง (แบบเดิม):
 * // const app = express();
 * // app.use('/api/Procurement', routes);
 * // app.listen(3002, () => console.log('Procurement listening on 3002'));
 * 
 * // หลังปรับปรุง (แบบใหม่สำหรับ Central Gateway):
 * // const router = express.Router();
 * // router.use('/auth', authRoutes);
 * // router.use('/orders', orderRoutes);
 * // router.use('/vendors', vendorRoutes);
 * // module.exports = router;
 */

module.exports = {
  specification: {
    systemName: 'Procurement',
    allowedMountPath: '/api/Procurement',
    expectedExportType: 'express.Router'
  }
};
