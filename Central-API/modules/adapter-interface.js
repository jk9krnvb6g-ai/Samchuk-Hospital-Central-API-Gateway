/**
 * @file modules/adapter-interface.js
 * Subsystem Module Adapter Interface Specification
 * ข้อกำหนดและสัญญาเชื่อมต่อ (Interface Contract) สำหรับ Backend Router แต่ละระบบ
 */

const express = require('express');

/**
 * ตรวจสอบว่า Router หรือ Adapter ที่ส่งมาถูกต้องตามข้อกำหนดหรือไม่
 * @param {any} moduleExport สิ่งที่ module ภายนอก export ออกมา
 * @param {string} moduleId รหัสระบบ (เช่น 'procurement')
 * @returns {{ isValid: boolean, router: express.Router|null, error: string|null }}
 */
function validateSubsystemModule(moduleExport, moduleId) {
  if (!moduleExport) {
    return {
      isValid: false,
      router: null,
      error: `Module '${moduleId}' ทำการ export ค่าว่าง (null หรือ undefined)`
    };
  }

  // กรณีที่ 1: Module export เป็น express.Router หรือ function middleware โดยตรง
  if (typeof moduleExport === 'function') {
    // ตรวจสอบว่าไม่ใช่การ export instance ของ http.Server หรือ Express App ที่เรียก listen()
    if (typeof moduleExport.listen === 'function') {
      console.warn(`[MODULE WARNING] Module '${moduleId}' เป็น Express App เต็มรูปแบบ ไม่ควรเรียก app.listen() ภายใน Module`);
    }

    return {
      isValid: true,
      router: moduleExport,
      error: null
    };
  }

  // กรณีที่ 2: Module export เป็น Adapter Object: { router, getHealth, ... }
  if (typeof moduleExport === 'object') {
    if (moduleExport.router && typeof moduleExport.router === 'function') {
      return {
        isValid: true,
        router: moduleExport.router,
        healthCheck: moduleExport.getHealth || null,
        error: null
      };
    }

    // กรณีเป็น factory function หรือ default export
    if (moduleExport.default && typeof moduleExport.default === 'function') {
      return {
        isValid: true,
        router: moduleExport.default,
        error: null
      };
    }
  }

  return {
    isValid: false,
    router: null,
    error: `Module '${moduleId}' ต้อง export เป็น Express Router หรือ Object ที่มี property 'router'`
  };
}

/**
 * สร้าง Fallback Router สำหรับระบบที่ยังไม่ได้เชื่อมต่อ Source Code จริง
 * แสดงสถานะ 503 Service Unavailable อย่างปลอดภัยโดยไม่เปิดเผยข้อมูลภายใน
 * @param {object} moduleDef ข้อมูลโมดูล
 */
function createUnconfiguredRouter(moduleDef) {
  const router = express.Router();

  router.all('*', (req, res) => {
    res.status(503).json({
      success: false,
      error: {
        code: 'MODULE_NOT_CONFIGURED',
        systemId: moduleDef.id,
        systemName: moduleDef.name,
        prefix: moduleDef.prefix,
        message: `ระบบ ${moduleDef.name} ยังไม่ได้ลงทะเบียน Backend Router เข้าสู่ Central Gateway`,
        instruction: 'กรุณาตั้งค่าพาธ Source Code ในไฟล์ .env หรือเรียก registerModule()',
        correlationId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  });

  return router;
}

module.exports = {
  validateSubsystemModule,
  createUnconfiguredRouter
};
