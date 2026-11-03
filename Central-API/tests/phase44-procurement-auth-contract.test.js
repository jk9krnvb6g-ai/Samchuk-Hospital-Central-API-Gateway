'use strict';
// Read-only static authorization contract. Does not import Procurement, open ports or access DB.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const file = process.argv[2];
if (!file) { console.error('Usage: node tests/phase44-procurement-auth-contract.test.js <router-path>'); process.exit(2); }
const source = fs.readFileSync(path.resolve(file), 'utf8');
const routes = [...source.matchAll(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,([^\n]*)/g)]
  .map(m => ({ method: m[1].toUpperCase(), path: m[2], args: m[3] }));
const key = r => r.method + ' ' + r.path;
const expectedPublic = new Set(['POST /login']);
const expectedAuthenticated = new Set(['GET /data','POST /procurements','PATCH /procurements/:id','POST /receivings/upsert','POST /considerations/upsert']);
const expectedAdmin = new Set(['DELETE /procurements/:id','GET /users','PATCH /users/:id','POST /workgroup','PATCH /workgroup/:id','POST /department','PATCH /department/:id','POST /category','PATCH /category/:id','DELETE /category/:id']);
try {
  assert.equal(routes.length, 16, 'Unexpected route count; review all routes');
  assert.equal(new Set(routes.map(key)).size, routes.length, 'Duplicate routes');
  for (const route of routes) {
    const id = key(route);
    const auth = /\bauthenticateToken\b/.test(route.args);
    const admin = /\brequireAdmin\b/.test(route.args);
    if (expectedPublic.has(id)) assert.ok(!auth && !admin, id + ' should be public');
    else if (expectedAuthenticated.has(id)) assert.ok(auth && !admin, id + ' requires authentication');
    else if (expectedAdmin.has(id)) assert.ok(auth && admin, id + ' requires admin');
    else assert.fail('Unexpected route: ' + id);
  }
  assert.match(source, /timingSafeEqual/, 'Missing constant-time signature comparison');
  assert.match(source, /decoded\.exp\s*<=\s*Date\.now\(\)/, 'Missing expiration check');
  console.log('PASS: 1 public login route');
  console.log('PASS: 5 authenticated routes');
  console.log('PASS: 10 admin-only routes');
  console.log('PASS: timing-safe signature and expiration checks found');
  console.log('NOTE: Static inspection does not validate runtime authentication or JWT interoperability');
  console.log('PROCUREMENT AUTH STATIC CONTRACT: PASS');
} catch (error) { console.error('FAIL: ' + error.message); process.exitCode = 1; }
