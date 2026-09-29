import{parseMasterRedBacklog}from"./phi-master-red-scanner.js";
import{planEstateJobs,enqueueEstateJobs}from"./phi-estate-job-generator.js";

export function buildAutomaticRepairQueue({masterRedMarkdown,estateCandidates=[],existingJobs=[],maxCreate=25}){
 const master=parseMasterRedBacklog(masterRedMarkdown);
 const combined=[...master,...estateCandidates];
 const plan=planEstateJobs({candidates:combined,existingJobs,maxCreate});
 return{...plan,sources:{masterRed:master.length,estateScan:estateCandidates.length,combined:combined.length}};
}
export async function enqueueAutomaticRepairQueue({monitor,masterRedMarkdown,estateCandidates=[],existingJobs=[],maxCreate=25}){
 const master=parseMasterRedBacklog(masterRedMarkdown);
 const result=await enqueueEstateJobs({monitor,candidates:[...master,...estateCandidates],existingJobs,maxCreate});
 return{...result,sources:{masterRed:master.length,estateScan:estateCandidates.length,combined:master.length+estateCandidates.length}};
}
