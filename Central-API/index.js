/**
 * @file index.js
 * HTTPS Network Listener & Process Manager for Samchuk Hospital Central API Gateway
 * รับผิดชอบการเปิด HTTPS Listener บนพอร์ต 3002 เพียงตัวเดียวบน Windows Server
 * พร้อมระบบตรวจสอบพอร์ตซ้ำซ้อนและการปิดระบบแบบ Graceful Shutdown
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const app = require('./app');
const config = require('./config');
const { loadTlsOptions } = require('./config/tls');

const PID_FILE_PATH = path.join(__dirname, 'gateway.pid');

/**
 * ฟังก์ชันตรวจสอบว่าพอร์ต 3002 ถูกครอบครองอยู่แล้วหรือไม่ (Pre-flight Port Check)
 * ป้องกันการเริ่มระบบซ้ำซ้อนหรือทับซ้อนกับระบบ Procurement เดิมที่กำลังทำงานอยู่
 * @param {number} port 
 * @param {string} host 
 * @returns {Promise<boolean>} คืนค่า true หากพอร์ตว่าง, false หากถูกใช้งานอยู่
 */
function checkPortAvailable(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // ข้อผิดพลาดอื่น ถือว่าพอร์ตไม่พร้อม
        resolve(false);
      }
    });

    tester.once('listening', () => {
      tester.close(() => {
        resolve(true);
      });
    });

    tester.listen(port, host);
  });
}

/**
 * เขียน Process ID (PID) ลงไฟล์ เพื่อให้สคริปต์ Windows BAT ตรวจสอบและควบคุมได้อย่างปลอดภัย
 */
function writePidFile() {
  try {
    fs.writeFileSync(PID_FILE_PATH, process.pid.toString(), 'utf8');
  } catch (err) {
    console.warn(`[PROCESS WARNING] ไม่สามารถบันทึกไฟล์ gateway.pid: ${err.message}`);
  }
}

/**
 * ลบไฟล์ PID เมื่อปิดระบบ
 */
function removePidFile() {
  try {
    if (fs.existsSync(PID_FILE_PATH)) {
      fs.unlinkSync(PID_FILE_PATH);
    }
  } catch (err) {
    // ละเว้นหากไฟล์ถูกลบไปแล้ว
  }
}

/**
 * เริ่มต้นเซิร์ฟเวอร์ Gateway
 */
async function startServer() {
  console.log('========================================================================');
  console.log('         โรงพยาบาลสามชุก - CENTRAL API GATEWAY (HTTPS PORT 3002)         ');
  console.log('========================================================================');

  // ตรวจสอบความถูกต้องของการตั้งค่า
  const validation = config.validate();
  if (!validation.isValid) {
    console.error('[FATAL ERROR] การตั้งค่าระบบไม่ถูกต้อง:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  const TARGET_PORT = config.server.port;
  const TARGET_HOST = config.server.host;

  console.log(`[PRE-FLIGHT] กำลังตรวจสอบสถานะพอร์ต ${TARGET_PORT}...`);
  const isAvailable = await checkPortAvailable(TARGET_PORT, TARGET_HOST);

  if (!isAvailable) {
    console.error('------------------------------------------------------------------------');
    console.error(`[CRITICAL ERROR] พอร์ต ${TARGET_PORT} กำลังถูกใช้งานอยู่โดย Process อื่น!`);
    console.error('ระบบปฏิเสธการเริ่มทำงานโดยเด็ดขาดตามนโยบายความปลอดภัย:');
    console.error('  1. ขณะนี้ระบบ Procurement เดิมอาจกำลังใช้งานพอร์ต 3002 อยู่');
    console.error('  2. ห้ามใช้คำสั่ง taskkill /F แบบอัตโนมัติ เพราะอาจกระทบระบบการแพทย์และการจัดซื้อ');
    console.error('  3. ให้ใช้คำสั่ง scripts\\check-port.bat เพื่อตรวจสอบ PID และชื่อ Process');
    console.error('  4. ระบบจะไม่มีการสลับพอร์ตไปใช้พอร์ตอื่นโดยอัตโนมัติ');
    console.error('------------------------------------------------------------------------');
    process.exit(1);
  }

  let server;

  // โหลดตัวเลือก TLS สำหรับ HTTPS
  if (config.tls.enabled) {
    let tlsOptions;
    try {
      tlsOptions = loadTlsOptions();
    } catch (err) {
      console.error(err.message);
      console.error('[FATAL ERROR] ไม่สามารถโหลดใบรับรอง TLS ได้ ระบบไม่สามารถเริ่มทำงาน');
      process.exit(1);
    }

    server = https.createServer(tlsOptions, app);
  } else {
    // ในโหมด Development สำหรับทดสอบภายในเท่านั้น
    console.warn('[SECURITY WARNING] เริ่มเซิร์ฟเวอร์ในโหมด HTTP ไม่เข้ารหัส (ห้ามใช้ใน Production)');
    server = http.createServer(app);
  }

  // Event เมื่อเกิดข้อผิดพลาดในการ Listen
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[FATAL ERROR] ไม่สามารถผูกกับพอร์ต ${TARGET_PORT} ได้ (EADDRINUSE)`);
      removePidFile();
      process.exit(1);
    } else {
      console.error(`[SERVER ERROR] เกิดข้อผิดพลาดที่ไม่คาดคิด:`, error);
      removePidFile();
      process.exit(1);
    }
  });

  // เริ่มต้นรับการเชื่อมต่อบนพอร์ต 3002
  server.listen(TARGET_PORT, TARGET_HOST, () => {
    writePidFile();
    const protocol = config.tls.enabled ? 'https' : 'http';
    console.log(`[GATEWAY READY] เซิร์ฟเวอร์เริ่มทำงานสำเร็จ!`);
    console.log(`  - URL ปลายทาง: ${protocol}://10.2.0.13:${TARGET_PORT}/`);
    console.log(`  - Health Check: ${protocol}://10.2.0.13:${TARGET_PORT}/api/health`);
    console.log(`  - Process ID: ${process.pid}`);
    console.log(`  - ระบบที่รองรับ:`);
    console.log(`      * Procurement  -> /api/Procurement/`);
    console.log(`      * Sam_Att      -> /api/Sam_Att/`);
    console.log(`      * Cash_Cheque  -> /api/Cash_Cheque/`);
    console.log('========================================================================');
  });

  // ระบบ Graceful Shutdown เมื่อได้รับคำสั่งปิด
  const shutdown = (signal) => {
    console.log(`\n[SHUTDOWN] ได้รับสัญญาณ ${signal} กำลังปิดการเชื่อมต่ออย่างปลอดภัย...`);
    
    // ตั้ง Timeout บังคับปิดกรณีมีการเชื่อมต่อค้างนานเกิน 10 วินาที
    const forceExitTimeout = setTimeout(() => {
      console.error('[SHUTDOWN WARNING] บังคับปิดระบบเนื่องจากหมดเวลา Graceful Shutdown');
      removePidFile();
      process.exit(1);
    }, 10000);

    server.close(() => {
      clearTimeout(forceExitTimeout);
      console.log('[SHUTDOWN] ปิดการเชื่อมต่อ Gateway ทั้งหมดเรียบร้อยแล้ว');
      removePidFile();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // จัดการ Uncaught Exceptions ป้องกันเซิร์ฟเวอร์ค้างในสถานะไม่สมบูรณ์
  process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
    // บันทึก log ก่อนปิด
    removePidFile();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION] ที่:', promise, 'เหตุผล:', reason);
  });
}

// เริ่มต้นเซิร์ฟเวอร์
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[STARTUP ERROR]', err);
    process.exit(1);
  });
}

module.exports = {
  checkPortAvailable,
  startServer
};
