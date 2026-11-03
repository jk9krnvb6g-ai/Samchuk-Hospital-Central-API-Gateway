/**
 * Phase 1 smoke tests. No network listeners and no production connections.
 * Run: node tests/module-manager.test.js
 */
const assert = require('node:assert/strict');
const express = require('express');
const { ModuleRegistry, STATES } = require('../modules/registry');

async function main() {
  const registry = new ModuleRegistry();
  const router = express.Router();
  router.get('/health', (_req, res) => res.json({ ok: true }));

  const module = registry.register({
    id: 'sample', name: 'Sample', prefix: '/api/Sample',
    enabled: true, router
  });
  assert.equal(module.status, STATES.ACTIVE);
  assert.equal(registry.getHealthSummary().sample.inFlight, 0);
  assert.throws(() => registry.register({
    id: 'duplicate-prefix', prefix: '/api/sample', router
  }), /Duplicate module prefix/);

  const app = express();
  registry.mountAll(app);
  assert.throws(() => registry.mountAll(app), /already mounted/);

  await registry.stop('sample');
  assert.equal(registry.getModule('sample').status, STATES.DISABLED);
  registry.start('sample');
  assert.equal(registry.getModule('sample').status, STATES.ACTIVE);

  const missing = registry.register({
    id: 'missing', prefix: '/api/Missing', enabled: true,
    externalPath: '__nonexistent_module__.js'
  });
  assert.equal(missing.status, STATES.NOT_CONFIGURED);
  await registry.stop('missing');
  assert.equal(missing.status, STATES.DISABLED);
  console.log('PASS: registry states, stop/start, duplicate prefix and mount guard');
}

main().catch(err => { console.error(err); process.exitCode = 1; });
