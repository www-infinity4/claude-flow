const PRIORITY_MAP={
 "production/runtime broken now":"production-broken","data loss or persistence failure":"data-loss",
 "shared service regression affecting multiple Phi surfaces":"shared-runtime",
 "explicit master-red requirement with known owner":"master-red","unfinished active product":"unfinished-product",
 "style modernization":"style-modernization","research/experimental cleanup":"research-cleanup"
};
const CONSEQUENTIAL=new Set(["external.publish","wallet.transfer.real","money.spend","customer_private_data.export","repo.delete","data.destructive","auth.policy.write","secrets.write"]);
const text=v=>String(v??"").trim();

export function candidateKey(c){
 return text(c.job_key)||[text(c.repository_full_name),text(c.requirement_source),text(c.requirement_text)].join("|");
}
export function normalizeEstateCandidate(c){
 const required=["requirement_source","requirement_text","repository_full_name","classification","specialist_roles","acceptance_checks","risk","evidence_required"];
 const missing=required.filter(k=>c?.[k]===undefined||c?.[k]===null||c?.[k]==="");
 if(missing.length)return{accepted:false,reason:"missing-required-fields",missing};
 const capabilities=new Set(c.requested_capabilities||[]);
 const consequential=c.risk==="consequential"||[...capabilities].some(x=>CONSEQUENTIAL.has(x));
 const authorizationRequired=Boolean(c.authorization_required||consequential);
 const priority=PRIORITY_MAP[c.priority]||c.priority||"unfinished-product";
 return{accepted:true,job:{
   job_key:candidateKey(c),requirement_source:c.requirement_source,requirement_text:c.requirement_text,
   target:{repository:c.repository_full_name,runtime:c.runtime_target||null},classification:c.classification,
   routing:{priority,specialistRoles:[...new Set(c.specialist_roles||[])]},
   verification:{acceptanceChecks:c.acceptance_checks||[],evidenceRequired:c.evidence_required||[]},
   regression_group:c.regression_group||null,risk:c.risk,
   controls:{blockedUntilAuthorized:authorizationRequired,authorizationRequired},
   requested_capabilities:[...capabilities],scanner_evidence:c.scanner_evidence||null
 }};
}

export function planEstateJobs({candidates=[],existingJobs=[],maxCreate=25}={}){
 const existing=new Set(existingJobs.map(x=>text(x.job_key||x.payload?.job_key||x.idempotency_key)).filter(Boolean));
 const seen=new Set(),create=[],rejected=[],duplicates=[];
 for(const c of candidates){
   const normalized=normalizeEstateCandidate(c);
   if(!normalized.accepted){rejected.push({candidate:c,...normalized});continue;}
   const key=normalized.job.job_key;
   if(existing.has(key)||seen.has(key)){duplicates.push(key);continue;}
   seen.add(key);
   if(create.length<maxCreate)create.push(normalized.job);
 }
 return{create,rejected,duplicates,truncated:Math.max(0,seen.size-create.length),maxCreate};
}

export async function enqueueEstateJobs({monitor,candidates,existingJobs=[],maxCreate=25}){
 if(!monitor?.createFlowJob)throw new TypeError("Monitor createFlowJob capability is required");
 const plan=planEstateJobs({candidates,existingJobs,maxCreate}),created=[];
 for(const job of plan.create){
   const result=await monitor.createFlowJob(job);
   created.push({job_key:job.job_key,result,blocked:job.controls.blockedUntilAuthorized});
 }
 return{...plan,created};
}
