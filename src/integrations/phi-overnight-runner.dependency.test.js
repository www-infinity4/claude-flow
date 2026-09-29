import{strict as assert}from"node:assert";import{runOvernightQueue}from"./phi-overnight-runner.js";
const events=[],executed=[];
const monitor={
 listFlowJobs:async()=>({jobs:[
  {id:"browser",payload:{priority:"production-broken"}},
  {id:"runnable",payload:{priority:"shared-runtime"}}
 ]}),
 addFlowEvent:async(id,kind,data)=>events.push({id,kind,data}),
 claimFlowJob:async()=>{},verifyFlowJob:async()=>{},completeFlowJob:async()=>{}
};
const roster={roles:[{id:"repo-reader",kind:"sensor"}]};
const executeRole=async({job})=>(executed.push(job.id),{ok:true});
const summary=await runOvernightQueue({monitor,roster,executeRole,batchSize:1,startupGate:job=>job.id==="browser"?{runnable:false,reason:"browser-session-unavailable",evidence:{required:"browser"}}:{runnable:true},runtimeHealth:{browser:{configured:false}}});
assert.deepEqual(summary.deferred,["browser"]);
assert.deepEqual(summary.needs_work,["browser"]);
assert.deepEqual(summary.verified,["runnable"]);
assert.equal(events.some(x=>x.id==="browser"&&x.kind==="dependency_deferred"),true);
assert.equal(executed.includes("browser"),false);
