import{strict as assert}from"node:assert";import{scanRepositoryEstate,estateFindingsToCandidates}from"./phi-repository-estate-scanner.js";
const github={
 listRepositories:async({cursor})=>cursor?{items:[{full_name:"www-infinity4/B"}],next_cursor:null}:{items:[{full_name:"www-infinity4/A"}],next_cursor:"p2"},
 listFiles:async({repository_full_name})=>repository_full_name.endsWith("/A")?[{path:"README.md"},{path:"index.html"}]:[{path:"README.md"},{path:"wrangler.toml"}],
 fetchFile:async({repository_full_name})=>({content:repository_full_name.endsWith("/A")?"# A\\n- [ ] Fix player\\nLive site https://example.test/A":"# B\\nCloudflare Worker API"})
};
const scan=await scanRepositoryEstate({github,pageSize:1});
assert.equal(scan.coverage.complete,true);assert.equal(scan.coverage.uniqueRepositories,2);
assert.equal(scan.inspections.find(x=>x.repository_full_name.endsWith("/A")).classification,"active-site");
assert.equal(scan.inspections.find(x=>x.repository_full_name.endsWith("/B")).classification,"active-service");
const jobs=estateFindingsToCandidates(scan);assert.equal(jobs.length,1);assert.match(jobs[0].requirement_text,/Fix player/);
