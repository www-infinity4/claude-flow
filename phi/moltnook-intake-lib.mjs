// Pure, reproducible job intake for the Moltnook -> Phi Claude-Flow bridge.
export function routeTitle(title, config) {
  if (typeof title !== 'string') throw new TypeError('title must be text');
  const cleaned=title.slice(0,180).replace(/\s+/g,' ').trim();
  const selected=config.routing.find(x=>new RegExp(x.match,'i').test(cleaned))||config.default;
  if (!config.personas.some(x=>x.id===selected.persona)) throw new Error('Unregistered agent identity');
  const skills=config.skillProposals.filter(x=>new RegExp(x.match,'i').test(cleaned)).map(x=>({
    name:x.name,criteria:x.criteria,status:'proposed-not-installed'
  }));
  return {persona:selected.persona,systemRole:selected.systemRole,skills};
}
export function convertIssue(issue,config) {
  if (!issue || typeof issue.title !== 'string'||!/^\[Agent Job\]/i.test(issue.title))return null;
  if (issue.pull_request || !Number.isInteger(issue.number)||!issue.html_url)return null;
  const route=routeTitle(issue.title,config);
  return {
    job_key:'moltnook:issue:'+issue.number,
    issue_number:issue.number,
    source_url:issue.html_url,
    title:issue.title.slice(0,180),
    updated_at:issue.updated_at,
    source_state:issue.state,
    status:issue.state==='closed'?'closed-unverified':'queued',
    execution_status:'not_started',
    proposed_persona:route.persona,
    approved_system_role:route.systemRole,
    proposed_skills:route.skills,
    repo_scope:'www-infinity4/Moltnook',
    authorization_required:/\b(wallet|token|payout|payment|secrets|identity|governance|government|deploy)\b/i.test(issue.title),
    evidence_required:['issue source URL','scoped repository/commit','test results','independent verifier receipt'],
    receipt:null
  };
}
