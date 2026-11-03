'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/scanner-exe-summary.sample.json'), 'utf8'));
assert.equal(report.success, true);
assert.equal(report.totalRead, 9917);
assert.equal(report.totalNew, 746);
assert.equal(report.duplicates, 9171);
assert.equal(report.unmapped, 0);
assert.deepEqual(report.affectedDates, ['2026-10-31','2026-11-01','2026-11-02','2026-11-03']);
assert.equal(report.machines.length, 3);
assert.equal(report.machines.reduce((sum, item) => sum + item.read, 0), report.totalRead);
assert.equal(report.machines.reduce((sum, item) => sum + item.new, 0), report.totalNew);
assert.equal(report.machines.reduce((sum, item) => sum + item.duplicates, 0), report.duplicates);
assert.equal(report.totalNew + report.duplicates + report.unmapped, report.totalRead);
for (const machine of report.machines) {
  assert.equal(machine.read, machine.new + machine.duplicates);
  assert.equal(machine.status, 'OK');
  assert.ok(Number.isInteger(machine.machineNo) && machine.machineNo > 0);
}
console.log('PASS: provided scanner EXE summary fixture totals and field names');
