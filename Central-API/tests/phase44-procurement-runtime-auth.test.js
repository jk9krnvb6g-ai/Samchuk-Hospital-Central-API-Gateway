'use strict';
// Real Procurement middleware, isolated process. No DB connections or TCP listeners.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const target = process.argv[2];
if (!target || !fs.existsSync(target)) { console.error('Usage: node tests/phase44-procurement-runtime-auth.test.js <router-file>'); process.exit(2); }
const worker = String.raw`
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const target = process.argv[1];
let pools = 0, connections = 0, listeners = 0;
net.Server.prototype.listen = function() { listeners++; throw Error('TCP_LISTENER_BLOCKED'); };
http.createServer = function() { throw Error('HTTP_SERVER_BLOCKED'); };
https.createServer = function() { throw Error('HTTPS_SERVER_BLOCKED'); };
const load = Module._load;
Module._load = function(name, parent, isMain) {
  if (name === 'mysql2' || name === 'mysql2/promise') return { createPool() {
    pools++;
    return { getConnection() { connections++; throw Error('DB_BLOCKED'); }, end() {} };
  } };
  return load.apply(this, arguments);
};
const router = require(target);
assert.equal(typeof router, 'function');
const sign = payload => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.PROCUREMENT_TEST_JWT_SECRET)
    .update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + signature;
};
const user = { id: 'test-user', role: 'USER', exp: Date.now() + 60000 };
const expired = sign({ ...user, exp: Date.now() - 60000 });
const regular = sign(user);
const cases = [
  { label: 'missing token /data', method: 'GET', url: '/data', status: 401 },
  { label: 'malformed token /data', method: 'GET', url: '/data', token: 'not-a-jwt', status: 401 },
  { label: 'missing token /users', method: 'GET', url: '/users', status: 401 },
  { label: 'missing token /procurements', method: 'POST', url: '/procurements', status: 401 },
  { label: 'missing token /category', method: 'POST', url: '/category', status: 401 },
  { label: 'expired signed token /data', method: 'GET', url: '/data', token: expired, status: 401 },
  { label: 'regular user denied /users', method: 'GET', url: '/users', token: regular, status: 403 },
  { label: 'regular user denied /category', method: 'POST', url: '/category', token: regular, status: 403 }
];
async function request(test) {
  const { EventEmitter } = require('node:events');
  const req = new EventEmitter();
  req.method = test.method;
  req.url = test.url;
  req.originalUrl = test.url;
  req.headers = test.token ? { authorization: 'Bearer ' + test.token } : {};
  req.connection = { remoteAddress: '127.0.0.1' };
  req.body = {};
  const res = new EventEmitter();
  res.statusCode = 200;
  res.setHeader = () => {};
  res.getHeader = () => undefined;
  res.removeHeader = () => {};
  res.status = code => { res.statusCode = code; return res; };
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('REQUEST_TIMEOUT')), 1000);
    const finish = data => { clearTimeout(timeout); resolve({ status: res.statusCode, body: data }); return res; };
    res.json = finish;
    res.send = finish;
    res.end = finish;
    try { router(req, res, err => { clearTimeout(timeout); reject(err || Error('UNMATCHED_ROUTE')); }); }
    catch (e) { clearTimeout(timeout); reject(e); }
  });
}
(async () => {
  for (const test of cases) {
    const result = await request(test);
    assert.equal(result.status, test.status, test.label);
    assert.equal(result.body.success, false, test.label);
    console.log('PASS: ' + test.label + ' -> ' + result.status);
  }
  assert.equal(pools, 1);
  assert.equal(connections, 0);
  assert.equal(listeners, 0);
  console.log('PASS: no database connections or TCP listeners requested through guarded APIs');
  console.log('PROCUREMENT RUNTIME AUTH: PASS');
})().catch(e => { console.error('FAIL: ' + e.message); process.exitCode = 1; });
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
const result = spawnSync(process.execPath, ['-e', worker, path.resolve(target)], {
  cwd: path.dirname(path.resolve(target)), env, encoding: 'utf8',
  timeout: 10000, windowsHide: true, maxBuffer: 128 * 1024
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.status !== 0) {
  console.error('PROCUREMENT RUNTIME AUTH: FAIL (exit=' + result.status + ', signal=' + (result.signal || 'none') + ')');
  // Worker stderr is omitted to avoid exposing values from target import errors.
  process.exitCode = 1;
}
