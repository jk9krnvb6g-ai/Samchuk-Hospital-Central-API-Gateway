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
  const id = 'phase43-audit';
  const make = version => {
    const router = express.Router();
    router.get('/version', (_req, res) => res.json({ version }));
    return { router, getHealth: () => true };
  };
  registry.register({ id, prefix: '/api/Phase43Audit', router: make('v1') });
  const app = express();
  app.use('/api/gateway/admin', admin);
  registry.mountAll(app);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-phase43-audit-'));
  const keys = ['GATEWAY_ADMIN_ENABLED','GATEWAY_ADMIN_TOKEN','GATEWAY_ADMIN_MUTATIONS_ENABLED','GATEWAY_ADMIN_AUDIT_DIR'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const token = 'q'.repeat(48);
  const request = action => sendInProcessRequest(app, {
    method: 'POST', url: '/api/gateway/admin/modules/' + id + '/' + action,
    headers: { authorization: 'Bearer ' + token }
  });
  const version = async () => (await sendInProcessRequest(app, { url: '/api/Phase43Audit/version' })).body.version;
  try {
    process.env.GATEWAY_ADMIN_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED = 'true';
    process.env.GATEWAY_ADMIN_TOKEN = token;
    process.env.GATEWAY_ADMIN_AUDIT_DIR = path.join(dir, 'missing');
    registry.stageCandidate(id, make('v2'));
    // A directory at the audit log's file path makes appendFileSync fail.
    fs.mkdirSync(path.join(dir, 'missing', 'gateway-admin-audit.log'), { recursive: true });
    let response = await request('reload');
    assert.equal(response.status, 503);
    assert.equal(response.body.error, 'AUDIT_UNAVAILABLE');
    assert.equal(await version(), 'v1');
    assert.equal(registry.getModule(id).stagedAvailable, undefined); // staged state is exposed via publicRecord only
    assert.equal(registry.publicRecord(registry.getModule(id)).stagedAvailable, true);
    fs.rmSync(path.join(dir, 'missing'), { recursive: true, force: true });
    process.env.GATEWAY_ADMIN_AUDIT_DIR = dir;
    response = await request('reload');
    assert.equal(response.status, 200);
    assert.equal(await version(), 'v2');
    await new Promise(resolve => setImmediate(resolve));
    // Failure before rollback must preserve v2.
    process.env.GATEWAY_ADMIN_AUDIT_DIR = path.join(dir, 'missing');
    fs.mkdirSync(path.join(dir, 'missing', 'gateway-admin-audit.log'), { recursive: true });
    response = await request('rollback');
    assert.equal(response.status, 503);
    assert.equal(await version(), 'v2');
    fs.rmSync(path.join(dir, 'missing'), { recursive: true, force: true });
    process.env.GATEWAY_ADMIN_AUDIT_DIR = dir;
    await new Promise(resolve => setImmediate(resolve));
    response = await request('rollback');
    assert.equal(response.status, 200);
    assert.equal(await version(), 'v1');
    console.log('PASS: audit pre-write failure blocks reload/rollback and preserves versions');
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
