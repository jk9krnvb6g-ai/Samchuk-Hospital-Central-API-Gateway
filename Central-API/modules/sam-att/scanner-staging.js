'use strict';
// Internal integration helper only. No registration, HTTP endpoints or activation on import.
const crypto = require('node:crypto');
const SLOT = 'sam-att-scanner-staging';
const PREFIX = '/api/Sam_Att_Scanner_Staging';
function createScannerStagingLifecycle({registry,loadCandidate,verifyApproval,audit,now=Date.now}={}) {
 if(!registry||typeof loadCandidate!=='function'||typeof verifyApproval!=='function'||typeof audit!=='function')throw Error('EXPLICIT_DEPENDENCIES_REQUIRED');
 let pending=null,staged=null,busy=false,rollbackTarget=null;
 function record(){const r=registry.getModule(SLOT);if(!r||r.prefix!==PREFIX||r.required||r.status!=='ACTIVE')throw Error('APPROVED_STAGING_SLOT_REQUIRED');return r;}
 function plan(action,manifestSha256,commit){const r=record();if(!/^[a-f0-9]{64}$/.test(manifestSha256||'')||!/^[a-f0-9]{40}$/.test(commit||''))throw Error('RELEASE_IDENTITY_REQUIRED');
  const value={action,slot:SLOT,prefix:PREFIX,manifestSha256,commit,version:r.version,loadedAt:r.loadedAt,nonce:crypto.randomUUID(),expiresAt:now()+300000};
  const planHash=crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');pending=Object.freeze({...value,planHash});return pending;
 }
 async function approved(action,approval){const r=record();if(!pending||pending.action!==action||pending.expiresAt<=now()||r.version!==pending.version||r.loadedAt!==pending.loadedAt)throw Error('STALE_APPROVAL_PLAN');
  if(!approval||approval.action!==action||approval.planHash!==pending.planHash||approval.role!=='ADMIN'||!approval.actor||!Number.isFinite(approval.expiresAt)||approval.expiresAt<=now()||approval.expiresAt>pending.expiresAt||await verifyApproval(approval,pending)!==true)throw Error('EXPLICIT_APPROVAL_REQUIRED');
  await audit({action,slot:SLOT,planHash:pending.planHash,actor:approval.actor,outcome:'APPROVED'});if(record()!==r||r.version!==pending.version||r.loadedAt!==pending.loadedAt)throw Error('STALE_APPROVAL_PLAN');return r;
 }
 async function exclusive(fn){if(busy)throw Error('STAGING_OPERATION_BUSY');busy=true;try{return await fn();}finally{busy=false;}}
 async function complete(action,approval,result){let auditRecorded=true;try{await audit({action,slot:SLOT,actor:approval.actor,outcome:'COMPLETED'});}catch{auditRecorded=false;}return {result,auditRecorded};}
 return Object.freeze({
  planStage(identity){if(busy)throw Error('STAGING_OPERATION_BUSY');if(staged||registry.stagedCandidates.has(SLOT))throw Error('STAGED_CANDIDATE_EXISTS');return plan('stage',identity.manifestSha256,identity.commit);},
  stage({approval,loadOptions}){return exclusive(async()=>{await approved('stage',approval);
   const identity=pending; if(loadOptions.approvedManifestSha256!==identity.manifestSha256||loadOptions.expectedCommit!==identity.commit)throw Error('RELEASE_PLAN_MISMATCH');
   const candidate=await loadCandidate(loadOptions);if(candidate.id!==SLOT||candidate.prefix!==PREFIX||typeof candidate.getHealth!=='function'||candidate.releaseIdentity?.manifestSha256!==identity.manifestSha256||candidate.releaseIdentity?.commit!==identity.commit)throw Error('INVALID_STAGING_CANDIDATE');
   if(record().version!==identity.version||record().loadedAt!==identity.loadedAt)throw Error('STALE_APPROVAL_PLAN');if(registry.stagedCandidates.has(SLOT))throw Error('STAGED_CANDIDATE_EXISTS');registry.stageCandidate(SLOT,candidate);staged={candidate,identity};pending=null;return complete('stage',approval,{staged:true,activated:false});
  });},
  planActivation(){if(busy||!staged)throw Error('STAGED_CANDIDATE_REQUIRED');return plan('activate',staged.identity.manifestSha256,staged.identity.commit);},
  activate({approval}){return exclusive(async()=>{const current=await approved('activate',approval);if(!/^[a-f0-9]{64}$/.test(current.router.scannerReleaseIdentity?.manifestSha256||'')||!/^[a-f0-9]{40}$/.test(current.router.scannerReleaseIdentity?.commit||''))throw Error('ROLLBACK_IDENTITY_REQUIRED');if(!staged||registry.stagedCandidates.get(SLOT)!==staged.candidate)throw Error('STAGED_CANDIDATE_CHANGED');
   const result=await registry.activateStaged(SLOT);staged=null;pending=null;return complete('activate',approval,result);
  });},
  planRollback(){if(busy||!record().previousVersion)throw Error('ROLLBACK_UNAVAILABLE');rollbackTarget=record().previousVersion;const identity=rollbackTarget.router.scannerReleaseIdentity;if(!identity)throw Error('ROLLBACK_IDENTITY_REQUIRED');return plan('rollback',identity.manifestSha256,identity.commit);},
  rollback({approval}){return exclusive(async()=>{const r=await approved('rollback',approval);if(!r.previousVersion||r.previousVersion!==rollbackTarget)throw Error('ROLLBACK_TARGET_CHANGED');const result=registry.rollback(SLOT);pending=null;return complete('rollback',approval,result);});}
 });
}
module.exports={createScannerStagingLifecycle,SLOT,PREFIX};
