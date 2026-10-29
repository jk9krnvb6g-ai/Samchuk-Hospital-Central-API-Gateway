/**
 * @file config/index.js
 * Central Configuration Loader for Samchuk Hospital Central API Gateway
 * โหลดและตรวจสอบความถูกต้องของการตั้งค่าระบบจาก Environment Variables
 */

const path = require('path');
const dotenv = require('dotenv');

// โหลดไฟล์ .env ถ้ามีอยู่ในโฟลเดอร์ปัจจุบัน (override ให้ค่าใน .env ชนะค่า environment ภายนอก)
dotenv.config({ override: true });

// กำหนดพอร์ตเป้าหมายสำหรับ Samchuk Central Gateway โดยตรง
// ในสภาพแวดล้อม Windows Server ค่าเริ่มต้นคือ 3002 ตามนโยบายเครือข่ายของโรงพยาบาล
const resolvedPort = parseInt(
  process.env.GATEWAY_PORT || 
  (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : '3002'), 
  10
);

const config = {
  env: process.env.NODE_ENV || 'production',
  isProduction: (process.env.NODE_ENV || 'production') === 'production',
  
  server: {
    // บังคับพอร์ต 3002 สำหรับ Gateway ตามนโยบายเครือข่ายโรงพยาบาลสามชุก
    port: resolvedPort,
    host: process.env.HOST || '0.0.0.0',
    enforcePort: 3002
  },

  tls: {
    enabled: process.env.SSL_ENABLED !== 'false',
    certPath: process.env.SSL_CERT_PATH || '',
    keyPath: process.env.SSL_KEY_PATH || '',
    caPath: process.env.SSL_CA_PATH || '',
    pfxPath: process.env.SSL_PFX_PATH || '',
    passphrase: process.env.SSL_PASSPHRASE || '',
    targetIp: '10.2.0.13'
  },

  cors: {
    // อนุญาตเฉพาะ Frontend ที่รันบน IIS พอร์ต 3001
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'https://10.2.0.13:3001,https://localhost:3001')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Correlation-ID',
      'X-Hospital-Client'
    ]
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '600', 10)
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs')
  },

  modules: {
    procurement: {
      id: 'procurement',
      name: 'Procurement (ระบบจัดซื้อจัดจ้าง)',
      prefix: '/api/Procurement',
      enabled: process.env.MODULE_PROCUREMENT_ENABLED !== 'false',
      externalPath: process.env.MODULE_PROCUREMENT_PATH || ''
    },
    samAtt: {
      id: 'sam-att',
      name: 'Sam_Att (ระบบลงเวลาปฏิบัติงาน)',
      prefix: '/api/Sam_Att',
      enabled: process.env.MODULE_SAM_ATT_ENABLED !== 'false',
      externalPath: process.env.MODULE_SAM_ATT_PATH || ''
    },
    cashCheque: {
      id: 'cash-cheque',
      name: 'Cash_Cheque (ระบบเงินสดและเช็ค)',
      prefix: '/api/Cash_Cheque',
      enabled: process.env.MODULE_CASH_CHEQUE_ENABLED !== 'false',
      externalPath: process.env.MODULE_CASH_CHEQUE_PATH || ''
    },
    inventory: {
      id: 'inventory',
      name: 'Inventory (ระบบพัสดุและคลังยา)',
      prefix: '/api/Inventory',
      enabled: process.env.MODULE_INVENTORY_ENABLED === 'true',
      externalPath: process.env.MODULE_INVENTORY_PATH || ''
    }
  }
};

/**
 * ตรวจสอบความถูกต้องของการตั้งค่า (Validation)
 */
function validateConfig() {
  const errors = [];
  
  if (config.server.port !== 3002) {
    errors.push(`ข้อผิดพลาด: พอร์ตที่กำหนดคือ ${config.server.port} แต่นโยบายโรงพยาบาลสามชุกบังคับใช้เฉพาะพอร์ต 3002 สำหรับ Backend Gateway`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

config.validate = validateConfig;

module.exports = config;
