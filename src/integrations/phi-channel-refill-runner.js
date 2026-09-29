import{discoverCatalogRefill}from"./phi-media-discovery-provider.js";
import{enrichCatalogCandidates}from"./phi-media-enrichment.js";
import{verifyChannelCandidateAdmission}from"./phi-browser-provider.js";
import{prepareCatalogRefill,bumpCatalogVersion}from"./phi-channel-catalog-writer.js";
import{inspectCatalogFreshness}from"./phi-schedule-sensor.js";

const TARGETS={Cinemax:"www-infinity4/Cinemax",Showtime:"www-infinity4/Showtime"};

export async function runChannelCatalogRefill({
 channel,query,discovery,enrichmentAdapters={},browser,runtimeUrl,
 catalogSource,indexSource,peerCatalog=[],writeFiles,verifyRegression,
 targetUniqueAssets=12,maxCandidates=30,maxAdmissions=12,cacheStamp
}){
 if(!TARGETS[channel])throw new Error("Unsupported refill channel");
 const evidence={channel,query,startedAt:new Date().toISOString(),stages:[]};
 const discovered=await discoverCatalogRefill({discovery,query,channel,existingCatalog:[],peerCatalog,limit:maxCandidates});
 evidence.stages.push({stage:"discovery",discovered:discovered.discovered,candidates:discovered.candidates.length});
 if(!discovered.candidates.length)return{status:"needs_work",reason:"no-discovery-candidates",evidence};

 const enriched=await enrichCatalogCandidates(discovered.candidates,enrichmentAdapters);
 evidence.stages.push({stage:"enrichment",accepted:enriched.acceptedForRuntimeVerification.length,rejected:enriched.rejected.length});
 if(!enriched.acceptedForRuntimeVerification.length)return{status:"needs_work",reason:"no-enriched-candidates",evidence};

 const admissions=[];
 for(const candidate of enriched.acceptedForRuntimeVerification.slice(0,maxAdmissions)){
   const result=await verifyChannelCandidateAdmission({browser,runtimeUrl,candidate});
   admissions.push(result);
 }
 const passed=admissions.filter(x=>x.passed&&x.admissionStatus==="admitted-for-catalog-write");
 evidence.stages.push({stage:"runtime-admission",tested:admissions.length,passed:passed.length,failed:admissions.length-passed.length});
 if(!passed.length)return{status:"needs_work",reason:"no-runtime-admissions",evidence,admissions};

 const prepared=prepareCatalogRefill({channel,catalogSource,admissions:passed});
 if(!prepared.changed)return{status:"needs_work",reason:"no-new-admitted-candidates",evidence,admissions};

 const ids=[...prepared.content.matchAll(/videoId:"([^"]+)"/g)].map(x=>({videoId:x[1]}));
 const freshness=inspectCatalogFreshness(ids,[{name:"HBO",catalog:peerCatalog}],{minUniqueAssets:targetUniqueAssets,maxPeerOverlapRatio:.5});
 evidence.stages.push({stage:"freshness",result:freshness});
 if(!freshness.passed)return{status:"needs_work",reason:"catalog-quality-gate",evidence,admissions,preview:prepared};

 if(typeof writeFiles!=="function")return{status:"needs_work",reason:"writer-capability-unavailable",evidence,preview:prepared};
 const nextIndex=bumpCatalogVersion(indexSource,cacheStamp);
 const write=await writeFiles({repo:TARGETS[channel],files:[
   {path:"data/catalog.js",content:prepared.content},
   {path:"index.html",content:nextIndex}
 ],message:"Refill "+channel+" verified channel catalog"});
 evidence.stages.push({stage:"write",write});

 if(typeof verifyRegression!=="function")return{status:"needs_work",reason:"regression-verifier-unavailable",evidence,write};
 const regression=await verifyRegression({channel,runtimeUrl,write});
 evidence.stages.push({stage:"regression",result:regression});
 if(!regression?.passed)return{status:"needs_work",reason:"post-write-regression-failed",evidence,write,regression};

 return{status:"verified",channel,added:prepared.added,evidence,write,regression};
}
