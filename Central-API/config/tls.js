/**
 * @file config/tls.js
 * TLS / SSL Certificate Loader for Windows Server
 * รองรับการโหลดใบรับรองทั้งรูปแบบ PEM (crt + key) และ PFX (PKCS#12)
 * บังคับตรวจสอบความถูกต้องของ Certificate โดยไม่ปิด rejectUnauthorized
 */

const fs = require('fs');
const path = require('path');
const config = require('./index');

/**
 * โหลดตัวเลือก TLS สำหรับ https.createServer
 * @returns {object|null} TLS options สำหรับ https.createServer
 */
function loadTlsOptions() {
  if (!config.tls.enabled) {
    console.warn('[TLS WARNING] SSL_ENABLED=false กำลังทำงานในโหมดไม่เข้ารหัส (ห้ามใช้ใน Production ของโรงพยาบาล)');
    return null;
  }

  const tlsOptions = {
    // ป้องกัน SSLv2, SSLv3, TLS 1.0, TLS 1.1 ที่ล้าสมัยและไม่ปลอดภัย
    minVersion: 'TLSv1.2',
    honorCipherOrder: true,
    // ไม่ตั้ง rejectUnauthorized=false เด็ดขาดตามข้อกำหนดความปลอดภัย
  };

  // 1. ตรวจสอบโหมด PFX (มักส่งออกจาก Windows Server Certificate Store)
  if (config.tls.pfxPath) {
    const resolvedPfxPath = path.resolve(config.tls.pfxPath);
    if (!fs.existsSync(resolvedPfxPath)) {
      throw new Error(`[TLS ERROR] ไม่พบไฟล์ PFX ที่ระบุ: ${resolvedPfxPath}`);
    }

    try {
      tlsOptions.pfx = fs.readFileSync(resolvedPfxPath);
      if (config.tls.passphrase) {
        tlsOptions.passphrase = config.tls.passphrase;
      }
      console.log(`[TLS INFO] โหลดใบรับรอง PFX สำเร็จ: ${resolvedPfxPath}`);
      return tlsOptions;
    } catch (err) {
      throw new Error(`[TLS ERROR] ไม่สามารถอ่านไฟล์ PFX (${resolvedPfxPath}): ${err.message}`);
    }
  }

  // 2. ตรวจสอบโหมด PEM (Certificate + Private Key แยกกัน)
  if (config.tls.certPath && config.tls.keyPath) {
    const resolvedCertPath = path.resolve(config.tls.certPath);
    const resolvedKeyPath = path.resolve(config.tls.keyPath);

    if (!fs.existsSync(resolvedCertPath)) {
      throw new Error(`[TLS ERROR] ไม่พบไฟล์ Certificate ที่ระบุ: ${resolvedCertPath}`);
    }
    if (!fs.existsSync(resolvedKeyPath)) {
      throw new Error(`[TLS ERROR] ไม่พบไฟล์ Private Key ที่ระบุ: ${resolvedKeyPath}`);
    }

    try {
      tlsOptions.cert = fs.readFileSync(resolvedCertPath);
      tlsOptions.key = fs.readFileSync(resolvedKeyPath);

      if (config.tls.caPath && fs.existsSync(path.resolve(config.tls.caPath))) {
        tlsOptions.ca = fs.readFileSync(path.resolve(config.tls.caPath));
        console.log(`[TLS INFO] โหลด CA Chain Bundle สำเร็จ`);
      }

      console.log(`[TLS INFO] โหลดใบรับรอง PEM สำเร็จ: ${resolvedCertPath}`);
      return tlsOptions;
    } catch (err) {
      throw new Error(`[TLS ERROR] ไม่สามารถอ่านไฟล์ PEM: ${err.message}`);
    }
  }

  // หากไม่มีการระบุไฟล์ Certificate เลย
  const errorMsg = [
    '========================================================================',
    '[TLS ERROR] ไม่พบการระบุไฟล์ใบรับรอง SSL/TLS สำหรับ HTTPS Port 3002!',
    'กรุณาระบุในไฟล์ .env อย่างใดอย่างหนึ่ง:',
    '  - SSL_CERT_PATH และ SSL_KEY_PATH (สำหรับไฟล์ .crt / .key)',
    '  - หรือ SSL_PFX_PATH และ SSL_PASSPHRASE (สำหรับไฟล์ .pfx)',
    'หมายเหตุ: ใบรับรองต้องรองรับ Subject Alternative Name (SAN) IP: 10.2.0.13',
    'คุณสามารถใช้สคริปต์ generate-san-cert.ps1 ในโฟลเดอร์ scripts/ เพื่อสร้างได้',
    '========================================================================'
  ].join('\n');

  throw new Error(errorMsg);
}

module.exports = {
  loadTlsOptions
};
