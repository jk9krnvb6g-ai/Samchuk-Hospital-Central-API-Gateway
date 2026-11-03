'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const registry = require('../modules/registry');
const admin = require('../routes/gateway-admin');
const { sendInProcessRequest } = require('./in-process-tester');

async function main() {
  registry.init();
  const id = 'audit-test-module';
  registry.register({ id, prefix: '/api/AuditTestModule', enabled: false, router: express.Router() });
  const app = express();
  app.use('/api/gateway/admin', admin);
  const keys = ['GATEWAY_ADMIN_ENABLED', 'GATEWAY_ADMIN_TOKEN', 'GATEWAY_ADMIN_MUTATIONS_ENABLED', 'GATEWAY_ADMIN_AUDIT_DIR'];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const originalAppend = fs.appendFileSync;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-audit-test-'));
  const token = 'b'.repeat(48);
  const send = () => sendInProcessRequest(app, {
    method: 'POST', url: '/api/gateway/admin/modules/' + id + '/start',
    headers: { authorization: 'Bearer ' + token }
  });
  try {
    process.env.GATEWAY_ADMIN_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_TOKEN = token;
    process.env.GATEWAY_ADMIN_AUDIT_DIR = dir;

    fs.appendFileSync = () => { throw new Error('SIMULATED_DISK_FAILURE'); };
    let response = await send();
    assert.equal(response.status, 503);
    assert.equal(response.body.error, 'AUDIT_UNAVAILABLE');
    assert.equal(registry.getModule(id).status, 'DISABLED');

    let writes = 0;
    fs.appendFileSync = (...args) => {
      writes++;
      if (writes === 2) throw new Error('SIMULATED_SECOND_WRITE_FAILURE');
      return originalAppend(...args);
    };
    response = await send();
    assert.equal(response.status, 503);
    assert.equal(response.body.error, 'AUDIT_COMPLETION_FAILED');
    assert.equal(response.body.operationApplied, true);
    assert.equal(registry.getModule(id).status, 'ACTIVE');
    console.log('PASS: pre-action audit failure blocks mutation; post-action failure reports applied state');
  } finally {
    fs.appendFileSync = originalAppend;
    for (const k of keys) {
      if (previous[k] === undefined) delete process.env[k]; else process.env[k] = previous[k];
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
