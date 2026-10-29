/**
 * @file modules/procurement/index.js
 * Procurement Subsystem Gateway Adapter (ระบบจัดซื้อจัดจ้าง โรงพยาบาลสามชุก)
 * Prefix: /api/Procurement
 * 
 * หน้าที่ของไฟล์นี้คือทำหน้าที่เป็น Adapter Interface ระหว่าง Central Gateway และ
 * Source Code จัดซื้อจัดจ้างจริงที่ C:\inetpub\wwwroot\Procurement
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../../config');
const { validateSubsystemModule, createUnconfiguredRouter } = require('../adapter-interface');

function createProcurementRouter() {
  const externalPath = config.modules.procurement.externalPath;

  // ตรวจสอบว่ามีพาธไฟล์และมีไฟล์อยู่จริงหรือไม่
  if (externalPath && fs.existsSync(path.resolve(externalPath))) {
    try {
      const resolved = path.resolve(externalPath);
      const importedModule = require(resolved);
      const validation = validateSubsystemModule(importedModule, 'procurement');

      if (validation.isValid) {
        console.log(`[PROCUREMENT ADAPTER] โหลด Source Code จริงสำเร็จจาก: ${resolved}`);
        return validation.router;
      } else {
        console.error(`[PROCUREMENT ADAPTER] รูปแบบ Router ไม่ถูกต้อง: ${validation.error}`);
      }
    } catch (err) {
      console.error(`[PROCUREMENT ADAPTER] เกิดข้อผิดพลาดขณะโหลดระบบ Procurement: ${err.message}`);
    }
  }

  // หากยังไม่ได้เชื่อมต่อ ให้ใช้ Unconfigured Router แบบปลอดภัย
  // ห้ามสร้าง API ข้อมูลจำลองขึ้นมาเองโดยเด็ดขาดตามข้อกำหนด
  return createUnconfiguredRouter({
    id: 'procurement',
    name: 'Procurement (ระบบจัดซื้อจัดจ้าง)',
    prefix: '/api/Procurement'
  });
}

module.exports = {
  id: 'procurement',
  name: 'Procurement (ระบบจัดซื้อจัดจ้าง)',
  prefix: '/api/Procurement',
  router: createProcurementRouter()
};
