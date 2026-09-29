import { createPhiGitHubProvider } from "./phi-github-provider.js";

describe("Phi GitHub provider", () => {
  test("returns commit evidence for scoped writes", async () => {
    const provider = createPhiGitHubProvider({
      createFile: jest.fn(async () => ({ commit_sha: "abc123" })),
      updateFile: jest.fn(),
      fetchFile: jest.fn(),
      search: jest.fn(),
      commitStatus: jest.fn(),
      commitWorkflowRuns: jest.fn()
    });
    const result = await provider["repo.write.scoped"]({
      repository_full_name: "www-infinity4/C13b0",
      path: "docs/test.md",
      content: "test",
      message: "test write"
    });
    expect(result.commit_sha).toBe("abc123");
    expect(result.operation).toBe("create");
  });

  test("reads deployment evidence from status and workflow runs", async () => {
    const provider = createPhiGitHubProvider({
      createFile: jest.fn(),
      updateFile: jest.fn(),
      fetchFile: jest.fn(),
      search: jest.fn(),
      commitStatus: jest.fn(async () => ({ statuses: [{ state: "success" }] })),
      commitWorkflowRuns: jest.fn(async () => ({ workflow_runs: [{ conclusion: "success" }] }))
    });
    const result = await provider["deploy.status.read"]({
      repository_full_name: "www-infinity4/C13b0",
      commit_sha: "abc123"
    });
    expect(result.status.statuses[0].state).toBe("success");
    expect(result.workflow_runs.workflow_runs[0].conclusion).toBe("success");
  });

  test("rejects writes without commit message", async () => {
    const provider = createPhiGitHubProvider({});
    await expect(provider["repo.write.scoped"]({
      repository_full_name: "www-infinity4/C13b0",
      path: "x",
      content: "x"
    })).rejects.toThrow(/message is required/);
  });
});
