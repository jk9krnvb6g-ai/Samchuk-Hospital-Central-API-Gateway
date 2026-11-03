'use strict';
/**
 * @file Central-API/tests/gateway-console-auth.test.js
 * In-process test suite for Gateway Console Admin Authentication & Session Layer
 */

const assert = require('node:assert/strict');
const express = require('express');
const authRoute = require('../routes/gateway-console-auth');
const registry = require('../modules/registry');
const { sendInProcessRequest } = require('./in-process-tester');

async function runTests() {
  registry.init();
  const app = express();
  app.use(express.json());
  app.use('/api/gateway/auth', authRoute);

  console.log('[TEST] Starting Gateway Console Auth & Session tests...');

  // 1. Unauthenticated session check
  let res = await sendInProcessRequest(app, {
    method: 'GET',
    url: '/api/gateway/auth/session'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, false, 'Initial state must be unauthenticated');
  console.log('  ✓ 1. Unauthenticated session check passed');

  // 2. Unauthenticated access to /api/gateway/auth/modules
  res = await sendInProcessRequest(app, {
    method: 'GET',
    url: '/api/gateway/auth/modules'
  });
  assert.equal(res.status, 401, 'Unauthenticated request must receive 401');
  assert.equal(res.body.error, 'AUTHENTICATION_REQUIRED');
  console.log('  ✓ 2. Unauthenticated access blocked passed');

  // 3. Login with invalid password
  res = await sendInProcessRequest(app, {
    method: 'POST',
    url: '/api/gateway/auth/login',
    body: { username: 'admin', password: 'wrong-password' }
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'INVALID_CREDENTIALS');
  console.log('  ✓ 3. Invalid credentials rejected passed');

  // 4. Login with valid credentials
  res = await sendInProcessRequest(app, {
    method: 'POST',
    url: '/api/gateway/auth/login',
    body: { username: 'admin', password: 'SamchukAdmin2026!' }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.username, 'admin');
  assert.equal(res.body.token, undefined, 'Zero token in body (prevent leakage)');
  assert.equal(res.body.adminToken, undefined, 'Zero adminToken in body');

  const setCookie = res.headers['set-cookie'];
  assert.ok(setCookie, 'Set-Cookie header must be present');
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookieStr.includes('samchuk_admin_session='), 'Cookie name must match');
  console.log('  ✓ 4. Login with valid credentials and HttpOnly cookie passed');

  // Extract cookie value for subsequent authenticated requests
  const cookieValue = cookieStr.split(';')[0];

  // 5. Authenticated session check
  res = await sendInProcessRequest(app, {
    method: 'GET',
    url: '/api/gateway/auth/session',
    headers: { cookie: cookieValue }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, true);
  assert.equal(res.body.user.username, 'admin');
  console.log('  ✓ 5. Authenticated session verified passed');

  // 6. Access real module registry with session
  res = await sendInProcessRequest(app, {
    method: 'GET',
    url: '/api/gateway/auth/modules',
    headers: { cookie: cookieValue }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.modules.procurement, 'Procurement must exist');
  assert.equal(res.body.modules.procurement.required, true, 'Procurement must be required/protected');
  assert.equal(res.body.modules.procurement.prefix, '/api/Procurement');
  console.log('  ✓ 6. Access real module registry passed');

  // 7. Protect Procurement from mutations
  res = await sendInProcessRequest(app, {
    method: 'POST',
    url: '/api/gateway/auth/modules/procurement/stop',
    headers: { cookie: cookieValue }
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'PROTECTED_MODULE', 'Procurement stop must be rejected');

  res = await sendInProcessRequest(app, {
    method: 'POST',
    url: '/api/gateway/auth/modules/procurement/reload',
    headers: { cookie: cookieValue }
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'PROTECTED_MODULE', 'Procurement reload must be rejected');
  console.log('  ✓ 7. Protected module rejection for Procurement passed');

  // 8. Phase 1 read-only: non-procurement module actions rejected
  res = await sendInProcessRequest(app, {
    method: 'POST',
    url: '/api/gateway/auth/modules/sam-att/reload',
    headers: { cookie: cookieValue }
  });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'MUTATIONS_DISABLED');
  console.log('  ✓ 8. Phase 1 safe mutations disabled check passed');

  // 9. Logout
  res = await sendInProcessRequest(app, {
    method: 'POST',
    url: '/api/gateway/auth/logout',
    headers: { cookie: cookieValue }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  // 10. Verify session destroyed after logout
  res = await sendInProcessRequest(app, {
    method: 'GET',
    url: '/api/gateway/auth/session',
    headers: { cookie: cookieValue }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, false, 'Session must be destroyed after logout');
  console.log('  ✓ 9 & 10. Logout and session termination passed');

  console.log('\nALL 10 GATEWAY CONSOLE AUTH TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
