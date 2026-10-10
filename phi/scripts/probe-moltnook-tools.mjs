// Tool checks for the Phi agent room. Fixed, public HTTPS targets only.
import fs from 'node:fs/promises';
import path from 'node:path';
const runId=process.env.GITHUB_RUN_ID||'local';
const runUrl=/^\d+$/.test(runId)?'https://github.com/www-infinity4/claude-flow/actions/runs/'+runId:
  'https://github.com/www-infinity4/claude-flow/actions';
const run=JSON.parse(await fs.readFile('phi/state/moltnook-runs.json','utf8'));
const jobs=run.jobs||[];
const sourceVerified=jobs.some(j=>j.verifier?.matched===true);
const capabilities=[
 {id:'github.repo.read',name:'GitHub repository reader',category:'research',status:run.github_requests>0?'working':'not_tested',detail:(run.github_requests||0)+' source API requests in this run',evidence:runUrl},
 {id:'github.issue.read',name:'GitHub issue and job intake',category:'routing',status:jobs.length?'working':'no_jobs',detail:jobs.length+' queued job investigations processed',evidence:runUrl},
 {id:'source.verify',name:'Independent source verifier',category:'quality',status:sourceVerified?'working':'not_tested',detail:sourceVerified?'Pinned file SHA independently confirmed':'No independent SHA confirmation',evidence:runUrl},
 {id:'claude_flow.cli',name:'Claude-Flow CLI bootstrap',category:'orchestration',status:'binary_checked',detail:'Repository Claude-Flow --version step passed. This is not a model agent run.',evidence:runUrl},
 {id:'node.tests',name:'Node job and permission tests',category:'quality',status:'working',detail:'Capability and routing tests ran as prior required steps in this GitHub Actions job',evidence:runUrl},
 {id:'skill.proposals',name:'Task-specific skill proposals',category:'skills',status:'working',detail:'Existing Phi intake proposes required skills without activating untested tools',evidence:runUrl},
 {id:'github.repo.write',name:'Automatic repository code editing',category:'building',status:'not_enabled',detail:'Requires a scoped, authenticated writer and independent verifier; read-only runner cannot mutate code',evidence:runUrl},
 {id:'claude.model',name:'Claude model agent execution',category:'orchestration',status:'not_run',detail:'No Claude model invocation was executed or verified in the current run',evidence:runUrl},
 {id:'browser.inspect',name:'Mobile browser inspection',category:'testing',status:'not_connected',detail:'Requires a browser-capable runner and captured UI evidence, not a basic HTTP GET',evidence:runUrl},
 {id:'cloudflare.d1',name:'Cloudflare D1 / Worker private tools',category:'data',status:'not_connected',detail:'Requires Cloudflare-scoped credentials and explicit wallet/data permissions',evidence:runUrl},
 {id:'wallet.read',name:'Unified wallet and StarCoin checks',category:'data',status:'not_connected',detail:'Only authorized first-party wallet endpoints may supply real balances or credits',evidence:runUrl},
 {id:'image.generate',name:'Image build/fix generation',category:'media',status:'not_connected',detail:'Needs a configured image provider, scope, and receipt',evidence:runUrl}
];
const endpoints=[
 {name:'Moltnook page',url:'https://www-infinity4.github.io/Moltnook/',expect:'id="agent-floor"'},
 {name:'Oracle Octaves page',url:'https://quantaphi.org/oracle-octaves/',expect:'oracle-octaves'}
];
for(const check of endpoints) {
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),12000);
 const result={name:check.name,url:check.url,status:'not_checked'};
 try {
   const response=await fetch(check.url,{method:'GET',signal:ac.signal,redirect:'follow'});
   const body=(await response.text()).slice(0,100000);
   result.http_status=response.status;
   result.status=response.ok&&body.includes(check.expect)?'working':'needs_work';
   result.observation=response.ok&&body.includes(check.expect)?'Expected page marker was returned':'HTTP page or expected HTML marker did not match';
 }catch(error){result.status='needs_work';result.observation=String(error?.message||error).slice(0,160);}
 finally{clearTimeout(timer);}
 capabilities.push({id:'runtime.http.'+check.name.toLowerCase().replace(/[^a-z]+/g,'-'),
   name:check.name+' read-only HTTP check',category:'runtime',
   status:result.status,detail:result.observation+(result.http_status?' (HTTP '+result.http_status+')':''),
   evidence:check.url});
}
const obj={schema:'moltnook-tool-status/v1',checked_at:new Date().toISOString(),execution_source:'actual GitHub Actions and fixed HTTPS checks',run_url:runUrl,tools:capabilities};
const target=path.resolve('phi/state/moltnook-tool-status.json');
await fs.mkdir(path.dirname(target),{recursive:true});
await fs.writeFile(target,JSON.stringify(obj,null,2)+'\n');
console.log('Tool inventory: '+capabilities.filter(t=>t.status==='working').length+' working; '+capabilities.filter(t=>t.status!=='working').length+' limited/pending; no unverified mutation tools were enabled.');
