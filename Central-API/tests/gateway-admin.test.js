'use strict';
const assert = require('node:assert/strict');
const express = require('express');
const admin = require('../routes/gateway-admin');
const { sendInProcessRequest } = require('./in-process-tester');

async function main() {
  const app = express();
  app.use('/api/gateway/admin', admin);
  const previous = {
    enabled: process.env.GATEWAY_ADMIN_ENABLED,
    token: process.env.GATEWAY_ADMIN_TOKEN,
    mutations: process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED
  };
  try {
    delete process.env.GATEWAY_ADMIN_ENABLED;
    delete process.env.GATEWAY_ADMIN_TOKEN;
    let response = await sendInProcessRequest(app, { method: 'GET', url: '/api/gateway/admin/modules' });
    assert.equal(response.status, 403);
    process.env.GATEWAY_ADMIN_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_TOKEN = 'a'.repeat(48);
    response = await sendInProcessRequest(app, { method: 'GET', url: '/api/gateway/admin/modules', headers: { authorization: 'Bearer wrong' } });
    assert.equal(response.status, 403);
    response = await sendInProcessRequest(app, { method: 'GET', url: '/api/gateway/admin/modules', headers: { authorization: 'Bearer ' + 'a'.repeat(48) } });
    assert.equal(response.status, 200);
    assert.ok(response.body.modules);
    response = await sendInProcessRequest(app, { method: 'POST', url: '/api/gateway/admin/modules/procurement/stop', headers: { authorization: 'Bearer ' + 'a'.repeat(48) } });
    assert.equal(response.status, 403);
    console.log('PASS: admin default-deny, invalid token, valid token, protected module');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      const env = { enabled: 'GATEWAY_ADMIN_ENABLED', token: 'GATEWAY_ADMIN_TOKEN', mutations: 'GATEWAY_ADMIN_MUTATIONS_ENABLED' }[key];
      if (value === undefined) delete process.env[env]; else process.env[env] = value;
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
