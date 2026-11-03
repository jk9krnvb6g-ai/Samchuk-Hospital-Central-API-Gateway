'use strict';
// Read-only release gate: never starts a server, changes config, or opens a socket.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const modulesConfig = require('../config/modules');
const { ModuleRegistry } = require('../modules/registry');
const { sendInProcessRequest } = require('./in-process-tester');
const express = require('express');

async function main() {
  const results = [];
  function check(name, fn) {
    try { fn(); results.push({ name, status: 'PASS' }); }
    catch (error) { results.push({ name, status: 'FAIL', reason: error.message }); }
  }
  check('port-3002-only', () => {
    assert.equal(config.server.port, 3002);
    assert.equal(config.server.enforcePort, 3002);
    assert.equal(config.validate().isValid, true);
  });
  check('https-enabled', () => assert.equal(config.tls.enabled, true));
  check('frontend-3001-allowlist', () => {
    assert.ok(config.cors.allowedOrigins.length > 0);
    for (const origin of config.cors.allowedOrigins) {
      const url = new URL(origin);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.port, '3001');
      assert.ok(!url.username && !url.password);
    }
  });
  check('module-prefixes-and-procurement-protection', () => {
    const defs = modulesConfig.registeredSubsystems;
    const expected = { procurement: '/api/Procurement', 'sam-att': '/api/Sam_Att', 'cash-cheque': '/api/Cash_Cheque' };
    for (const [id, prefix] of Object.entries(expected)) {
      const def = defs.find(x => x.id === id);
      assert.ok(def);
      assert.equal(def.prefix, prefix);
    }
    assert.equal(defs.find(x => x.id === 'procurement').required, true);
    assert.equal(new Set(defs.map(x => x.prefix.toLowerCase())).size, defs.length);
  });
  check('admin-default-deny', () => {
    assert.notEqual(process.env.GATEWAY_ADMIN_ENABLED, 'true', 'Admin enabled in test environment');
    assert.notEqual(process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED, 'true', 'Admin mutations enabled in test environment');
  });
  check('no-listener-in-test-scripts', () => {
    for (const name of ['phase43-safety.test.js', 'phase43-audit-safety.test.js', 'safe-reload.test.js']) {
      const source = fs.readFileSync(path.join(__dirname, name), 'utf8');
      assert.doesNotMatch(source, /\.listen\s*\(/);
    }
  });
  const registry = new ModuleRegistry();
  const app = express();
  registry.mountAll(app);
  const health = await sendInProcessRequest(app, { url: '/api/health' });
  // Isolated registry is not attached to the global application health endpoint.
  check('isolated-registry-no-extra-ports', () => {
    assert.equal(registry.isMounted, true);
    assert.ok(registry.getModule('procurement'));
    assert.ok(health.status === 404 || health.status === 200);
  });
  for (const result of results) console.log(result.status + ': ' + result.name + (result.reason ? ' - ' + result.reason : ''));
  const failed = results.filter(x => x.status === 'FAIL');
  console.log('RELEASE STATIC GATE: ' + (results.length - failed.length) + '/' + results.length);
  console.log('NOT VERIFIED: actual port collision, IIS TLS handshake, production adapters, Windows service recovery, live traffic');
  if (failed.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
