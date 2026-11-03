'use strict';
// Read-only Procurement router contract gate. Never import the target module.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function verify(file) {
  const absolute = path.resolve(file);
  assert(fs.statSync(absolute).isFile(), 'Router path must be a file');
  const source = fs.readFileSync(absolute, 'utf8');
  const tests = [
    ['exports-router', /module\.exports\s*=\s*router\s*;?/.test(source)],
    ['express-router', /express\.Router\s*\(/.test(source)],
    ['no-listener', !/\.listen\s*\(|\bcreateServer\s*\(/.test(source)],
    ['mock-query-hooks', /__setMockQuery/.test(source) && /__resetMockQuery/.test(source)],
    ['auth-middleware', /authenticateToken/.test(source) && /requireAdmin/.test(source)],
    ['procurement-routes', /router\.get\s*\(\s*['"]\/data['"]/.test(source) && /router\.post\s*\(\s*['"]\/login['"]/.test(source)],
    ['pool-lifecycle-review', !/\b(?:db|pool)\.end\s*\(/.test(source)]
  ];
  let failures = 0;
  for (const [name, ok] of tests) {
    console.log((ok ? 'PASS' : 'FAIL') + ': ' + name);
    if (!ok) failures++;
  }
  console.log('REVIEW REQUIRED: MySQL pool is initialized at import; mock hooks do not prevent pool construction.');
  console.log('REVIEW REQUIRED: A static source scan cannot prove no indirect listener or database connection.');
  console.log('REVIEW REQUIRED: No pool.end() found is an advisory observation, not a release-pass condition.');
  if (failures) process.exitCode = 1;
  else console.log('PROCUREMENT STATIC CONTRACT: ' + tests.length + '/' + tests.length);
}
if (require.main === module) {
  if (process.argv.length !== 3) {
    console.error('Usage: node tests/phase44-procurement-contract.test.js <procurement.js>');
    process.exitCode = 2;
  } else {
    try { verify(process.argv[2]); } catch (e) { console.error('FAIL: ' + e.message); process.exitCode = 1; }
  }
}
module.exports = { verify };
