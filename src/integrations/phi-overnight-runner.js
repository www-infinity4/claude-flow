import { runPhiFlowJob } from "./phi-flow-runner.js";

const PRIORITY = {
  "production-broken": 0,
  "data-loss": 1,
  "shared-runtime": 2,
  "master-red": 3,
  "unfinished-product": 4,
  "style-modernization": 5,
  "research-cleanup": 6
};

function idOf(job) { return String(job?.id ?? job?.job_id ?? job?.jobId ?? ""); }
function payloadOf(job) { return job?.payload ?? job ?? {}; }

export function priorityOf(job) {
  const p = payloadOf(job);
  const label = p.priority || p.routing?.priority || "unfinished-product";
  return PRIORITY[label] ?? 50;
}

export function sortPendingJobs(jobs) {
  return [...jobs].sort((a, b) => priorityOf(a) - priorityOf(b) || idOf(a).localeCompare(idOf(b)));
}

export function isRecoverableFailure(result) {
  return result?.status === "failed" && !["authorization", "invalid_job", "unknown_role"].includes(result?.reason);
}

export async function runOvernightQueue({
  monitor,
  roster,
  executeRole,
  agent = "claude-flow-overnight",
  batchSize = 10,
  maxAttempts = 2,
  priorAttempts = {},
  startupGate = null,
  runtimeHealth = null
}) {
  if (!monitor?.listFlowJobs) throw new TypeError("Monitor Flow client is required");
  const response = await monitor.listFlowJobs({ status: "pending", limit: Math.max(batchSize * 3, 25) });
  const jobs = response?.jobs ?? response?.items ?? response?.data ?? (Array.isArray(response) ? response : []);
  const ordered = sortPendingJobs(jobs);
  const selected = [];
  const deferred = [];
  for (const job of ordered) {
    if (selected.length >= batchSize) break;
    const gate = typeof startupGate === "function" ? startupGate(job, runtimeHealth) : { runnable: true };
    if (gate?.runnable === false) {
      deferred.push({ job, gate });
      continue;
    }
    selected.push(job);
  }
  const summary = {
    discovered: jobs.length,
    selected: selected.length,
    verified: [],
    needs_work: [],
    blocked: [],
    failed: [],
    quarantined: [],
    deferred: []
  };

  for (const { job, gate } of deferred) {
    const jobId = idOf(job);
    await monitor.addFlowEvent(jobId, "dependency_deferred", {
      reason: gate.reason || "runtime_dependency_unavailable",
      evidence: gate.evidence || null
    });
    summary.needs_work.push(jobId);
    summary.deferred.push(jobId);
  }

  for (const job of selected) {
    const jobId = idOf(job);
    const attempts = Number(priorAttempts[jobId] || 0);

    if (attempts >= maxAttempts) {
      await monitor.addFlowEvent(jobId, "quarantined", { reason: "max_attempts_reached", attempts });
      summary.quarantined.push(jobId);
      continue;
    }

    let result;
    try {
      result = await runPhiFlowJob({ monitor, job, roster, executeRole, agent });
    } catch (error) {
      result = { status: "failed", jobId, reason: "runner_exception", error: error instanceof Error ? error.message : String(error) };
      await monitor.addFlowEvent(jobId, "runner_exception", { error: result.error });
    }

    const bucket = summary[result.status] || summary.failed;
    bucket.push(jobId);

    if (isRecoverableFailure(result)) {
      const nextAttempt = attempts + 1;
      await monitor.addFlowEvent(jobId, "retry_scheduled", { attempt: nextAttempt, maxAttempts });
      if (nextAttempt >= maxAttempts) {
        await monitor.addFlowEvent(jobId, "quarantined", { reason: "repeated_failure", attempts: nextAttempt });
        summary.quarantined.push(jobId);
      }
    }
  }

  return summary;
}

export function buildMorningReport(summary, { inventory = null, generatedAt = new Date().toISOString() } = {}) {
  return {
    schema: "phi-morning-report/v1",
    generatedAt,
    estateInventory: inventory,
    queue: {
      discovered: summary.discovered,
      selected: summary.selected,
      verified: summary.verified.length,
      needsWork: summary.needs_work.length,
      blocked: summary.blocked.length,
      failed: summary.failed.length,
      quarantined: summary.quarantined.length,
      deferred: (summary.deferred || []).length
    },
    verifiedJobs: summary.verified,
    needsWorkJobs: summary.needs_work,
    blockedApprovals: summary.blocked,
    failedJobs: summary.failed,
    quarantinedJobs: summary.quarantined,
    deferredJobs: summary.deferred || [],
    note: "Counts describe this bounded run only; they do not imply full-estate completion."
  };
}
