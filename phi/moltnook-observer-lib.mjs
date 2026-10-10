// Moltnook bounded read-only execution helpers. No model-generated or fictitious tool calls.
export const REPOS = Object.freeze([
  'www-infinity4/claude-flow','www-infinity4/Moltnook',
  'www-infinity4/Oracle-Octaves','www-infinity4/QuantaPhi',
  'www-infinity4/Infinity-Phi','www-infinity4/Omni-Phi',
  'www-infinity4/Bitcoin-Crusher','www-infinity4/Mint-For-Infinity',
  'www-infinity4/News-Phi','www-infinity4/501'
]);
export const FILES = Object.freeze({
 'www-infinity4/claude-flow':['README.md','package.json','phi/role-capabilities.json','phi/moltnook-agent-bridge.json'],
 'www-infinity4/Moltnook':['README.md','AGENTS.md','agent-room.js','agents/roster.json'],
 'www-infinity4/Oracle-Octaves':['README.md','.github/workflows/oracle-agent-jobs.yml']
});
export function resolveTargets(body) {
 if (typeof body!=='string') return [];
 const text=body.toLowerCase();
 return REPOS.filter(r=>new RegExp('(^|[^a-z0-9-])'+r.toLowerCase().replace('/','\\/')+'([^a-z0-9-]|$)','i').test(text)).slice(0,3);
}
export function allowed(role,capability,roleMap) {
 const entry=roleMap?.rules?.[role];
 if (!entry || !Array.isArray(entry.allow)) return false;
 if (entry.deny?.includes(capability)) return false;
 return entry.allow.includes(capability);
}
export function stableJobKey(issue) {
 if(!Number.isSafeInteger(issue?.number)||issue.number<=0||!/^\\[Agent Job\\]/i.test(issue.title||''))return null;
 return 'moltnook:issue:'+issue.number;
}
export function selectFiles(repo) {return FILES[repo] || ['README.md'];}
export function sourceEvent(agent,to,project,when,url,message,phase='Executed read-only') {
 return {id:'observer:'+agent+':'+project+':'+when+':'+Math.random().toString(36).slice(2,9),
  agent,to,project,kind:'tool-evidence',when,url,message,phase};
}
export function summarizeObservations(repo,branch,sha,observations) {
 const present=observations.filter(x=>x.ok).map(x=>x.path);
 const absent=observations.filter(x=>!x.ok).map(x=>x.path);
 return 'Inspected '+repo+' at '+branch+' ('+sha.slice(0,12)+'): '+present.length+
    ' readable files'+(present.length?' ['+present.join(', ')+']':'')+
    (absent.length?'; unavailable: '+absent.join(', '):'')+'. These are source checks, not deployment tests.';
}
