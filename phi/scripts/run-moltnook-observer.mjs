// Read-only Phi agent execution stage: actual GitHub GETs + verified source snapshots.
// This stage runs INSIDE the owner's claude-flow fork in GitHub Actions.
// It is not a Claude model call or a repository-writing agent.
import fs from 'node:fs/promises';
import path from 'node:path';
import {allowed,resolveTargets,selectFiles,stableJobKey,sourceEvent,summarizeObservations} from '../moltnook-observer-lib.mjs';

const owner='www-infinity4';
const runId=process.env.GITHUB_RUN_ID||'local';
const runUrl=/^\d+$/.test(runId)?'https://github.com/www-infinity4/claude-flow/actions/runs/'+runId:
  'https://github.com/www-infinity4/claude-flow/actions';
const token=process.env.GITHUB_TOKEN||'';
const headers={'Accept':'application/vnd.github+json','User-Agent':'phi-moltnook-observer/1.0'};
// Declared authorization is optional for PUBLIC read-only resources, never used in a URL.
if(token)headers.Authorization='Bearer '+token;
const limits={requests:0,maxRequests:36};
async function readAPI(endpoint) {
 if(limits.requests>=limits.maxRequests)throw Error('Read-only tool quota reached');
 if(!/^\/repos\/www-infinity4\/[A-Za-z0-9_.-]+\/(?:contents\/[A-Za-z0-9_./?=&-]+|commits\/[A-Za-z0-9_.-]+|issues\/[0-9]+)$/.test(endpoint)) {
   throw Error('Requested path outside the approved GitHub reader');
 }
 limits.requests++;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),14000);
 try{
   const response=await fetch('https://api.github.com'+endpoint,{method:'GET',headers,signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status+' for '+endpoint);
   return await response.json();
 }finally{clearTimeout(timeout);}
}
const now=()=>new Date().toISOString();
const roles=JSON.parse(await fs.readFile('phi/role-capabilities.json','utf8'));
const queue=JSON.parse(await fs.readFile('phi/state/moltnook-intake.json','utf8'));
const sessions=[];
const messages=[];
function say(agent,to,project,url,message,phase='Executed read-only') {
 messages.push(sourceEvent(agent,to,project,now(),url,message,phase));
}
if(!allowed('repo-reader','repo.files.read',roles)||!allowed('repo-reader','repo.metadata.read',roles)||
   !allowed('independent-verifier','repo.files.read',roles))throw Error('Required capabilities absent');
const candidates=Array.isArray(queue.jobs)?queue.jobs.filter(j=>j.status==='queued'&&j.issue_host===owner+'/Oracle-Octaves').slice(0,2):[];
for(const job of candidates) {
 const report={job_key:job.job_key,issue_url:job.source_url,run_id:runId,run_url:runUrl,
  executor:'phi-readonly-github-observer-v1', model_execution:false,started_at:now(),
  status:'investigating',source_verification:'not_checked',records:[],verifier:null,
  next_action:'A scoped model/task executor can implement changes only after repo ownership and authorization are resolved.'};
 try {
   const issue=await readAPI('/repos/'+owner+'/Oracle-Octaves/issues/'+job.issue_number);
   if(stableJobKey(issue)!==job.job_key||issue.html_url!==job.source_url) throw Error('Issue identity mismatch');
   say('bluth','greenbeans','Oracle-Octaves',issue.html_url,'I checked the actual issue and assigned a source-only investigation; no write or deploy tools have been granted.');
   const targets=resolveTargets((issue.title||'')+'\n'+(issue.body||''));
   if(!targets.length)throw Error('No public first-party repository found in issue; scope remains unresolved.');
   // Controlled reader: no prompts become paths, URLs, shell commands or credentials.
   for(const repo of targets) {
     const name=repo.split('/')[1];
     const details=await readAPI('/repos/'+repo+'/commits/main');
     if(!/^[a-f0-9]{40}$/.test(details.sha))throw Error('Invalid repository revision');
     const ref=details.sha;
     const observations=[];
     for(const file of selectFiles(repo).slice(0,4)) {
       try{
         const info=await readAPI('/repos/'+repo+'/contents/'+file+'?ref='+ref);
         observations.push({path:file,sha:info.sha,ok:typeof info.sha==='string',url:info.html_url||'https://github.com/'+repo+'/blob/'+ref+'/'+file});
       } catch(error) {
         observations.push({path:file,ok:false,reason:String(error.message).slice(0,125)});
       }
     }
     report.records.push({repo,revision:ref,observations});
     say('greenbeans','pink-panther',name,
       'https://github.com/'+repo+'/commit/'+ref,
       summarizeObservations(repo,'main',ref,observations));
   }
   const first=report.records.find(r=>r.observations.some(o=>o.ok));
   if(!first) throw Error('No source files could be read. No verification is possible.');
   const file=first.observations.find(o=>o.ok);
   const checked=await readAPI('/repos/'+first.repo+'/contents/'+file.path+'?ref='+first.revision);
   const same=checked.sha===file.sha;
   report.verifier={role:'independent-verifier',persona:'pink-panther',rechecked:first.repo+'/'+file.path,
     expected_sha:file.sha,observed_sha:checked.sha,matched:same,checked_at:now()};
   if(!same) throw Error('Independent file hash mismatch');
   say('pink-panther','bluth',first.repo.split('/')[1],checked.html_url||file.url,
     'I independently fetched '+file.path+' at the pinned commit and confirmed the source SHA. This verifies a file read, not a build, payout, browser test or deployment.',
     'Source verified');
   const problems=report.records.flatMap(r=>r.observations.filter(o=>!o.ok));
   report.source_verification=problems.length?'needs_work':'source_verified';
   report.status=problems.length?'partial_source_check':'read_only_checked';
   say('purple-pearl','greenbeans','Moltnook',runUrl,
     'Research tools ran on '+report.records.length+' repositories; '+(problems.length?'some files could not be verified':'the selected source files were checked')+'. Next, a separately authorized Claude-Flow AI executor can propose code edits and send them for independent verification.',
     'Read-only summary');
 } catch(error) {
   report.status='blocked';report.error=String(error?.message||error).slice(0,250);
   say('orange-peel','bluth','Moltnook',job.source_url,'The source investigation stopped: '+report.error+' No changes were made.','Blocked');
 }
 report.finished_at=now();
 sessions.push(report);
}
const conversation={schema:'moltnook-observer-conversation/v1',generated_at:now(),source_repo:owner+'/claude-flow',
 run_url:runUrl,execution_mode:'real read-only GitHub tools; not a Claude LLM runtime',messages:messages.slice(-50)};
const results={schema:'phi-moltnook-observer-runs/v1',generated_at:now(),run_url:runUrl,
 source:'GitHub API verified GET requests',github_requests:limits.requests,jobs:sessions};
for(const [target,record] of [['phi/state/moltnook-conversation.json',conversation],['phi/state/moltnook-runs.json',results]]) {
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.writeFile(target,JSON.stringify(record,null,2)+'\n','utf8');
}
console.log('Real read-only tools: '+limits.requests+' GitHub requests, '+sessions.length+
  ' jobs, '+messages.length+' verifiable role messages. No Claude model or mutation tool was invoked.');
if(sessions.some(s=>s.status==='blocked'))console.warn('Some jobs are blocked; see explicit per-job reason.');
