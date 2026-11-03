'use strict';
const assert = require('node:assert/strict');
const { inspectModule, normalizeHealth } = require('../modules/health-monitor');

async function main() {
  assert.equal(normalizeHealth(true), 'HEALTHY');
  assert.equal(normalizeHealth({ status: 'UP' }), 'HEALTHY');
  assert.equal(normalizeHealth({ status: 'DOWN' }), 'UNHEALTHY');
  assert.equal(normalizeHealth({}), 'UNKNOWN');

  const active = { status: 'ACTIVE', healthCheck: async () => ({ status: 'UP' }) };
  assert.equal((await inspectModule(active)).health, 'HEALTHY');
  assert.equal((await inspectModule({ status: 'DISABLED' })).health, 'UNAVAILABLE');
  assert.equal((await inspectModule({ status: 'ACTIVE' })).health, 'UNKNOWN');
  assert.equal((await inspectModule({ status: 'ACTIVE', healthCheck: () => { throw new Error('offline'); } })).health, 'UNHEALTHY');
  assert.equal((await inspectModule({ status: 'ACTIVE', healthCheck: () => new Promise(() => {}) }, { timeoutMs: 10 })).reason, 'TIMEOUT');
  console.log('PASS: health status, missing check, failure and timeout');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
