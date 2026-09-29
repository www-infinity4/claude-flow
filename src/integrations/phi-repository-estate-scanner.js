const CLASSES=["active-site","active-service","shared-library","automation","research-experiment","game-media","archive-candidate","unknown"];
const UNRESOLVED=/- \[ \]|TODO|not built|verification needed|\bRED\b|unresolved/i;
function classify(files=[],readme=""){
 const names=new Set(files.map(x=>String(x.path||x.name||"").toLowerCase()));
 const text=String(readme);
 if(names.has("wrangler.toml")||names.has("wrangler.jsonc")||/cloudflare worker|worker api|d1 database/i.test(text))return"active-service";
 if(/claude-flow|orchestrat|automation|agent roster/i.test(text))return"automation";
 if(names.has(".github/workflows/pages.yml")||names.has("index.html")||/github pages|live site/i.test(text))return"active-site";
 if(/shared library|reusable component|sdk|package/i.test(text))return"shared-library";
 if(/game|arcade|media player/i.test(text))return"game-media";
 if(/experiment|research|prototype/i.test(text))return"research-experiment";
 if(/archived|deprecated|superseded/i.test(text))return"archive-candidate";
 return"unknown";
}
export async function scanRepository({github,repository_full_name}){
 const files=await github.listFiles({repository_full_name}).catch(()=>[]);
 const readmeFile=files.find(x=>/^readme(?:\.[^/]+)?$/i.test(x.path||x.name||""));
 let readme="",readmeError=null;
 if(readmeFile)try{readme=(await github.fetchFile({repository_full_name,path:readmeFile.path||readmeFile.name})).content||"";}catch(e){readmeError=String(e?.message||e);}
 const classification=classify(files,readme);
 const runtimeSignals=[...String(readme).matchAll(/https:\/\/[^\s)>"]+/g)].map(x=>x[0]).slice(0,10);
 const unresolved=String(readme).split(/\r?\n/).filter(x=>UNRESOLVED.test(x)).slice(0,50);
 return{repository_full_name,classification,signals:{fileCount:files.length,readme:Boolean(readme),readmeError,runtimeSignals},unresolved};
}
export async function scanRepositoryEstate({github,owner="www-infinity4",pageSize=100,maxPages=100}){
 if(!github?.listRepositories||!github?.listFiles||!github?.fetchFile)throw new TypeError("estate GitHub adapter incomplete");
 const repos=new Map(),pages=[],seenTokens=new Set();let cursor=null,complete=false,stopReason=null;
 for(let page=0;page<maxPages;page++){
   const res=await github.listRepositories({owner,limit:pageSize,cursor});
   const items=res?.repositories||res?.items||res?.data||[];
   const token=String(res?.next_cursor??res?.nextCursor??res?.next_page??res?.nextPage??"");
   const signature=items.map(x=>x.full_name||x.repository_full_name||x.name).join("|")+"::"+token;
   if(seenTokens.has(signature)){stopReason="repeated-page";break;}seenTokens.add(signature);
   let added=0;for(const x of items){const full=x.full_name||x.repository_full_name||(x.name?owner+"/"+x.name:null);if(full&&!repos.has(full)){repos.set(full,x);added++;}}
   pages.push({page:page+1,returned:items.length,added,next:token||null});
   if(!token){complete=true;stopReason="source-exhausted";break;}cursor=token;
 }
 if(!complete&&!stopReason)stopReason="max-pages";
 const inspections=[];for(const full of repos.keys())inspections.push(await scanRepository({github,repository_full_name:full}));
 return{owner,coverage:{complete,stopReason,pages:pages.length,uniqueRepositories:repos.size},pages,inspections,classes:CLASSES};
}
export function estateFindingsToCandidates(scan){
 const out=[];let n=0;
 for(const repo of scan?.inspections||[])for(const line of repo.unresolved||[]){n++;out.push({
   job_key:"estate:"+repo.repository_full_name+":"+n,requirement_source:"README.md",requirement_text:line.replace(/^- \[ \]\s*/,"").trim(),
   repository_full_name:repo.repository_full_name,runtime_target:repo.signals?.runtimeSignals?.[0]||null,classification:repo.classification,
   specialist_roles:["repo-reader"],acceptance_checks:["Resolve or map this repository-local unfinished finding with evidence."],
   regression_group:"estate-scan",risk:"read-only",authorization_required:false,evidence_required:["repository evidence"],
   priority:"unfinished active product",scanner_evidence:{coverageComplete:Boolean(scan?.coverage?.complete)}
 });}
 return out;
}
