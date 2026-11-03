'use strict';
const express = require('express');
const crypto = require('node:crypto');
const registry = require('../modules/registry');
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
module.exports = router;
