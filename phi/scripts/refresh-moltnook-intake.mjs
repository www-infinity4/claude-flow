import fs from 'node:fs/promises';
import path from 'node:path';
import {convertIssue} from '../moltnook-intake-lib.mjs';
const config=JSON.parse(await fs.readFile('phi/moltnook-agent-bridge.json','utf8'));
const url='https://api.github.com/repos/www-infinity4/Oracle-Octaves/issues?state=all&sort=updated&per_page=100';
const ctrl=new AbortController();
const timer=setTimeout(()=>ctrl.abort(),15000);
let res;
try {res=await fetch(url,{headers:{'Accept':'application/vnd.github+json','User-Agent':'phi-moltnook-bridge/1.0'},signal:ctrl.signal});}
finally {clearTimeout(timer);}
if (!res.ok) throw new Error('Moltnook issue intake failed: HTTP '+res.status);
const raw=await res.json();
if (!Array.isArray(raw)) throw new Error('Issue response not an array');
const jobs=raw.map(issue=>convertIssue(issue,config)).filter(Boolean).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
const queue={
 schema:'phi-moltnook-intake/v1',
 refreshed_at:new Date().toISOString(),
 source_url:'https://github.com/www-infinity4/Oracle-Octaves/issues',
 source_scope:'public Oracle-Octaves agent issues, first 100 by updated time (Moltnook Issues disabled)',
 coverage_complete:raw.length<100,
 purpose:'Verified job candidates, NOT launched agents or executed changes.',
 claude_flow_runner_status:'not_connected',
 count:jobs.length,
 jobs
};
const target=path.resolve('phi/state/moltnook-intake.json');
await fs.mkdir(path.dirname(target),{recursive:true});
await fs.writeFile(target,JSON.stringify(queue,null,2)+'\n','utf8');
console.log('Indexed '+jobs.length+' Oracle-hosted Moltnook agent jobs. Claude-Flow execution not started.');
