'use strict';
// Isolated real Procurement router mounted through the real ModuleRegistry.
// Does not open sockets or use the production database.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const target = process.argv[2];
if (!target || !fs.existsSync(target)) {
  console.error('Usage: node tests/phase44-procurement-gateway-integration.test.js <router-file>');
  process.exit(2);
}
const worker = String.raw`
'use strict';
const assert = require('node:assert/strict');
const Module = require('node:module');
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
let pools = 0, connections = 0, listeners = 0;
net.Server.prototype.listen = function () { listeners++; throw Error('LISTENER_BLOCKED'); };
http.createServer = () => { throw Error('HTTP_SERVER_BLOCKED'); };
https.createServer = () => { throw Error('HTTPS_SERVER_BLOCKED'); };
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'mysql2' || request === 'mysql2/promise') return {
    createPool() {
      pools++;
      return { getConnection() { connections++; throw Error('DATABASE_BLOCKED'); }, end() {} };
    }
  };
  return originalLoad.apply(this, arguments);
};
const target = process.argv[1];
const root = process.argv[2];
const express = require(require.resolve('express', { paths: [root] }));
const { ModuleRegistry } = require(root + '/modules/registry');
const { sendInProcessRequest } = require(root + '/tests/in-process-tester');
const router = require(target);
const registry = new ModuleRegistry();
registry.register({
  id: 'procurement', prefix: '/api/Procurement',
  required: true, enabled: true, router
});
registry.isInitialized = true;
const app = express();
registry.mountAll(app);
app.use((_req, res) => res.status(404).json({ code: 'UNMATCHED_PATH' }));
async function run() {
  const cases = [
    ['GET', '/api/Procurement/data', 401],
    ['GET', '/api/Procurement/users', 401],
    ['POST', '/api/Procurement/procurements', 401],
    ['GET', '/api/ProcurementExtra/data', 404],
    ['GET', '/api/procurement/data', 404]
  ];
  for (const [method, url, expected] of cases) {
    const response = await sendInProcessRequest(app, { method, url });
    assert.equal(response.status, expected, url);
    console.log('PASS: ' + method + ' ' + url + ' -> ' + expected);
  }
  assert.equal(registry.modules.get('procurement').status, 'ACTIVE');
  assert.equal(pools, 1);
  assert.equal(connections, 0);
  assert.equal(listeners, 0);
  console.log('PASS: real router mounted, no guarded DB connections or TCP listeners');
  console.log('PROCUREMENT GATEWAY REAL-ROUTER INTEGRATION: PASS');
}
run().catch(error => { console.error('FAIL: ' + error.message); process.exitCode = 1; });
`;
const env = {
  PATH: process.env.PATH || '',
  SystemRoot: process.env.SystemRoot || '',
  WINDIR: process.env.WINDIR || '',
  TEMP: process.env.TEMP || '',
  TMP: process.env.TMP || '',
  NODE_ENV: 'test',
  PROCUREMENT_DB_HOST: '127.0.0.1',
  PROCUREMENT_DB_PORT: '3306',
  PROCUREMENT_DB_USER: 'isolated_test',
  PROCUREMENT_DB_PASSWORD: 'isolated_test',
  PROCUREMENT_DB_NAME: 'procurement_db',
  PROCUREMENT_DB_CONNECTION_LIMIT: '1',
  PROCUREMENT_TEST_JWT_SECRET: 'isolated-test-only-secret-2026-samchuk-123456',
  PROCUREMENT_TEST_TOKEN_EXPIRY_HOURS: '1'
};
const root = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, ['-e', worker, path.resolve(target), root], {
  cwd: path.dirname(path.resolve(target)), env, encoding: 'utf8',
  timeout: 10000, windowsHide: true, maxBuffer: 128 * 1024
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.status !== 0) {
  console.error('PROCUREMENT GATEWAY REAL-ROUTER INTEGRATION: FAIL (exit=' + result.status + ', signal=' + (result.signal || 'none') + ')');
  // Do not print stderr from imported source to avoid exposing configuration.
  process.exitCode = 1;
}
