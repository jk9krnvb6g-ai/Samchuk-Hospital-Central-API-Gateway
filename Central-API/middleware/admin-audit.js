'use strict';
const fs = require('node:fs');
const path = require('node:path');

function auditAdminAction(event) {
  const dir = process.env.GATEWAY_ADMIN_AUDIT_DIR;
  if (!dir || !path.isAbsolute(dir)) throw new Error('ADMIN_AUDIT_DIR_REQUIRED');
  const safe = {
    timestamp: new Date().toISOString(),
    action: event.action,
    moduleId: event.moduleId,
    outcome: event.outcome,
    requestId: event.requestId || null
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'gateway-admin-audit.log'), JSON.stringify(safe) + '\n', { encoding: 'utf8', flag: 'a' });
}
module.exports = { auditAdminAction };
