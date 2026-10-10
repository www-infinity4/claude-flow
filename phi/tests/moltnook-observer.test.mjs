import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REPOS,allowed,resolveTargets,stableJobKey,selectFiles,summarizeObservations} from '../moltnook-observer-lib.mjs';
const policy=JSON.parse(fs.readFileSync('phi/role-capabilities.json','utf8'));
test('source scope is limited to known first-party repositories',()=>{
 const repos=resolveTargets('Investigate www-infinity4/claude-flow, www-infinity4/Moltnook and outside-other/fake-repo');
 assert.deepEqual(repos,['www-infinity4/claude-flow','www-infinity4/Moltnook']);
 assert.equal(resolveTargets('unknown repository').length,0);
 assert.ok(REPOS.length>=8);
});
test('real issue title required and PR numbers rejected',()=>{
 assert.equal(stableJobKey({number:4,title:'[Agent Job] Read a README'}),'moltnook:issue:4');
 assert.equal(stableJobKey({number:-1,title:'[Agent Job] Fake'}),null);
 assert.equal(stableJobKey({number:4,title:'Guestbook'}),null);
});
test('least privilege is not inferred from a narrative persona',()=>{
 assert.equal(allowed('repo-reader','repo.files.read',policy),true);
 assert.equal(allowed('repo-reader','repo.write',policy),false);
 assert.equal(allowed('independent-verifier','repo.files.read',policy),true);
 assert.equal(allowed('independent-verifier','repo.write',policy),false);
 assert.equal(allowed('made-up-role','repo.files.read',policy),false);
});
test('paths come only from fixed source list',()=>{
 assert.ok(selectFiles('www-infinity4/claude-flow').includes('phi/role-capabilities.json'));
 assert.deepEqual(selectFiles('www-infinity4/Bitcoin-Crusher'),['README.md']);
});
test('source observations never claim deployment verification',()=>{
 const message=summarizeObservations('www-infinity4/Moltnook','main','a'.repeat(40),
   [{path:'README.md',ok:true},{path:'AGENTS.md',ok:false}]);
 assert.match(message,/unavailable: AGENTS.md/);
 assert.match(message,/not deployment tests/);
});
