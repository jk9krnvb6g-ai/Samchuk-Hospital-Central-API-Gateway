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
  const id = 'admin-reload-test';
  const candidate = version => {
    const router = express.Router();
    router.get('/version', (_req, res) => res.json({ version }));
    return { router, getHealth: () => true };
  };
  registry.register({ id, prefix: '/api/AdminReloadTest', router: candidate('v1') });
  const app = express();
  app.use('/api/gateway/admin', admin);
  registry.mountAll(app);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-admin-reload-'));
  const keys = ['GATEWAY_ADMIN_ENABLED','GATEWAY_ADMIN_TOKEN','GATEWAY_ADMIN_MUTATIONS_ENABLED','GATEWAY_ADMIN_AUDIT_DIR'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const token = 'z'.repeat(48);
  const send = (action, auth = token) => sendInProcessRequest(app, {
    method: 'POST', url: '/api/gateway/admin/modules/' + id + '/' + action,
    headers: { authorization: 'Bearer ' + auth }
  });
  const version = async () => (await sendInProcessRequest(app, { url: '/api/AdminReloadTest/version' })).body.version;
  try {
    process.env.GATEWAY_ADMIN_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_TOKEN = token;
    process.env.GATEWAY_ADMIN_AUDIT_DIR = dir;
    delete process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED;
    assert.equal((await send('reload')).status, 403);
    process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED = 'true';
    assert.equal((await send('reload', 'wrong')).status, 403);
    assert.equal((await send('reload')).status, 409);
    assert.equal(await version(), 'v1');
    registry.stageCandidate(id, candidate('v2'));
    assert.equal((await send('reload')).status, 200);
    assert.equal(await version(), 'v2');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal((await send('rollback')).status, 200);
    assert.equal(await version(), 'v1');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal((await send('rollback')).status, 409);
    const protectedResponse = await sendInProcessRequest(app, {
      method: 'POST', url: '/api/gateway/admin/modules/procurement/reload',
      headers: { authorization: 'Bearer ' + token }
    });
    assert.equal(protectedResponse.status, 403);
    const log = fs.readdirSync(dir).map(file => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n');
    assert.match(log, /reload/);
    assert.match(log, /rollback/);
    assert.match(log, /COMPLETED/);
    console.log('PASS: admin reload/rollback auth, audit, no-stage deny, protected module');
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
