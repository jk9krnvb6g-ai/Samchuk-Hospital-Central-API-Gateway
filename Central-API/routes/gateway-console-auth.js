'use strict';

/**
 * @file Central-API/routes/gateway-console-auth.js
 * Server-side Admin Authentication & Session Layer for Gateway V2 Management Console
 *
 * ข้อกำหนดความปลอดภัยเคร่งครัด:
 * 1. ใช้ HttpOnly, Secure, SameSite Cookie สำหรับ Session ผ่าน HTTPS
 * 2. ห้ามส่ง GATEWAY_ADMIN_TOKEN ไปยัง Browser หรือ Client Bundle
 * 3. ตรวจสอบสิทธิ์ฝั่ง Server ก่อนส่งข้อมูล Management / Registry API
 * 4. บันทึก Audit Log ทุกการเข้าสู่ระบบและคำสั่งบริหารจัดการ
 * 5. ป้องกัน Procurement เสมอ (ห้าม Stop, Reload, Rollback)
 * 6. คำสั่ง Mutation ถูกควบคุมด้วย GATEWAY_ADMIN_MUTATIONS_ENABLED
 */

const express = require('express');
const crypto = require('node:crypto');
const registry = require('../modules/registry');
const { inspectModule } = require('../modules/health-monitor');
const { auditAdminAction } = require('../middleware/admin-audit');

const router = express.Router();

// Server-side Secret for signing session cookies
const SESSION_SECRET = process.env.GATEWAY_SESSION_SECRET ||
  (process.env.GATEWAY_ADMIN_TOKEN && process.env.GATEWAY_ADMIN_TOKEN.length >= 32
    ? process.env.GATEWAY_ADMIN_TOKEN
    : 'samchuk-hospital-gateway-v2-session-secret-key-32chars!');

// In-memory Session Store with TTL
const activeSessions = new Map();
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 ชั่วโมง

// เคลียร์ session ที่หมดอายุเป็นระยะ
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(id);
    }
  }
}, 60000).unref();

/**
 * ลงชื่อกำกับ Token (HMAC-SHA256) ป้องกันการปลอมแปลง
 */
function signToken(token) {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(token);
  return `${token}.${hmac.digest('hex')}`;
}

/**
 * ตรวจสอบความถูกต้องของ Signed Token
 */
function verifyToken(signedToken) {
  if (!signedToken || typeof signedToken !== 'string') return null;
  const parts = signedToken.split('.');
  if (parts.length !== 2) return null;

  const [token, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return token;
}

/**
 * ดึง Cookie จาก Header
 */
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;

  rc.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    const value = decodeURIComponent(parts.join('='));
    if (name) list[name] = value;
  });
  return list;
}

/**
 * Middleware ตรวจสอบ Admin Session จาก HttpOnly Cookie
 */
function requireAdminSession(req, res, next) {
  const cookies = parseCookies(req);
  const rawCookie = cookies.samchuk_admin_session;

  const tokenId = verifyToken(rawCookie);
  if (!tokenId) {
    return res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ (Admin Authentication Required)'
    });
  }

  const session = activeSessions.get(tokenId);
  if (!session || Date.now() > session.expiresAt) {
    activeSessions.delete(tokenId);
    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง'
    });
  }

  // อัปเดตอายุเซสชัน
  session.lastActive = Date.now();
  req.adminUser = session.user;
  next();
}

/**
 * POST /api/gateway/auth/login
 * เข้าสู่ระบบผู้ดูแล Gateway ด้วยชื่อผู้ใช้และรหัสผ่าน
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  const expectedUser = process.env.GATEWAY_CONSOLE_USER || 'admin';
  const expectedPassword = process.env.GATEWAY_CONSOLE_PASSWORD || 'SamchukAdmin2026!';

  // Constant-time comparison เพื่อป้องกัน Timing Attacks
  const userValid = username &&
    username.length === expectedUser.length &&
    crypto.timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser));

  const passValid = password &&
    password.length === expectedPassword.length &&
    crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword));

  if (!userValid || !passValid) {
    try {
      auditAdminAction({
        action: 'CONSOLE_LOGIN_FAILURE',
        moduleId: 'auth',
        outcome: 'FAILED_CREDENTIALS',
        requestId: req.id
      });
    } catch (_) {}

    return res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง'
    });
  }

  // สร้างเซสชันใหม่
  const tokenId = crypto.randomBytes(32).toString('hex');
  const signedToken = signToken(tokenId);

  activeSessions.set(tokenId, {
    user: { username: expectedUser, role: 'Gateway Administrator' },
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    lastActive: Date.now()
  });

  // บันทึก Audit Log
  try {
    auditAdminAction({
      action: 'CONSOLE_LOGIN_SUCCESS',
      moduleId: 'auth',
      outcome: 'SUCCESS',
      requestId: req.id
    });
  } catch (_) {}

  // ตั้งค่า Cookie HttpOnly + Secure (ไม่มี token ใน body response)
  const isSecure = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
  res.cookie('samchuk_admin_session', signedToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS
  });

  return res.json({
    success: true,
    user: {
      username: expectedUser,
      role: 'Gateway Administrator'
    },
    message: 'เข้าสู่ระบบสำเร็จ'
  });
});

/**
 * POST /api/gateway/auth/logout
 * ออกจากระบบผู้ดูแลระบบ และทำลาย Session
 */
router.post('/logout', (req, res) => {
  const cookies = parseCookies(req);
  const tokenId = verifyToken(cookies.samchuk_admin_session);
  if (tokenId) {
    activeSessions.delete(tokenId);
  }

  try {
    auditAdminAction({
      action: 'CONSOLE_LOGOUT',
      moduleId: 'auth',
      outcome: 'SUCCESS',
      requestId: req.id
    });
  } catch (_) {}

  res.clearCookie('samchuk_admin_session', { path: '/' });
  return res.json({
    success: true,
    message: 'ออกจากระบบเรียบร้อยแล้ว'
  });
});

/**
 * GET /api/gateway/auth/session
 * ตรวจสอบสถานะการล็อกอินปัจจุบัน
 */
router.get('/session', (req, res) => {
  const cookies = parseCookies(req);
  const tokenId = verifyToken(cookies.samchuk_admin_session);

  if (!tokenId) {
    return res.json({ authenticated: false });
  }

  const session = activeSessions.get(tokenId);
  if (!session || Date.now() > session.expiresAt) {
    activeSessions.delete(tokenId);
    return res.json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: session.user
  });
});

/**
 * GET /api/gateway/auth/modules
 * ดึงรายการ Registry จริงหลังผ่านการตรวจสอบสิทธิ์ Server-side
 */
router.get('/modules', requireAdminSession, (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json({
    success: true,
    modules: registry.getHealthSummary()
  });
});

/**
 * GET /api/gateway/auth/modules/:id/health
 * ตรวจสอบสถานะสุขภาพเชิงลึกของโมดูล
 */
router.get('/modules/:id/health', requireAdminSession, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const record = registry.getModule(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'MODULE_NOT_FOUND' });
  }
  const result = await inspectModule(record);
  return res.json({ id: record.id, ...result });
});

/**
 * POST /api/gateway/auth/modules/:id/:action
 * ควบคุมโมดูล (ตรวจสอบ Protected Module และ Mutation Flag)
 */
router.post('/modules/:id/:action', requireAdminSession, async (req, res) => {
  const { id, action } = req.params;

  // บันทึก Audit ทุกคำสั่งเสมอ
  try {
    auditAdminAction({
      action: `CONSOLE_MODULE_${action.toUpperCase()}`,
      moduleId: id,
      outcome: 'REQUESTED',
      requestId: req.id
    });
  } catch (_) {}

  if (!['start', 'stop', 'reload', 'rollback'].includes(action)) {
    return res.status(404).json({ error: 'UNKNOWN_ACTION' });
  }

  const record = registry.getModule(id);
  if (!record) {
    return res.status(404).json({ error: 'MODULE_NOT_FOUND' });
  }

  // 1. Procurement ได้รับการป้องกันสูงสุดเสมอ ห้ามดำเนินการ
  if (record.required || id === 'procurement') {
    return res.status(403).json({
      error: 'PROTECTED_MODULE',
      message: 'ระบบ Procurement ได้รับการคุ้มครองตามนโยบายโรงพยาบาล ห้ามเปลี่ยนสถานะ'
    });
  }

  // 2. ตรวจสอบ Flag การเปลี่ยนแปลงระบบ
  if (process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED !== 'true') {
    return res.status(403).json({
      error: 'MUTATIONS_DISABLED',
      message: 'คำสั่งแก้ไขระบบถูกปิดใช้งานในระยะแรก (GATEWAY_ADMIN_MUTATIONS_ENABLED=false)'
    });
  }

  return res.status(403).json({
    error: 'MUTATIONS_DISABLED',
    message: 'ระยะแรกกำหนดให้ทุกการจัดการเป็น Read-Only เพื่อความปลอดภัยของระบบโรงพยาบาล'
  });
});

module.exports = router;
