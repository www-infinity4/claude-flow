import { buildMorningReport, sortPendingJobs, runOvernightQueue } from "./phi-overnight-runner.js";

const roster = { roles: [
  { id: "frontend-writer", kind: "writer" },
  { id: "independent-verifier", kind: "verifier" }
]};

function job(id, priority = "unfinished-product") {
  return {
    id, priority,
    routing: { specialistRoles: ["frontend-writer", "independent-verifier"] },
    controls: { blockedUntilAuthorized: false },
    verification: { acceptanceChecks: ["runtime passes"] }
  };
}

describe("Phi overnight runner", () => {
  test("prioritizes production breakage before cosmetic work", () => {
    expect(sortPendingJobs([job("style", "style-modernization"), job("live", "production-broken")]).map(x => x.id))
      .toEqual(["live", "style"]);
  });

  test("processes only the configured batch", async () => {
    const events = [];
    const monitor = {
      listFlowJobs: jest.fn(async () => ({ jobs: [job("a"), job("b"), job("c")] })),
      claimFlowJob: jest.fn(async () => ({})),
      addFlowEvent: jest.fn(async (...x) => events.push(x)),
      verifyFlowJob: jest.fn(async () => ({})),
      completeFlowJob: jest.fn(async () => ({}))
    };
    const summary = await runOvernightQueue({
      monitor, roster, batchSize: 2,
      executeRole: async ({ role }) => role.kind === "verifier"
        ? { passed: true, evidence: { runtime: "ok" } }
        : { changed: true }
    });
    expect(summary.selected).toBe(2);
    expect(summary.verified).toHaveLength(2);
  });

  test("quarantines jobs already at max attempts", async () => {
    const monitor = {
      listFlowJobs: jest.fn(async () => ({ jobs: [job("bad")] })),
      addFlowEvent: jest.fn(async () => ({}))
    };
    const summary = await runOvernightQueue({
      monitor, roster, executeRole: async () => ({}),
      priorAttempts: { bad: 2 }, maxAttempts: 2
    });
    expect(summary.quarantined).toEqual(["bad"]);
  });

  test("morning report never implies estate completion", () => {
    const report = buildMorningReport({
      discovered: 3, selected: 2, verified: ["a"], needs_work: ["b"], blocked: [], failed: [], quarantined: []
    });
    expect(report.queue.verified).toBe(1);
    expect(report.note).toMatch(/do not imply full-estate completion/);
  });
});
