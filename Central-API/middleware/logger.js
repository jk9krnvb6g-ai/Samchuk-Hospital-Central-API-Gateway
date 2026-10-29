/**
 * @file middleware/logger.js
 * Sanitized Audit Logger for Samchuk Hospital
 * บันทึกประวัติคำขอโดยไม่เปิดเผยข้อมูลสำคัญ (Passwords, Tokens, CID, Cookies, ข้อมูลผู้ป่วย)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

// รายการคีย์ที่ต้อง Masking ปิดบังข้อมูลใน Log
const SENSITIVE_KEYS = new Set([
  'password',
  'passphrase',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'pin',
  'cid',
  'idcard',
  'creditcard'
]);

/**
 * ลบหรือ Mask ข้อมูลอ่อนไหวออกจาก Object
 */
function sanitizeData(data, depth = 0) {
  if (!data || depth > 4) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * เขียน Log ลงไฟล์รายวัน
 */
function writeToFile(logLine) {
  try {
    if (!fs.existsSync(config.logging.dir)) {
      fs.mkdirSync(config.logging.dir, { recursive: true });
    }
    const today = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(config.logging.dir, `gateway-${today}.log`);
    fs.appendFileSync(logFilePath, logLine + '\n', 'utf8');
  } catch (err) {
    // ป้องกันการ throw error ถ้าเขียนไฟล์ log ล้มเหลว
    console.error('[LOGGER ERROR] ไม่สามารถบันทึก Log ลงไฟล์:', err.message);
  }
}

function requestLoggerMiddleware(req, res, next) {
  const startTime = process.hrtime();
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

  // เมื่อคำขอทำงานเสร็จสิ้น
  res.on('finish', () => {
    const hrDiff = process.hrtime(startTime);
    const durationMs = (hrDiff[0] * 1000 + hrDiff[1] / 1e6).toFixed(2);
    const statusCode = res.statusCode;

    // ปกปิด Token ใน Header ก่อนนำมาแสดง
    const authHeader = req.headers['authorization'];
    const safeAuth = authHeader ? `${authHeader.substring(0, 10)}...[MASKED]` : 'none';

    const logEntry = {
      timestamp,
      correlationId: req.id || '-',
      clientIp,
      method: req.method,
      url: req.originalUrl || req.url,
      status: statusCode,
      durationMs: Number(durationMs),
      auth: safeAuth
    };

    const formattedLine = `[${logEntry.timestamp}] [${logEntry.correlationId}] ${logEntry.clientIp} ${logEntry.method} ${logEntry.url} ${logEntry.status} ${logEntry.durationMs}ms`;

    // แสดงใน Console ตามระดับความสำคัญ
    if (statusCode >= 500) {
      console.error(`\x1b[31m${formattedLine}\x1b[0m`);
    } else if (statusCode >= 400) {
      console.warn(`\x1b[33m${formattedLine}\x1b[0m`);
    } else {
      console.log(`\x1b[32m${formattedLine}\x1b[0m`);
    }

    // เขียนลงไฟล์ Log
    writeToFile(JSON.stringify(logEntry));
  });

  next();
}

module.exports = {
  requestLoggerMiddleware,
  sanitizeData
};
