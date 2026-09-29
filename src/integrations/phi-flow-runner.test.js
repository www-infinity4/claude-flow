import { buildExecutionPlan, runPhiFlowJob } from "./phi-flow-runner.js";

const roster = { roles: [
  { id: "ui-sensor", kind: "sensor" },
  { id: "frontend-writer", kind: "writer" },
  { id: "independent-verifier", kind: "verifier" }
]};

const job = {
  id: "flow-1",
  routing: { specialistRoles: ["ui-sensor", "frontend-writer"] },
  controls: { blockedUntilAuthorized: false },
  verification: { acceptanceChecks: ["button becomes Collected"] }
};

function monitor() {
  return {
    claimFlowJob: jest.fn(async () => ({})),
    addFlowEvent: jest.fn(async () => ({})),
    verifyFlowJob: jest.fn(async () => ({})),
    completeFlowJob: jest.fn(async () => ({}))
  };
}

describe("Phi Flow runner", () => {
  test("automatically appends independent verifier after writer", () => {
    const plan = buildExecutionPlan(job, roster);
    expect(plan.roles.map(x => x.id)).toEqual(["ui-sensor", "frontend-writer", "independent-verifier"]);
  });

  test("completes only after evidence-backed verification", async () => {
    const m = monitor();
    const result = await runPhiFlowJob({
      monitor: m, job, roster,
      executeRole: async ({ role }) => role.kind === "verifier"
        ? { passed: true, evidence: { runtime: "ok" } }
        : { ok: true }
    });
    expect(result.status).toBe("verified");
    expect(m.verifyFlowJob).toHaveBeenCalledWith("flow-1", true, expect.any(Object));
    expect(m.completeFlowJob).toHaveBeenCalledTimes(1);
  });

  test("returns needs_work when verifier lacks runtime evidence", async () => {
    const m = monitor();
    const result = await runPhiFlowJob({
      monitor: m, job, roster,
      executeRole: async ({ role }) => role.kind === "verifier"
        ? { passed: true, evidence: {} }
        : { ok: true }
    });
    expect(result.status).toBe("needs_work");
    expect(m.completeFlowJob).not.toHaveBeenCalled();
  });

  test("does not claim authorization-blocked work", async () => {
    const m = monitor();
    const result = await runPhiFlowJob({
      monitor: m,
      job: { ...job, controls: { blockedUntilAuthorized: true } },
      roster,
      executeRole: async () => ({ ok: true })
    });
    expect(result.status).toBe("blocked");
    expect(m.claimFlowJob).not.toHaveBeenCalled();
  });
});
