/**
 * GitHub capability provider for Phi specialist execution.
 *
 * Adapter functions are injected so this module stays portable across the
 * connected GitHub plugin, tests, and future service runtimes.
 */
function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

export function createPhiGitHubProvider(adapter) {
  required(adapter, "GitHub adapter");

  return {
    "repo.files.read": async ({ repository_full_name, path, ref }) => {
      required(repository_full_name, "repository_full_name");
      required(path, "path");
      const file = await adapter.fetchFile({ repository_full_name, path, ref });
      return {
        repository_full_name,
        path,
        ref: ref || null,
        sha: file.sha,
        content: file.content,
        display_url: file.display_url || null
      };
    },

    "repo.search": async ({ repository_full_name, query, topn = 20 }) => {
      required(repository_full_name, "repository_full_name");
      required(query, "query");
      return adapter.search({ repository_full_name, query, topn });
    },

    "repo.write.scoped": async ({
      repository_full_name,
      path,
      content,
      message,
      content_sha = null,
      branch = null
    }) => {
      required(repository_full_name, "repository_full_name");
      required(path, "path");
      if (typeof content !== "string") throw new TypeError("content must be a string");
      required(message, "message");

      const result = content_sha
        ? await adapter.updateFile({ repository_full_name, path, content, message, content_sha, branch })
        : await adapter.createFile({ repository_full_name, path, content, message, branch });

      return {
        repository_full_name,
        path,
        commit_sha: result.commit_sha,
        content_sha: result.content_sha || null,
        operation: content_sha ? "update" : "create"
      };
    },

    "deploy.status.read": async ({ repository_full_name, commit_sha }) => {
      required(repository_full_name, "repository_full_name");
      required(commit_sha, "commit_sha");
      const [status, runs] = await Promise.all([
        adapter.commitStatus({ repository_full_name, commit_sha }),
        adapter.commitWorkflowRuns({ repository_full_name, commit_sha })
      ]);
      return { repository_full_name, commit_sha, status, workflow_runs: runs };
    }
  };
}

export function githubAdapterFromTools(github) {
  return {
    fetchFile: args => github.fetch_file(args).then(x => x.result),
    search: ({ repository_full_name, query, topn }) => {
      const [org, repository_name] = repository_full_name.split("/");
      return github.search({ query, repository_name, org, topn }).then(x => x.result);
    },
    createFile: args => github.create_file(args).then(x => x.result),
    updateFile: args => github.update_file(args).then(x => x.result),
    commitStatus: ({ repository_full_name, commit_sha }) =>
      github.get_commit_combined_status({ repo_full_name: repository_full_name, commit_sha }).then(x => x.result),
    commitWorkflowRuns: ({ repository_full_name, commit_sha }) =>
      github.fetch_commit_workflow_runs({ repo_full_name: repository_full_name, commit_sha }).then(x => x.result)
  };
}
