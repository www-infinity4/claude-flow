import{createPhiMonitorClient}from"./phi-monitor-client.js";
import{createPhiGitHubProvider}from"./phi-github-provider.js";
import{createPhiBrowserProvider}from"./phi-browser-provider.js";
import{browserCapabilitiesFromSession}from"./phi-cloud-browser-adapter.js";
import{createSearxngDiscoveryAdapter,createMediaDiscoveryProvider}from"./phi-media-discovery-provider.js";
import{runChannelCatalogRefill}from"./phi-channel-refill-runner.js";
import{verifyChannelRegression}from"./phi-channel-regression-verifier.js";
import{createChannelRefillHandler,createSpecialistExecutor}from"./phi-specialist-executor.js";

export async function createPhiOvernightRuntime({
 githubAdapter,monitorOptions={},browserSession=null,roster,policy,handlers={},fetchImpl=globalThis.fetch
}={}){
 if(!githubAdapter)throw new TypeError("githubAdapter is required");
 if(!roster||!policy)throw new TypeError("roster and policy are required");
 const monitor=createPhiMonitorClient({...monitorOptions,fetchImpl});
 const github=createPhiGitHubProvider(githubAdapter);
 let browser=null,browserProvider={};
 if(browserSession){
   browser=browserCapabilitiesFromSession(browserSession);
   browserProvider=createPhiBrowserProvider(browser);
 }
 const discovery=createMediaDiscoveryProvider({searxng:createSearxngDiscoveryAdapter({fetchImpl})});
 const implementations={...github,...browserProvider};
 const runtimeHealth={
   createdAt:new Date().toISOString(),
   monitor:{configured:true,endpoint:monitor.endpoint},
   github:{configured:true},
   discovery:{configured:true,provider:"searxng"},
   browser:{configured:Boolean(browserSession),status:browserSession?"host-session-supplied":"unavailable"}
 };
 const channelCatalogWriter=browserSession?createChannelRefillHandler({
   runRefill:runChannelCatalogRefill,discovery,browser,
   verifyRegression:args=>verifyChannelRegression({...args,browser})
 }):async({job})=>({
   status:"needs_work",passed:false,
   evidence:{dependency:"browser",runtimeHealth,jobId:job?.id||job?.job_id||null},
   notes:"Real cloud browser session unavailable; browser-dependent catalog refill was not executed."
 });
 const executeRole=createSpecialistExecutor({
   roster,policy,implementations,
   handlers:{...handlers,"catalog-writer":channelCatalogWriter}
 });
 return{monitor,executeRole,runtimeHealth,implementations,dependencies:{browser,discovery}};
}

export function browserJobStartupGate(job,runtimeHealth){
 const text=JSON.stringify(job||{});
 const browserRequired=/browser|runtime-admission|playback|media\\.test|channelCatalogWriter/i.test(text);
 if(browserRequired&&!runtimeHealth?.browser?.configured)return{
   runnable:false,status:"needs_work",reason:"browser-session-unavailable",
   evidence:{required:"real cloud browser session",runtimeHealth}
 };
 return{runnable:true,status:"ready"};
}
