'use strict';
const HEALTH = require('./health-status');

function normalizeHealth(value) {
  if (value === true) return HEALTH.HEALTHY;
  if (value === false) return HEALTH.UNHEALTHY;
  const status = value && typeof value === 'object'
    ? String(value.status || value.state || '').toUpperCase() : '';
  if (['UP', 'OK', 'HEALTHY', 'READY'].includes(status)) return HEALTH.HEALTHY;
  if (['DOWN', 'ERROR', 'UNHEALTHY', 'DEGRADED'].includes(status)) return HEALTH.UNHEALTHY;
  return HEALTH.UNKNOWN;
}

async function inspectModule(record, { timeoutMs = 1500 } = {}) {
  const checkedAt = new Date().toISOString();
  if (record.status !== 'ACTIVE') return { health: HEALTH.UNAVAILABLE, checkedAt, reason: record.status };
  if (typeof record.healthCheck !== 'function') return { health: HEALTH.UNKNOWN, checkedAt, reason: 'NOT_IMPLEMENTED' };
  const started = process.hrtime.bigint();
  let timer;
  try {
    const value = await Promise.race([
      Promise.resolve().then(() => record.healthCheck()),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs); })
    ]);
    return { health: normalizeHealth(value), checkedAt, durationMs: Number(process.hrtime.bigint() - started) / 1e6 };
  } catch (error) {
    return { health: HEALTH.UNHEALTHY, checkedAt, reason: error.message === 'TIMEOUT' ? 'TIMEOUT' : 'CHECK_FAILED' };
  } finally {
    clearTimeout(timer);
  }
}

async function inspectRegistry(registry, options) {
  const entries = await Promise.all(registry.getAll().map(async record => [record.id, await inspectModule(record, options)]));
  return Object.fromEntries(entries);
}
module.exports = { inspectModule, inspectRegistry, normalizeHealth };
