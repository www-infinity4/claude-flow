import{strict as assert}from"node:assert";import{normalizeEstateCandidate,planEstateJobs,enqueueEstateJobs}from"./phi-estate-job-generator.js";
const base={job_key:"repo:a",requirement_source:"README.md",requirement_text:"Fix player",repository_full_name:"www-infinity4/A",classification:"active-site",specialist_roles:["repo-reader","frontend-writer"],acceptance_checks:["player advances"],risk:"low-reversible",evidence_required:["runtime"],priority:"production/runtime broken now"};
assert.equal(normalizeEstateCandidate(base).job.routing.priority,"production-broken");
const dangerous=normalizeEstateCandidate({...base,job_key:"repo:b",requested_capabilities:["money.spend"]});assert.equal(dangerous.job.controls.blockedUntilAuthorized,true);
const plan=planEstateJobs({candidates:[base,base,{...base,job_key:"repo:c"}],existingJobs:[{job_key:"repo:c"}],maxCreate:5});assert.equal(plan.create.length,1);assert.equal(plan.duplicates.length,2);
const created=[];const out=await enqueueEstateJobs({monitor:{createFlowJob:async j=>(created.push(j),{id:"m-"+created.length})},candidates:[base],maxCreate:1});assert.equal(out.created.length,1);assert.equal(created[0].job_key,"repo:a");
