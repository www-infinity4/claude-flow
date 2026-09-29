const OWNER_RULES=[
 {heading:/Control Phi|unified wallet|coins/i,repo:"www-infinity4/Control-Phi",classification:"active-service"},
 {heading:/Marketplace|Mercury/i,repo:"www-infinity4/C13b0",classification:"active-site"},
 {heading:/Shop Phi|ads|merchant/i,repo:"www-infinity4/Shop-Phi",classification:"active-site"},
 {heading:/TV channels|scheduler/i,repo:"www-infinity4/TNT",classification:"shared-library"},
 {heading:/Alien Coin/i,repo:"www-infinity4/Alien-Coin",classification:"active-site"},
 {heading:/Infinity Radio|Music Quants/i,repo:"www-infinity4/Alien-Radio",classification:"active-site"},
 {heading:/Claude-Flow|Monitor/i,repo:"www-infinity4/claude-flow",classification:"automation"}
];
const PRIORITY=text=>/broken|fix |stale|dead|silent|loop|restart|fails?|not working/i.test(text)?"production/runtime broken now":/persist|data loss|survives refresh|wallet/i.test(text)?"data loss or persistence failure":/shared|reusable|every channel|cross-Phi/i.test(text)?"shared service regression affecting multiple Phi surfaces":"explicit master-red requirement with known owner";
const roles=text=>/runtime|verify|render|play|Android|browser/i.test(text)?["repo-reader","runtime-sensor","independent-verifier"]:/persist|D1|server|Worker|ledger/i.test(text)?["repo-reader","backend-writer","independent-verifier"]:["repo-reader","frontend-writer","independent-verifier"];

export function parseMasterRedBacklog(markdown,{source="docs/PHI-MASTER-RED-BACKLOG-2026-09-28.md"}={}){
 let heading="",n=0;const candidates=[];
 for(const raw of String(markdown).split(/\r?\n/)){
   const h=raw.match(/^##\s+(.+)/);if(h){heading=h[1].trim();continue;}
   const m=raw.match(/^- \[ \]\s+(.+)/);if(!m)continue;
   const requirement=m[1].trim(),rule=OWNER_RULES.find(x=>x.heading.test(heading));
   n++;
   if(!rule){
     candidates.push({job_key:"master-red:investigate:"+n,requirement_source:source,requirement_text:requirement,repository_full_name:"www-infinity4/claude-flow",runtime_target:null,classification:"automation",specialist_roles:["repo-reader"],acceptance_checks:["Identify canonical owning repository and runtime target with evidence."],regression_group:null,risk:"read-only",authorization_required:false,evidence_required:["owner mapping evidence"],priority:"explicit master-red requirement with known owner",scanner_evidence:{heading,ownership:"ambiguous"}});
     continue;
   }
   const consequential=/authenticated user-to-user transfers|payment|checkout|publish|seller-authorized|tracking|external merchant|eBay/i.test(requirement);
   candidates.push({job_key:"master-red:"+rule.repo+":"+n,requirement_source:source,requirement_text:requirement,repository_full_name:rule.repo,runtime_target:null,classification:rule.classification,specialist_roles:roles(requirement),acceptance_checks:["Requirement behavior is implemented.","Owning runtime is verified where applicable.","Independent evidence is recorded."],regression_group:heading,risk:consequential?"consequential":"low-reversible",authorization_required:consequential,evidence_required:["commit/deployment evidence","runtime evidence when applicable"],priority:PRIORITY(requirement),scanner_evidence:{heading,ownership:"rule-mapped"}});
 }
 return candidates;
}
