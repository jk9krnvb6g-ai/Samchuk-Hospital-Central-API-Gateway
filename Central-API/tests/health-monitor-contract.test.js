'use strict';
// Pure in-process health checks: no server socket, scanner, database or EXE required.
const assert = require('node:assert/strict');
const { inspectModule, inspectRegistry, normalizeHealth } = require('../modules/health-monitor');

async function main() {
  assert.equal(normalizeHealth(true), 'HEALTHY');
  assert.equal(normalizeHealth(false), 'UNHEALTHY');
  assert.equal(normalizeHealth({ status: 'UP' }), 'HEALTHY');
  assert.equal(normalizeHealth({ status: 'DOWN' }), 'UNHEALTHY');
  assert.equal(normalizeHealth({ status: 'unrecognized' }), 'UNKNOWN');

  const inactive = await inspectModule({ status: 'DISABLED' });
  assert.equal(inactive.health, 'UNAVAILABLE');
  assert.equal(inactive.reason, 'DISABLED');

  const missing = await inspectModule({ status: 'ACTIVE' });
  assert.equal(missing.health, 'UNKNOWN');
  assert.equal(missing.reason, 'NOT_IMPLEMENTED');

  const healthy = await inspectModule({ status: 'ACTIVE', healthCheck: () => ({ status: 'READY' }) });
  assert.equal(healthy.health, 'HEALTHY');

  const failed = await inspectModule({ status: 'ACTIVE', healthCheck: () => { throw new Error('private connection details'); } });
  assert.equal(failed.health, 'UNHEALTHY');
  assert.equal(failed.reason, 'CHECK_FAILED');
  assert.equal(JSON.stringify(failed).includes('private connection details'), false);

  const timedOut = await inspectModule({ status: 'ACTIVE', healthCheck: () => new Promise(() => {}) }, { timeoutMs: 10 });
  assert.equal(timedOut.health, 'UNHEALTHY');
  assert.equal(timedOut.reason, 'TIMEOUT');

  const summary = await inspectRegistry({
    getAll: () => [
      { id: 'sam_att', status: 'ACTIVE', healthCheck: () => true },
      { id: 'cash_cheque', status: 'DISABLED' }
    ]
  });
  assert.equal(summary.sam_att.health, 'HEALTHY');
  assert.equal(summary.cash_cheque.health, 'UNAVAILABLE');
  console.log('PASS: gateway health-monitor contract (in-process only)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
