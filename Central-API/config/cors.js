/**
 * @file config/cors.js
 * CORS Configuration for Samchuk Hospital Central API Gateway
 * ตรวจสอบ Origin อย่างเข้มงวด อนุญาตเฉพาะ Frontend ที่รันบน IIS พอร์ต 3001
 */

const config = require('./index');

/**
 * ฟังก์ชันตรวจสอบ Origin แบบเข้มงวด
 * @param {string|undefined} origin 
 * @param {function} callback 
 */
function corsOriginValidator(origin, callback) {
  // หากไม่มี origin (เช่น Same-Origin, Postman, Server-to-Server ภายใน, หรือ In-Process Test)
  if (!origin) {
    return callback(null, true);
  }

  const allowedOrigins = config.cors.allowedOrigins;

  // ตรวจสอบว่า origin อยู่ใน Allowlist หรือไม่
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // ปฏิเสธคำขอจาก Origin อื่นทันทีเพื่อความปลอดภัยของข้อมูลโรงพยาบาล
  const error = new Error(`[CORS REJECTED] Origin "${origin}" ไม่อยู่ในรายชื่อที่อนุญาต (Allowlist: ${allowedOrigins.join(', ')})`);
  error.status = 403;
  return callback(error, false);
}

const corsOptions = {
  origin: corsOriginValidator,
  credentials: true,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  exposedHeaders: ['X-Correlation-ID', 'Content-Disposition'],
  maxAge: 86400, // 24 ชั่วโมงสำหรับ Preflight Cache
  optionsSuccessStatus: 204
};

module.exports = {
  corsOptions,
  corsOriginValidator
};
