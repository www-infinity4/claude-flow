/**
 * Phi repair-queue adapter.
 *
 * Converts estate-scanner job candidates into durable Monitor Flow jobs.
 * It deliberately does not inspect or mutate repositories itself; discovery,
 * repair and verification remain separate agent responsibilities.
 */
const REQUIRED = [
  "job_key",
  "requirement_source",
  "requirement_text",
  "repository_full_name",
  "specialist_roles",
  "acceptance_checks",
  "risk",
  "evidence_required"
];

const AUTHORIZATION_RISKS = new Set(["consequential"]);

function assertString(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

export function validateRepairCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    throw new TypeError("repair candidate is required");
  }
  for (const field of REQUIRED) {
    if (!(field in candidate)) throw new TypeError(`missing repair candidate field: ${field}`);
  }
  for (const field of ["job_key", "requirement_source", "requirement_text", "repository_full_name", "risk"]) {
    assertString(candidate[field], field);
  }
  for (const field of ["specialist_roles", "acceptance_checks", "evidence_required"]) {
    if (!Array.isArray(candidate[field]) || candidate[field].length === 0) {
      throw new TypeError(`${field} must be a non-empty array`);
    }
  }
  return candidate;
}

export function candidateNeedsAuthorization(candidate) {
  validateRepairCandidate(candidate);
  return candidate.authorization_required === true || AUTHORIZATION_RISKS.has(candidate.risk);
}

export function toMonitorFlowPayload(candidate) {
  validateRepairCandidate(candidate);
  return {
    key: candidate.job_key,
    source: "phi-repo-estate-scanner",
    requirement: {
      source: candidate.requirement_source,
      text: candidate.requirement_text
    },
    target: {
      repository: candidate.repository_full_name,
      runtime: candidate.runtime_target || null,
      classification: candidate.classification || "unknown"
    },
    routing: {
      specialistRoles: candidate.specialist_roles,
      regressionGroup: candidate.regression_group || null
    },
    controls: {
      risk: candidate.risk,
      authorizationRequired: candidateNeedsAuthorization(candidate),
      blockedUntilAuthorized: candidateNeedsAuthorization(candidate)
    },
    verification: {
      acceptanceChecks: candidate.acceptance_checks,
      evidenceRequired: candidate.evidence_required,
      writerMayVerifyOwnJob: false
    },
    provenance: {
      parentJob: candidate.parent_job || null,
      quantId: candidate.quant_id || null
    }
  };
}

export async function enqueueRepairCandidate(phiMonitorClient, candidate, options = {}) {
  if (!phiMonitorClient || typeof phiMonitorClient.createFlowJob !== "function") {
    throw new TypeError("PhiMonitorClient with createFlowJob() is required");
  }
  const payload = toMonitorFlowPayload(candidate);
  if (payload.controls.blockedUntilAuthorized && options.authorized !== true) {
    return { queued: false, blocked: true, reason: "user_authorization_required", payload };
  }
  const job = await phiMonitorClient.createFlowJob(payload, options.requestOptions || {});
  return { queued: true, blocked: false, job, payload };
}

export async function enqueueRepairCandidates(phiMonitorClient, candidates, options = {}) {
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");
  const results = [];
  for (const candidate of candidates) {
    try {
      results.push(await enqueueRepairCandidate(phiMonitorClient, candidate, options));
    } catch (error) {
      results.push({
        queued: false,
        blocked: false,
        error: error instanceof Error ? error.message : String(error),
        job_key: candidate?.job_key || null
      });
    }
  }
  return results;
}
