import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {convertIssue,routeTitle} from '../moltnook-intake-lib.mjs';
const config=JSON.parse(fs.readFileSync('phi/moltnook-agent-bridge.json','utf8'));
test('every advertised persona maps only to existing bounded system roles',()=>{
 const capability=JSON.parse(fs.readFileSync('phi/role-capabilities.json','utf8')).rules;
 for(const persona of config.personas)for(const role of persona.systemRoles)assert.ok(capability[role],persona.id+':'+role);
 for(const r of config.routing)assert.ok(config.personas.some(p=>p.id===r.persona && p.systemRoles.includes(r.systemRole)));
});
test('bug reports pick investigative role regardless of market keywords',()=>{
 const r=routeTitle('[Agent Job] Fix Bitcoin Crusher broken screen',config);
 assert.equal(r.persona,'pink-panther');
});
test('source-linked issue never becomes executed through intake',()=>{
 const issue={number:8,title:'[Agent Job] Build an element validator',html_url:'https://github.com/www-infinity4/Oracle-Octaves/issues/8',state:'open',updated_at:'2026-10-09T00:00:00Z'};
 const job=convertIssue(issue,config);
 assert.equal(job.status,'queued');assert.equal(job.execution_status,'not_started');assert.equal(job.receipt,null);
 assert.equal(job.proposed_skills[0].status,'proposed-not-installed');
});
test('other GitHub issues and PRs are not jobs',()=>{
 assert.equal(convertIssue({number:2,title:'Guestbook',html_url:'https://github.com/example'},config),null);
 assert.equal(convertIssue({number:3,title:'[Agent Job] hi',pull_request:{},html_url:'https://github.com/example'},config),null);
});

test('issue intake remains pending owning-repository resolution',()=>{
 const job=convertIssue({number:9,title:'[Agent Job] Fix wallet credits',html_url:'https://github.com/www-infinity4/Oracle-Octaves/issues/9',state:'open',updated_at:'2026-10-09T00:00:00Z'},config);
 assert.equal(job.repo_scope,null);assert.equal(job.scope_requires_resolution,true);assert.equal(job.authorization_required,true);
});
