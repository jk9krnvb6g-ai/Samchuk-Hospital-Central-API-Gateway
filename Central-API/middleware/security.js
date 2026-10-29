/**
 * @file middleware/security.js
 * Security Headers Configuration (Helmet + Custom Rules)
 * ป้องกันการโจมตีทางเว็บตามมาตรฐานระบบสารสนเทศโรงพยาบาล
 */

const helmet = require('helmet');
const config = require('../config');

function createSecurityMiddleware() {
  const helmetMiddleware = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ...config.cors.allowedOrigins],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.tls.enabled ? [] : null
      }
    },
    // ปิดการระบุ X-Powered-By: Express
    hidePoweredBy: true,
    // HTTP Strict Transport Security
    hsts: config.tls.enabled ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false
    } : false,
    // ป้องกัน Clickjacking
    frameguard: {
      action: 'sameorigin'
    },
    // ป้องกัน MIME-type Sniffing
    noSniff: true,
    // ป้องกัน XSS
    xssFilter: true,
    // ควบคุม Referrer Header
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  });

  return (req, res, next) => {
    // ลบ Header ที่อาจเปิดเผยเทคโนโลยีฝั่งเซิร์ฟเวอร์
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // ตั้งค่า Cache-Control เริ่มต้นสำหรับ API เพื่อป้องกันการแคชข้อมูลผู้ป่วยหรือข้อมูลการเงิน
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    helmetMiddleware(req, res, next);
  };
}

module.exports = createSecurityMiddleware;
