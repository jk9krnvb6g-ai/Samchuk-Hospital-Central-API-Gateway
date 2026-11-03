'use strict';
const express = require('express');
const crypto = require('node:crypto');
const registry = require('../modules/registry');
const { auditAdminAction } = require('../middleware/admin-audit');
const { inspectModule } = require('../modules/health-monitor');
const router = express.Router();

router.use((req, res, next) => {
  const expected = process.env.GATEWAY_ADMIN_TOKEN || '';
  const actual = (req.get('authorization') || '').replace(/^Bearer /, '');
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (process.env.GATEWAY_ADMIN_ENABLED !== 'true' ||
      expected.length < 32 || a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'ADMIN_ACCESS_DENIED' });
  }
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/modules', (req, res) => res.json({ modules: registry.getHealthSummary() }));
router.get('/modules/:id/health', async (req, res) => {
  const record = registry.getModule(req.params.id);
  if (!record) return res.status(404).json({ error: 'MODULE_NOT_FOUND' });
  return res.json({ id: record.id, ...(await inspectModule(record)) });
});

router.post('/modules/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  if (!['start', 'stop'].includes(action)) return res.status(404).json({ error: 'UNKNOWN_ACTION' });
  const record = registry.getModule(id);
  if (!record) return res.status(404).json({ error: 'MODULE_NOT_FOUND' });
  if (record.required || id === 'procurement') return res.status(403).json({ error: 'PROTECTED_MODULE' });
  if (process.env.GATEWAY_ADMIN_MUTATIONS_ENABLED !== 'true') {
    return res.status(403).json({ error: 'MUTATIONS_DISABLED' });
  }
  const event = { action, moduleId: id, requestId: req.id };
  try {
    auditAdminAction({ ...event, outcome: 'REQUESTED' });
  } catch (_) {
    return res.status(503).json({ error: 'AUDIT_UNAVAILABLE' });
  }
  let module;
  try {
    module = action === 'start' ? registry.start(id) : await registry.stop(id);
  } catch (_) {
    try { auditAdminAction({ ...event, outcome: 'FAILED' }); } catch (_) {}
    return res.status(409).json({ error: 'MODULE_OPERATION_FAILED' });
  }
  try {
    auditAdminAction({ ...event, outcome: 'COMPLETED' });
  } catch (_) {
    // Mutation already happened: never report an operation failure or retry it.
    return res.status(503).json({
      error: 'AUDIT_COMPLETION_FAILED',
      operationApplied: true,
      module
    });
  }
  return res.json({ module });
});

module.exports = router;
