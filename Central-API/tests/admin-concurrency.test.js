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
  const id = 'concurrency-test-module';
  registry.register({ id, prefix: '/api/ConcurrencyTest', router: express.Router() });
  const record = registry.getModule(id);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-concurrency-'));
  const keys = ['GATEWAY_ADMIN_ENABLED','GATEWAY_ADMIN_TOKEN','GATEWAY_ADMIN_MUTATIONS_ENABLED','GATEWAY_ADMIN_AUDIT_DIR'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const token = 'c'.repeat(48);
  const app = express();
  app.use('/api/gateway/admin', admin);
  const send = action => sendInProcessRequest(app, {
    method: 'POST', url: '/api/gateway/admin/modules/' + id + '/' + action,
    headers: { authorization: 'Bearer ' + token }
  });
  try {
    process.env.GATEWAY_ADMIN_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_TOKEN = token;
    process.env.GATEWAY_ADMIN_AUDIT_DIR = dir;
    record.inFlight = 1;
    const stopping = send('stop');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(record.status, 'DRAINING');
    const competing = await send('start');
    assert.equal(competing.status, 409);
    assert.equal(competing.body.error, 'MODULE_OPERATION_IN_PROGRESS');
    assert.equal(record.status, 'DRAINING');
    record.inFlight = 0;
    for (const resolve of record.drainWaiters.splice(0)) resolve(true);
    const stopped = await stopping;
    assert.equal(stopped.status, 200);
    assert.equal(record.status, 'DISABLED');
    // The in-process response resolves on res.json(), before the async
    // admin handler's finally releases its operation lock.
    await new Promise(resolve => setImmediate(resolve));
    const started = await send('start');
    assert.equal(started.status, 200);
    assert.equal(record.status, 'ACTIVE');
    console.log('PASS: concurrent mutation rejected during drain; serialized stop/start');
  } finally {
    record.inFlight = 0;
    for (const resolve of record.drainWaiters.splice(0)) resolve(true);
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
