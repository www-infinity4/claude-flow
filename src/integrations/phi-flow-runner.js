/**
 * Single-job Phi Flow runner.
 *
 * Execution of an individual role is injected by the host runtime. This keeps
 * Monitor as durable state while Claude-Flow decides how each specialist runs.
 */
const TERMINAL = new Set(["verified", "needs_work", "blocked", "failed"]);

function jobIdOf(job) {
  const id = job?.id ?? job?.job_id ?? job?.jobId;
  if (!id) throw new TypeError("Flow job id is required");
  return String(id);
}

function rolesOf(job) {
  const roles = job?.routing?.specialistRoles ?? job?.payload?.routing?.specialistRoles ?? [];
  return Array.isArray(roles) ? [...new Set(roles)] : [];
}

function acceptanceOf(job) {
  const checks = job?.verification?.acceptanceChecks ?? job?.payload?.verification?.acceptanceChecks ?? [];
  return Array.isArray(checks) ? checks : [];
}

function controlsOf(job) {
  return job?.controls ?? job?.payload?.controls ?? {};
}

export function buildExecutionPlan(job, roster) {
  if (!roster?.roles || !Array.isArray(roster.roles)) throw new TypeError("agent roster is required");
  const byId = new Map(roster.roles.map(role => [role.id, role]));
  const requested = rolesOf(job);
  const selected = requested.map(id => {
    const role = byId.get(id);
    if (!role) throw new TypeError(`unknown Phi role: ${id}`);
    return role;
  });

  const writers = selected.filter(x => x.kind === "writer");
  let verifier = selected.find(x => x.kind === "verifier");
  if (writers.length && !verifier) verifier = byId.get("independent-verifier");
  if (writers.length && !verifier) throw new Error("writer job requires independent-verifier");

  const ordered = selected.filter(x => x.kind !== "verifier");
  if (verifier && !ordered.some(x => x.id === verifier.id)) ordered.push(verifier);

  return {
    roles: ordered,
    writers: writers.map(x => x.id),
    verifier: verifier?.id || null,
    acceptanceChecks: acceptanceOf(job)
  };
}

export async function runPhiFlowJob({ monitor, job, roster, executeRole, agent = "claude-flow" }) {
  if (!monitor) throw new TypeError("monitor client is required");
  if (typeof executeRole !== "function") throw new TypeError("executeRole callback is required");

  const id = jobIdOf(job);
  const controls = controlsOf(job);
  if (controls.blockedUntilAuthorized === true) {
    await monitor.addFlowEvent(id, "blocked", { reason: "user_authorization_required" });
    return { status: "blocked", jobId: id };
  }

  const plan = buildExecutionPlan(job, roster);
  await monitor.claimFlowJob(id, agent);
  await monitor.addFlowEvent(id, "plan", {
    roles: plan.roles.map(x => x.id),
    acceptanceChecks: plan.acceptanceChecks
  });

  const evidence = [];
  let writerId = null;

  for (const role of plan.roles) {
    if (TERMINAL.has(role.id)) continue;
    if (role.kind === "verifier" && writerId === role.id) {
      throw new Error("writer cannot verify its own Phi Flow job");
    }

    await monitor.addFlowEvent(id, "role_started", { role: role.id, kind: role.kind });
    let result;
    try {
      result = await executeRole({ job, role, evidence: [...evidence], acceptanceChecks: plan.acceptanceChecks });
    } catch (error) {
      await monitor.addFlowEvent(id, "role_failed", {
        role: role.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return { status: "failed", jobId: id, role: role.id };
    }

    evidence.push({ role: role.id, kind: role.kind, result });
    await monitor.addFlowEvent(id, "role_finished", { role: role.id, kind: role.kind, result });

    if (role.kind === "writer") writerId = role.id;

    if (role.kind === "verifier") {
      const passed = result?.passed === true;
      const hasEvidence = result?.evidence && Object.keys(result.evidence).length > 0;
      const verificationEvidence = {
        verifier: role.id,
        acceptanceChecks: plan.acceptanceChecks,
        evidence: result?.evidence || {},
        notes: result?.notes || null
      };
      await monitor.verifyFlowJob(id, passed && hasEvidence, verificationEvidence);
      if (!passed || !hasEvidence) {
        await monitor.addFlowEvent(id, "needs_work", {
          reason: !passed ? "acceptance_checks_failed" : "verification_evidence_missing"
        });
        return { status: "needs_work", jobId: id, evidence };
      }
    }
  }

  if (plan.writers.length && !plan.verifier) {
    await monitor.addFlowEvent(id, "needs_work", { reason: "independent_verifier_missing" });
    return { status: "needs_work", jobId: id, evidence };
  }

  await monitor.completeFlowJob(id, {
    status: "verified",
    roles: plan.roles.map(x => x.id),
    evidence
  });
  return { status: "verified", jobId: id, evidence };
}
