const TARGETS=Object.freeze({
  Cinemax:{repo:"www-infinity4/Cinemax",prefix:"MAX-SAFE-",networkChannel:"Cinemax"},
  Showtime:{repo:"www-infinity4/Showtime",prefix:"SHO-SAFE-",networkChannel:"Showtime"}
});
const esc=v=>String(v??"").replace(/\\/g,"\\\\").replace(/"/g,'\\"');
const pad=n=>String(n).padStart(3,"0");

export function validateCatalogAdmission(record,channel){
  const errors=[],candidate=record?.candidate||{};
  if(!TARGETS[channel])errors.push("unsupported-target");
  if(record?.passed!==true)errors.push("verifier-did-not-pass");
  if(record?.admissionStatus!=="admitted-for-catalog-write")errors.push("missing-admission-status");
  if(!record?.evidence)errors.push("missing-runtime-evidence");
  if(!candidate.videoId)errors.push("missing-video-id");
  if(!candidate.title)errors.push("missing-title");
  if(!(Number(candidate.runtimeSeconds)>=3600&&Number(candidate.runtimeSeconds)<=7200))errors.push("runtime-out-of-range");
  return{passed:errors.length===0,errors,candidate};
}

export function buildCatalogEntry(record,channel,ordinal){
  const x=validateCatalogAdmission(record,channel);
  if(!x.passed)throw new Error("Catalog admission refused: "+x.errors.join(","));
  const c=x.candidate,t=TARGETS[channel],year=Number(c.year)||new Date().getUTCFullYear();
  return '  { id:"'+t.prefix+pad(ordinal)+'", title:"'+esc(c.title)+'", year:'+year+', collection:"Verified Full-Length Feature", runtimeSeconds:'+Math.round(Number(c.runtimeSeconds))+', videoId:"'+esc(c.videoId)+'", source:"'+esc(c.source||c.identity?.provider||"Verified runtime source")+'", networkChannel:"'+t.networkChannel+'", cleared:true }';
}

export function prepareCatalogRefill({channel,catalogSource,admissions=[]}){
  const target=TARGETS[channel];
  if(!target)throw new Error("Unsupported catalog target");
  const src=String(catalogSource),existingIds=new Set([...src.matchAll(/videoId:"([^"]+)"/g)].map(x=>x[1]));
  const ordinals=[...src.matchAll(/(?:MAX|SHO)-SAFE-(\d+)/g)].map(x=>Number(x[1])).filter(Number.isFinite);
  let ordinal=Math.max(0,...ordinals)+1;const entries=[];
  for(const record of admissions){
    const x=validateCatalogAdmission(record,channel);
    if(!x.passed||existingIds.has(x.candidate.videoId))continue;
    entries.push(buildCatalogEntry(record,channel,ordinal++));existingIds.add(x.candidate.videoId);
  }
  if(!entries.length)return{changed:false,repo:target.repo,reason:"no-new-admitted-candidates"};
  const marker="\n].map(",at=src.indexOf(marker);
  if(at<0)throw new Error("Catalog array terminator not found; refuse structural rewrite");
  const before=src.slice(0,at).replace(/\s*$/,"");
  const updated=before+(before.endsWith("[")||before.endsWith(",")?"":",")+"\n"+entries.join(",\n")+src.slice(at);
  return{changed:true,repo:target.repo,path:"data/catalog.js",content:updated,added:entries.length};
}

export function bumpCatalogVersion(indexSource,stamp){
  if(!/^\d{8}-[A-Za-z0-9_-]+$/.test(String(stamp)))throw new Error("Invalid cache stamp");
  const src=String(indexSource),next=src.replace(/data\/catalog\.js\?v=[^"'\s<]+/,"data/catalog.js?v="+stamp);
  if(next===src)throw new Error("Catalog script version pin not found");
  return next;
}
