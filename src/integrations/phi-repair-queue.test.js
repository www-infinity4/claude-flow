import {
  candidateNeedsAuthorization,
  enqueueRepairCandidate,
  toMonitorFlowPayload,
  validateRepairCandidate
} from "./phi-repair-queue.js";

const base = {
  job_key: "c13b0:mercury-cart-visible",
  requirement_source: "docs/PHI-MASTER-RED-BACKLOG-2026-09-28.md",
  requirement_text: "Runtime-verify the exact Mercury card appears in the visible cart.",
  repository_full_name: "www-infinity4/C13b0",
  runtime_target: "Infinity Phi",
  classification: "active-site",
  specialist_roles: ["ui-sensor", "frontend-writer", "independent-verifier"],
  acceptance_checks: ["Collect opens cart", "Mercury card is visible"],
  regression_group: "commerce",
  risk: "low-reversible",
  authorization_required: false,
  evidence_required: ["commit SHA", "runtime result"]
};

describe("Phi repair queue", () => {
  test("validates and maps a repair candidate", () => {
    expect(validateRepairCandidate(base)).toBe(base);
    const payload = toMonitorFlowPayload(base);
    expect(payload.target.repository).toBe("www-infinity4/C13b0");
    expect(payload.verification.writerMayVerifyOwnJob).toBe(false);
    expect(payload.controls.blockedUntilAuthorized).toBe(false);
  });

  test("consequential work requires authorization", () => {
    expect(candidateNeedsAuthorization({ ...base, risk: "consequential" })).toBe(true);
  });

  test("does not enqueue consequential work without authorization", async () => {
    const client = { createFlowJob: jest.fn() };
    const result = await enqueueRepairCandidate(client, { ...base, risk: "consequential" });
    expect(result.blocked).toBe(true);
    expect(client.createFlowJob).not.toHaveBeenCalled();
  });

  test("queues safe work through Monitor", async () => {
    const client = { createFlowJob: jest.fn(async payload => ({ id: "flow-1", payload })) };
    const result = await enqueueRepairCandidate(client, base);
    expect(result.queued).toBe(true);
    expect(client.createFlowJob).toHaveBeenCalledTimes(1);
  });

  test("rejects incomplete candidates", () => {
    expect(() => validateRepairCandidate({ job_key: "broken" })).toThrow();
  });
});
