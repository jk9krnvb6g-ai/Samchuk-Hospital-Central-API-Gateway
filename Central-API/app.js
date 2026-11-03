/**
 * @file app.js
 * Express Application Architecture for Samchuk Hospital Central API Gateway
 * แยกส่วน Express Application ออกจาก Network Listener เพื่อรองรับ In-Process Testing
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { corsOptions } = require('./config/cors');
const createSecurityMiddleware = require('./middleware/security');
const requestIdMiddleware = require('./middleware/request-id');
const { requestLoggerMiddleware } = require('./middleware/logger');
const rateLimitMiddleware = require('./middleware/rate-limit');
const { notFoundHandler, globalErrorHandler } = require('./middleware/error-handler');
const registry = require('./modules/registry');

function createApp() {
  const app = express();

  // ตรวจสอบความถูกต้องของการตั้งค่าระบบเบื้องต้น
  const validation = config.validate();
  if (!validation.isValid) {
    for (const err of validation.errors) {
      console.error(`[CONFIG VALIDATION ERROR] ${err}`);
    }
  }

  // 1. Correlation ID Middleware (ระบุตัวตนของแต่ละคำขอ)
  app.use(requestIdMiddleware);

  // 2. Security Headers (Helmet, HSTS, No-Sniff, FrameGuard)
  app.use(createSecurityMiddleware());

  // 3. CORS Enforcement (จำกัดเฉพาะ https://10.2.0.13:3001 และ Origin ที่กำหนด)
  app.use(cors(corsOptions));

  // 4. Body Parsers พร้อมจำกัดขนาด Payload ป้องกัน DoS
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. Audit Request Logger (ปลอดภัย ไร้การรั่วไหลของ Secret/Password)
  app.use(requestLoggerMiddleware);

  // 6. Rate Limiting ป้องกันการยิงคำขอถล่ม
  app.use(rateLimitMiddleware);

  // 7. Base Information & Health Check Endpoints
  // ให้ข้อมูลสถานะของ Gateway โดยไม่เปิดเผย Secret หรือพาธไฟล์ภายใน
  const healthHandler = (req, res) => {
    const modulesStatus = registry.getHealthSummary();
    const isAllRequiredActive = Object.values(modulesStatus)
      .filter(m => m.required)
      .every(m => m.status === 'ACTIVE' || m.status === 'NOT_CONFIGURED'); // ในระยะเริ่มต้น NOT_CONFIGURED ถือเป็น safe state

    res.status(isAllRequiredActive ? 200 : 503).json({
      status: isAllRequiredActive ? 'UP' : 'DEGRADED',
      gateway: 'Samchuk Hospital Central API Gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      protocol: req.protocol,
      port: config.server.port,
      subsystems: modulesStatus,
      cors: {
        allowedOrigins: config.cors.allowedOrigins
      }
    });
  };

  app.get('/', (req, res) => {
    res.json({
      service: 'Samchuk Hospital Central API Gateway',
      hospital: 'โรงพยาบาลสามชุก จ.สุพรรณบุรี',
      port: 3002,
      healthEndpoint: '/api/health',
      documentation: 'ดูรายละเอียดการใช้งานและสิทธิ์การเข้าถึงในเอกสารโครงการ',
      time: new Date().toISOString()
    });
  });

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // 8. Management API Endpoints สำหรับ V2 Management Console (Read-only)
  const adminOverviewHandler = (req, res) => {
    const modulesStatus = registry.getHealthSummary();
    const isAllRequiredActive = Object.values(modulesStatus)
      .filter(m => m.required)
      .every(m => m.status === 'ACTIVE' || m.status === 'NOT_CONFIGURED');

    res.json({
      success: true,
      service: 'Samchuk Hospital Central API Gateway V2',
      hospital: 'โรงพยาบาลสามชุก จ.สุพรรณบุรี',
      version: '2.0.0',
      mode: 'READ_ONLY_OBSERVER',
      mutationsEnabled: false,
      timestamp: new Date().toISOString(),
      gateway: {
        status: isAllRequiredActive ? 'UP' : 'DEGRADED',
        port: config.server.port,
        host: config.server.host,
        protocol: req.protocol,
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: config.env
      },
      security: {
        sslEnabled: config.tls.enabled,
        targetIp: config.tls.targetIp,
        corsAllowedOrigins: config.cors.allowedOrigins,
        rateLimit: config.rateLimit,
        authPolicy: 'READ_ONLY_PUBLIC_TELEMETRY'
      },
      modules: modulesStatus,
      monitoring: {
        metricsApiAvailable: false,
        message: 'Metrics Collector Plugin ยังไม่ได้ติดตั้งบนเซิร์ฟเวอร์ (รอการเปิดใช้งานใน V2.1)'
      },
      logs: {
        streamAvailable: false,
        logDirectory: config.logging.dir,
        message: 'Audit Logs ถูกบันทึกลงไฟล์เซิร์ฟเวอร์โดยตรง ไม่เปิดเผยผ่าน Public API'
      }
    });
  };

  app.get('/api/gateway/admin', adminOverviewHandler);
  app.get('/api/gateway/admin/overview', adminOverviewHandler);
  app.get('/api/gateway/admin/health', healthHandler);

  // ป้องกันคำสั่ง Mutation (POST/PUT/PATCH/DELETE) บน Admin API
  app.all('/api/gateway/admin/*', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MUTATIONS_DISABLED',
          message: 'คำสั่งแก้ไขสถานะถูกปิดการใช้งานในระยะแรก (GATEWAY_ADMIN_MUTATIONS_ENABLED=false) เพื่อความปลอดภัยของระบบโรงพยาบาล',
          correlationId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  });

  // 8. ติดตั้งและ Mount Subsystem Routers ตามลำดับ
  // /api/Procurement  -> Procurement Router
  // /api/Sam_Att      -> Sam_Att Router
  // /api/Cash_Cheque  -> Cash_Cheque Router
  registry.mountAll(app);

  // 9. ดักจับ Route ที่ไม่มีอยู่ (404 Not Found)
  app.use(notFoundHandler);

  // 10. Global Error Handler (ไม่เปิดเผย Stack Trace ใน Production)
  app.use(globalErrorHandler);

  return app;
}

// สร้าง Default App instance
const app = createApp();

module.exports = app;
module.exports.createApp = createApp;
