'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = name => JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',name),'utf8'));
const cli = load('scanner-cli-output.sample.json');
const api = load('scanner-sync-api.sample.json');
const raw = load('scanner-raw-scans.sample.json');
const timestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
for (const report of [cli,api]) {
  assert.equal(report.success,true);
  assert.equal(report.totalRead,report.totalNew+report.duplicates);
  assert.equal(report.totalRead,report.machines.reduce((n,m)=>n+m.readCount,0));
  assert.equal(report.totalNew,report.machines.reduce((n,m)=>n+m.newCount,0));
  assert.equal(report.duplicates,report.machines.reduce((n,m)=>n+m.duplicates,0));
  for(const m of report.machines) assert.equal(m.readCount,m.newCount+m.duplicates);
}
assert.equal(cli.port,5005);
assert.equal(cli.scans.length,2);
for (const scan of cli.scans) {
  assert.match(scan.scanDateTime,timestamp);
  assert.equal(scan.enrollNumber,1042);
}
assert.equal(api.exitCode,0);
assert.equal(api.autoCalculated,true);
assert.equal(api.calculationStatus,'SUCCESS');
assert.deepEqual(api.calculatedDates,api.affectedDates);
assert.deepEqual(api.failedDates,[]);
assert.equal(raw.total,raw.data.length);
for(let i=0;i<raw.data.length;i++){
  const record=raw.data[i];
  assert.match(record.scanDateTime,timestamp);
  assert.equal(record.scanDateTime,cli.scans[i].scanDateTime);
  assert.equal(record.fingleId,cli.scans[i].enrollNumber);
  assert.equal(record.machineNo,cli.scans[i].machineNo);
  assert.equal(record.verifyMode,cli.scans[i].verifyMode);
  assert.equal(record.inOutMode,cli.scans[i].inOutMode);
  assert.equal(record.hrMapped,true);
  assert.equal(record.pushStatus,'PENDING');
  assert.equal(record.pushedAt,null);
}
console.log('PASS: three supplied scanner JSON pipeline fixtures (offline)');
