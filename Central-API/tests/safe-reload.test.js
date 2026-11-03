'use strict';
const assert = require('node:assert/strict');
const express = require('express');
const { ModuleRegistry, STATES } = require('../modules/registry');
const { sendInProcessRequest } = require('./in-process-tester');

async function main() {
  const registry = new ModuleRegistry();
  const makeCandidate = (version, health = () => true) => {
    const router = express.Router();
    router.get('/version', (_req, res) => res.json({ version }));
    return { router, getHealth: health };
  };
  registry.register({ id: 'reload-test', prefix: '/api/ReloadTest', router: makeCandidate('v1') });
  const app = express();
  registry.mountAll(app);
  const get = () => sendInProcessRequest(app, { url: '/api/ReloadTest/version' });
  assert.equal((await get()).body.version, 'v1');

  await assert.rejects(registry.safeReload('reload-test', makeCandidate('bad', () => false)), /not healthy/);
  assert.equal((await get()).body.version, 'v1');
  await assert.rejects(registry.safeReload('reload-test', makeCandidate('bad', () => new Promise(() => {})), { timeoutMs: 10 }), /timeout/);
  assert.equal((await get()).body.version, 'v1');
  await registry.safeReload('reload-test', makeCandidate('v2'));
  assert.equal((await get()).body.version, 'v2');
  assert.equal(registry.getModule('reload-test').version, 2);
  registry.rollback('reload-test');
  assert.equal((await get()).body.version, 'v1');
  assert.equal(registry.getModule('reload-test').version, 1);
  assert.throws(() => registry.rollback('reload-test'), /No rollback/);

  assert.ok(registry.getModule('procurement'), 'Configured protected procurement module must exist');
  await assert.rejects(registry.safeReload('procurement', makeCandidate('bad')), /Protected/);
  assert.throws(() => registry.rollback('procurement'), /Protected/);

  const record = registry.getModule('reload-test');
  record.inFlight = 1;
  await assert.rejects(registry.stop('reload-test', { timeoutMs: 10 }), /timed out/);
  assert.equal(record.status, STATES.DRAINING);
  assert.equal(record.operationBusy, false);
  registry.recoverDrain('reload-test');
  assert.equal(record.status, STATES.ACTIVE);
  record.inFlight = 0;
  assert.equal((await get()).body.version, 'v1');
  console.log('PASS: failed candidate preserved; healthy swap; rollback; protected module; drain recovery');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
