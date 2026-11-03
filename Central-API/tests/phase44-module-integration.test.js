'use strict';
// Phase 4.4: isolated integration contract tests. No sockets, IIS edits, or production dependencies.
const assert = require('node:assert/strict');
const express = require('express');
const { ModuleRegistry } = require('../modules/registry');
const { sendInProcessRequest } = require('./in-process-tester');

function adapter(id) {
  const router = express.Router();
  router.get('/probe', (req, res) => res.json({
    module: id, path: req.path, query: req.query.marker || null
  }));
  return { router, getHealth: () => ({ status: 'UP' }) };
}

async function main() {
  const registry = new ModuleRegistry();
  const definitions = [
    ['procurement', '/api/Procurement', true, true],
    ['sam-att', '/api/Sam_Att', false, true],
    ['cash-cheque', '/api/Cash_Cheque', false, false]
  ];
  for (const [id, prefix, required, enabled] of definitions) {
    registry.register({ id, prefix, required, enabled, router: adapter(id) });
  }
  // Isolated fixture: prevent loading deployment paths or default singleton configuration.
  registry.isInitialized = true;
  const app = express();
  registry.mountAll(app);
  app.use((_req, res) => res.status(404).json({ code: 'UNMATCHED_PATH' }));
  const get = url => sendInProcessRequest(app, { url });

  for (const [id, prefix, , enabled] of definitions) {
    const response = await get(prefix + '/probe');
    if (enabled) {
      assert.equal(response.status, 200, id + ' route must be reachable');
      assert.equal(response.body.module, id);
      assert.equal(response.body.path, '/probe', 'prefix must be stripped exactly once');
    } else {
      assert.equal(response.status, 503, 'disabled module must fail closed');
      assert.equal(response.body.error.code, 'MODULE_UNAVAILABLE');
      assert.equal(response.body.error.systemId, id);
    }
  }
  console.log('PASS: three module prefixes, correct router dispatch, disabled module fail-closed');

  const boundary = await get('/api/ProcurementExtra/probe');
  assert.equal(boundary.status, 404);
  assert.equal(boundary.body.code, 'UNMATCHED_PATH');
  const caseMismatch = await get('/api/procurement/probe');
  assert.equal(caseMismatch.status, 404, 'module prefix matching must preserve case');
  console.log('PASS: prefix segment boundary and exact-case routing');

  const startCash = registry.start('cash-cheque');
  assert.equal(startCash.status, 'ACTIVE');
  const cashResponse = await get('/api/Cash_Cheque/probe');
  assert.equal(cashResponse.status, 200);
  assert.equal(cashResponse.body.module, 'cash-cheque');
  await registry.stop('cash-cheque');
  assert.equal((await get('/api/Cash_Cheque/probe')).status, 503);
  console.log('PASS: start/stop changes dispatch without remounting or opening ports');

  assert.equal(registry.getModule('procurement').required, true);
  await assert.rejects(registry.safeReload('procurement', adapter('other')), /Protected/);
  assert.throws(() => registry.rollback('procurement'), /Protected/);
  assert.throws(() => registry.stageCandidate('procurement', adapter('other')), /Protected/);
  console.log('PASS: Procurement reload, rollback and staging remain protected');
  console.log('PHASE 4.4 IN-PROCESS INTEGRATION: PASS');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
