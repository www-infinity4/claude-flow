/**
 * Least-privilege dispatcher for Phi specialist roles.
 *
 * Hosts provide capability implementations (GitHub, browser, runtime, etc.).
 * This module only exposes capabilities allowed for the selected role and job.
 */
export function compileCapabilityPolicy(policy) {
  if (!policy?.rules) throw new TypeError("role capability policy is required");
  return new Map(Object.entries(policy.rules));
}

function matches(rule, capability) {
  return rule === capability || (rule.endsWith(".*") && capability.startsWith(rule.slice(0, -1)));
}

export function roleCan(policyMap, roleId, capability) {
  const rule = policyMap.get(roleId);
  if (!rule) return false;
  if ((rule.deny || []).some(x => matches(x, capability))) return false;
  return (rule.allow || []).some(x => matches(x, capability));
}

export function scopedCapabilities({ role, job, policy, implementations }) {
  const policyMap = policy instanceof Map ? policy : compileCapabilityPolicy(policy);
  const targetRepo = job?.target?.repository ?? job?.payload?.target?.repository ?? null;
  const exposed = {};

  for (const [name, fn] of Object.entries(implementations || {})) {
    if (!roleCan(policyMap, role.id, name) || typeof fn !== "function") continue;
    exposed[name] = async args => {
      if (name === "repo.write.scoped") {
        const requestedRepo = args?.repository_full_name ?? args?.repository;
        if (!targetRepo || requestedRepo !== targetRepo) {
          throw new Error("scoped repo write rejected outside job repository");
        }
      }
      return fn(args, { role, job });
    };
  }
  return Object.freeze(exposed);
}

export function createSpecialistExecutor({ roster, policy, implementations, handlers }) {
  if (!roster?.roles) throw new TypeError("agent roster is required");
  const roleMap = new Map(roster.roles.map(x => [x.id, x]));
  const policyMap = compileCapabilityPolicy(policy);

  return async function executeRole({ job, role, evidence, acceptanceChecks }) {
    const canonical = roleMap.get(role.id);
    if (!canonical) throw new Error(`unknown role: ${role.id}`);
    const handler = handlers?.[role.id] ?? handlers?.[canonical.kind];
    if (typeof handler !== "function") throw new Error(`no specialist handler for ${role.id}`);

    const capabilities = scopedCapabilities({
      role: canonical, job, policy: policyMap, implementations
    });

    return handler({
      job,
      role: canonical,
      capabilities,
      evidence: evidence || [],
      acceptanceChecks: acceptanceChecks || []
    });
  };
}
