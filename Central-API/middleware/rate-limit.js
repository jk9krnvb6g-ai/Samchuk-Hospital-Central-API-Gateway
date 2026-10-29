/**
 * @file middleware/rate-limit.js
 * In-Memory Rate Limiter for Hospital API Gateway
 * ป้องกันการส่งคำขอถี่ผิดปกติเพื่อรักษาเสถียรภาพของฐานข้อมูลโรงพยาบาล
 */

const config = require('../config');

const requestCounts = new Map();

// เคลียร์ประวัติการนับเมื่อหมดเวลา
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 30000).unref(); // unref เพื่อไม่ให้ค้าง process ตอน exit

function rateLimitMiddleware(req, res, next) {
  if (config.rateLimit.max <= 0) {
    return next();
  }

  // ยกเว้น Health check จาก Rate limit
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.max;

  let record = requestCounts.get(clientIp);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs
    };
    requestCounts.set(clientIp, record);
  } else {
    record.count++;
  }

  const remaining = Math.max(0, maxRequests - record.count);
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfter);

    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'คำขอมากเกินไป กรุณารอสักครู่ก่อนทำรายการใหม่',
        retryAfterSeconds: retryAfter,
        correlationId: req.id
      }
    });
  }

  next();
}

module.exports = rateLimitMiddleware;
