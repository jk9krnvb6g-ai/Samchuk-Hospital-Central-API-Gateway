'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createScannerStagingLifecycle,SLOT,PREFIX}=require('../modules/sam-att/scanner-staging');
// Execute the actual registry and validator with an empty config dependency.
// This avoids loading Gateway dotenv/config or creating an HTTP listener.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function registryClass(){
 const base=path.join(__dirname,'../modules');
 const adapterModule={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(base,'adapter-interface.js'),'utf8'),{module:adapterModule,require:name=>require(name),console});
 const registryModule={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(base,'registry.js'),'utf8'),{module:registryModule,setTimeout,clearTimeout,
  require(name){if(name==='express')return require('express');if(name==='../config/modules')return {registeredSubsystems:[]};if(name==='./adapter-interface')return adapterModule.exports;if(name.startsWith('./'))return require(path.join(base,name));return require(name);}
 });return registryModule.exports.ModuleRegistry;
}
function setup(){let time=1000;const old=()=>{};const prod=()=>{};const events=[];
 Object.defineProperty(old,'scannerReleaseIdentity',{value:{manifestSha256:'c'.repeat(64),commit:'d'.repeat(40)}});
 const Registry=registryClass(),registry=new Registry();
 registry.register({id:SLOT,prefix:PREFIX,router:{router:old,getHealth:()=>true}});
 registry.register({id:'sam-att',prefix:'/api/Sam_Att',router:prod});
 registry.register({id:'procurement',prefix:'/api/Procurement',required:true,router:()=>{}});
 registry.register({id:'cash-cheque',prefix:'/api/Cash_Cheque',router:()=>{}});
 const r=registry.getModule(SLOT);
 const candidate={releaseIdentity:{manifestSha256:'a'.repeat(64),commit:'b'.repeat(40)},id:SLOT,prefix:PREFIX,router:()=>{},getHealth:async()=>true};const identity={manifestSha256:'a'.repeat(64),commit:'b'.repeat(40)};
 const lifecycle=createScannerStagingLifecycle({registry,loadCandidate:async()=>candidate,verifyApproval:async approval=>approval.signature==='fixture-approved',audit:async e=>events.push(e),now:()=>time});
 const approve=plan=>({action:plan.action,planHash:plan.planHash,expiresAt:plan.expiresAt,role:'ADMIN',actor:'synthetic-admin',signature:'fixture-approved'});
 async function stage(){const plan=lifecycle.planStage(identity);return lifecycle.stage({approval:approve(plan),loadOptions:{approvedManifestSha256:identity.manifestSha256,expectedCommit:identity.commit}});}
 return {r,registry,lifecycle,candidate,identity,approve,stage,events,prod,old,expire(){time+=300001;}};
}
test('import/helper construction never registers or activates anything',()=>{const s=setup();assert.equal(s.r.router,s.old);assert.equal(s.registry.stagedCandidates.size,0);});
test('unregistered or production prefix cannot be targeted',()=>{const s=setup();s.r.prefix='/api/Sam_Att';assert.throws(()=>s.lifecycle.planStage(s.identity),/STAGING_SLOT/);});
test('stage, activation and rollback require separately signed matching approvals',async()=>{const s=setup();assert.equal((await s.stage()).result.activated,false);assert.equal(s.r.router,s.old);
 const plan=s.lifecycle.planActivation();await assert.rejects(s.lifecycle.activate({approval:null}),/APPROVAL/);await s.lifecycle.activate({approval:s.approve(plan)});assert.equal(s.r.router,s.candidate.router);
 const rollback=s.lifecycle.planRollback(s.identity);await s.lifecycle.rollback({approval:s.approve(rollback)});assert.equal(s.r.router,s.old);assert.equal(s.registry.getModule('sam-att').router,s.prod);assert.equal(s.events.length,6);
});
test('expired plans and invalid signatures fail before loader or swap',async()=>{const s=setup();const p=s.lifecycle.planStage(s.identity);s.expire();await assert.rejects(s.lifecycle.stage({approval:s.approve(p),loadOptions:{}}),/STALE/);assert.equal(s.registry.stagedCandidates.size,0);});
test('version drift invalidates approval',async()=>{const s=setup();await s.stage();const p=s.lifecycle.planActivation();s.r.version++;await assert.rejects(s.lifecycle.activate({approval:s.approve(p)}),/STALE/);assert.equal(s.r.router,s.old);});
test('substituting staged object or manifest fails closed',async()=>{const s=setup();await s.stage();const p=s.lifecycle.planActivation();s.registry.stagedCandidates.set(SLOT,{...s.candidate});await assert.rejects(s.lifecycle.activate({approval:s.approve(p)}),/CHANGED/);assert.equal(s.r.router,s.old);
 const q=setup(),plan=q.lifecycle.planStage(q.identity);await assert.rejects(q.lifecycle.stage({approval:q.approve(plan),loadOptions:{approvedManifestSha256:'c'.repeat(64),expectedCommit:q.identity.commit}}),/MISMATCH/);
});
test('failed candidate health preserves current router for rollback',async()=>{const s=setup();await s.stage();s.candidate.getHealth=()=>false;const p=s.lifecycle.planActivation();await assert.rejects(s.lifecycle.activate({approval:s.approve(p)}),/not healthy/);assert.equal(s.r.router,s.old);});
test('invalid signatures cannot authorize mutations',async()=>{const s=setup();const p=s.lifecycle.planStage(s.identity);const approval={...s.approve(p),signature:'invalid'};await assert.rejects(s.lifecycle.stage({approval,loadOptions:{}}),/EXPLICIT_APPROVAL/);assert.equal(s.registry.stagedCandidates.size,0);});
test('an existing staged candidate cannot be overwritten by another lifecycle helper',()=>{const s=setup();s.registry.stagedCandidates.set(SLOT,s.candidate);assert.throws(()=>s.lifecycle.planStage(s.identity),/STAGED_CANDIDATE_EXISTS/);});
test('activation refuses a current router without an identified rollback target',async()=>{const s=setup();await s.stage();s.r.router=()=>{};const p=s.lifecycle.planActivation();await assert.rejects(s.lifecycle.activate({approval:s.approve(p)}),/ROLLBACK_IDENTITY_REQUIRED/);});
test('rollback approval cannot apply to a substituted previous-version object',async()=>{const s=setup();await s.stage();let p=s.lifecycle.planActivation();await s.lifecycle.activate({approval:s.approve(p)});p=s.lifecycle.planRollback();s.r.previousVersion={...s.r.previousVersion};await assert.rejects(s.lifecycle.rollback({approval:s.approve(p)}),/ROLLBACK_TARGET_CHANGED/);});
test('real registry dispatches only the isolated prefix after approved activation',async()=>{
 const s=setup();s.candidate.router=(req,res)=>res.json({url:req.url});await s.stage();const plan=s.lifecycle.planActivation();await s.lifecycle.activate({approval:s.approve(plan)});
 let dispatch;s.registry.mountAll({use(fn){dispatch=fn;}});
 const {EventEmitter}=require('node:events');const res=new EventEmitter();let body;res.json=function(value){body=value;this.emit('finish');};
 dispatch({url:PREFIX+'/health',path:PREFIX+'/health',baseUrl:''},res,()=>{throw Error('Unexpected fallthrough');});
 assert.equal(body.url,'/health');assert.equal(s.r.inFlight,0);assert.equal(s.registry.getModule('sam-att').router,s.prod);
});
