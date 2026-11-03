'use strict';
const assert = require('node:assert/strict');
const express = require('express');
const { ModuleRegistry } = require('../modules/registry');
const { sendInProcessRequest } = require('./in-process-tester');

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
function candidate(version, hold, health = () => true) {
  const router = express.Router();
  router.get('/work', async (_req, res) => {
    if (hold) await hold.promise;
    res.json({ version });
  });
  return { router, getHealth: health };
}
async function main() {
  const registry = new ModuleRegistry();
  const oldHold = deferred();
  const id = 'phase43-test';
  registry.register({ id, prefix: '/api/Phase43', router: candidate('v1', oldHold) });
  const app = express();
  registry.mountAll(app);
  const send = () => sendInProcessRequest(app, { url: '/api/Phase43/work' });
  const oldRequest = send();
  assert.equal(registry.getModule(id).inFlight, 1, 'Old request must remain in flight');
  await registry.safeReload(id, candidate('v2'));
  const newRequest = await send();
  assert.equal(newRequest.status, 200);
  assert.equal(newRequest.body.version, 'v2');
  oldHold.resolve();
  const oldResponse = await oldRequest;
  assert.equal(oldResponse.status, 200);
  assert.equal(oldResponse.body.version, 'v1', 'Old request must retain old router');
  assert.equal(registry.getModule(id).inFlight, 0);
  registry.rollback(id);
  const oldAgain = await send();
  assert.equal(oldAgain.body.version, 'v1');

  const healthHold = deferred();
  const pendingReload = registry.safeReload(id, candidate('v3', null, () => healthHold.promise));
  assert.equal(registry.getModule(id).operationBusy, true);
  assert.throws(() => registry.rollback(id), /not ready for rollback/);
  assert.throws(() => registry.start(id), /operation in progress/);
  await assert.rejects(registry.stop(id), /operation in progress/);
  assert.throws(() => registry.stageCandidate(id, candidate('v4')), /not ready for staging/);
  await assert.rejects(registry.safeReload(id, candidate('v5')), /not ready for reload/);
  healthHold.resolve(false);
  await assert.rejects(pendingReload, /not healthy/);
  assert.equal(registry.getModule(id).operationBusy, false);
  assert.equal(registry.getModule(id).version, 1);
  assert.equal((await send()).body.version, 'v1');

  const blocked = deferred();
  const timed = registry.safeReload(id, candidate('timeout', null, () => blocked.promise), { timeoutMs: 10 });
  await assert.rejects(timed, /timeout/);
  assert.equal(registry.getModule(id).operationBusy, false);
  assert.equal((await send()).body.version, 'v1');
  blocked.resolve(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await send()).body.version, 'v1', 'Late health resolution must not swap router');

  registry.register({ id: 'protected-phase43', prefix: '/api/ProtectedPhase43', required: true, router: candidate('protected') });
  await assert.rejects(registry.safeReload('protected-phase43', candidate('changed')), /Protected/);
  assert.throws(() => registry.rollback('protected-phase43'), /Protected/);
  assert.throws(() => registry.stageCandidate('protected-phase43', candidate('changed')), /Protected/);
  console.log('PASS: in-flight old/new isolation, rollback, concurrent operation locks, health failure/timeout, protected module');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
