'use strict';
const assert = require('node:assert/strict');
const app = require('../app');
const { sendInProcessRequest } = require('./in-process-tester');

async function main() {
  const health = await sendInProcessRequest(app, { url: '/api/health' });
  assert.ok([200, 503].includes(health.status));
  assert.equal(Object.hasOwn(health.body, 'subsystems'), false);
  assert.equal(Object.hasOwn(health.body, 'cors'), false);
  const detailed = await sendInProcessRequest(app, { url: '/api/gateway/health' });
  assert.equal(detailed.status, 404);
  const admin = await sendInProcessRequest(app, { url: '/api/gateway/admin/modules' });
  assert.equal(admin.status, 403);
  console.log('PASS: public readiness redacted, detailed endpoint removed, admin protected');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
