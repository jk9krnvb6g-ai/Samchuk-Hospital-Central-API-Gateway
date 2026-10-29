/**
 * @file middleware/error-handler.js
 * Central Error Handler for Samchuk Hospital Central API Gateway
 * ป้องกันการเปิดเผย Stack Trace และข้อมูลโครงสร้างภายในเซิร์ฟเวอร์ในสภาพแวดล้อม Production
 */

const config = require('../config');

/**
 * Middleware ดักจับ 404 Not Found
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `ไม่พบเส้นทาง API: ${req.method} ${req.originalUrl}`,
      correlationId: req.id,
      validPrefixes: [
        '/api/Procurement/',
        '/api/Sam_Att/',
        '/api/Cash_Cheque/',
        '/api/health'
      ],
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Middleware จัดการ Error ทั้งหมดในระบบ
 */
function globalErrorHandler(err, req, res, next) {
  // บันทึก Error เต็มรูปแบบลง Console และ Log เพื่อให้ผู้ดูแลระบบตรวจสอบได้
  console.error(`[GATEWAY ERROR] [${req.id || 'N/A'}] ${err.name || 'Error'}: ${err.message}`);
  if (!config.isProduction && err.stack) {
    console.error(err.stack);
  }

  // กรณี CORS Error
  if (err.message && err.message.includes('[CORS REJECTED]')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_FORBIDDEN',
        message: 'ไม่อนุญาตการเข้าถึงข้าม Origin จากแหล่งที่มานี้',
        origin: req.headers.origin || 'unknown',
        correlationId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  }

  // กรณี Payload หรือ JSON Syntax ผิดพลาด
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON_BODY',
        message: 'รูปแบบข้อมูล JSON ใน Request Body ไม่ถูกต้อง',
        correlationId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  }

  const statusCode = err.status || err.statusCode || 500;

  // โครงสร้าง Response ที่ส่งกลับผู้ใช้งาน (ห้ามเปิดเผย Stack Trace ใน Production)
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_GATEWAY_ERROR',
      message: config.isProduction && statusCode === 500
        ? 'เกิดข้อผิดพลาดภายในระบบ Gateway กรุณาติดต่อผู้ดูแลระบบโรงพยาบาลสามชุก'
        : err.message,
      correlationId: req.id,
      timestamp: new Date().toISOString()
    }
  };

  // ในโหมด Development เท่านั้นที่อนุญาตให้แสดง stack เพื่อความสะดวกในการดีบัก
  if (!config.isProduction) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
