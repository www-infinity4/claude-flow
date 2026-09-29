import {
  compileCapabilityPolicy,
  createSpecialistExecutor,
  roleCan,
  scopedCapabilities
} from "./phi-specialist-executor.js";

const policy = {
  rules: {
    "frontend-writer": { allow: ["repo.files.read", "repo.write.scoped"], deny: [] },
    "independent-verifier": { allow: ["repo.files.read", "runtime.http.read"], deny: ["repo.write"] }
  }
};
const roster = { roles: [
  { id: "frontend-writer", kind: "writer" },
  { id: "independent-verifier", kind: "verifier" }
]};
const job = { target: { repository: "www-infinity4/C13b0" } };

describe("Phi specialist executor", () => {
  test("default-denies capabilities not granted to a role", () => {
    const map = compileCapabilityPolicy(policy);
    expect(roleCan(map, "independent-verifier", "repo.write.scoped")).toBe(false);
    expect(roleCan(map, "independent-verifier", "runtime.http.read")).toBe(true);
  });

  test("verifier is not exposed repo write", () => {
    const caps = scopedCapabilities({
      role: roster.roles[1], job, policy,
      implementations: {
        "repo.files.read": jest.fn(),
        "repo.write.scoped": jest.fn(),
        "runtime.http.read": jest.fn()
      }
    });
    expect(caps["repo.write.scoped"]).toBeUndefined();
    expect(caps["runtime.http.read"]).toBeDefined();
  });

  test("writer cannot write outside queued repository", async () => {
    const caps = scopedCapabilities({
      role: roster.roles[0], job, policy,
      implementations: { "repo.write.scoped": jest.fn(async () => ({ ok: true })) }
    });
    await expect(caps["repo.write.scoped"]({ repository_full_name: "www-infinity4/Alien-Radio" }))
      .rejects.toThrow(/outside job repository/);
  });

  test("dispatcher gives handler only allowed capabilities", async () => {
    const execute = createSpecialistExecutor({
      roster, policy,
      implementations: {
        "repo.files.read": jest.fn(async () => "source"),
        "repo.write.scoped": jest.fn(async () => "written")
      },
      handlers: {
        verifier: async ({ capabilities }) => ({
          passed: capabilities["repo.write.scoped"] === undefined,
          evidence: { readOnly: true }
        })
      }
    });
    const result = await execute({
      job, role: roster.roles[1], evidence: [], acceptanceChecks: ["runtime passes"]
    });
    expect(result.passed).toBe(true);
  });
});
