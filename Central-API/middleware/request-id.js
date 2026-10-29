/**
 * @file middleware/request-id.js
 * Correlation ID Middleware
 * สร้างหรือส่งต่อ Correlation ID เพื่อติดตามการเรียกคำขอข้ามระบบระหว่าง Frontend (3001) และ Gateway (3002)
 */

const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  // รับ Correlation ID จาก Header เดิม หรือสร้างใหม่แบบ UUIDv4
  const correlationId = req.headers['x-correlation-id'] || 
                        req.headers['x-request-id'] || 
                        `samchuk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  
  req.id = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

module.exports = requestIdMiddleware;
