/**
 * Phi Monitor client for Claude-Flow.
 *
 * Keeps Cloudflare/Monitor as the durable edge backend while Claude-Flow
 * remains the orchestration runtime. Works in Node 20+ and browser-like
 * runtimes that provide fetch.
 */
export class PhiMonitorClient {
  constructor({ endpoint = "https://monitor-phi.marvaseater.workers.dev", fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== "function") throw new TypeError("fetch is required");
    this.endpoint = String(endpoint).replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  async request(path, { method = "GET", body, signal } = {}) {
    const response = await this.fetch(this.endpoint + path, {
      method,
      signal,
      headers: body === undefined ? { accept: "application/json" } : {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!response.ok) {
      const error = new Error(`Phi Monitor ${method} ${path} failed: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  health(options) { return this.request("/health", options); }
  programs(options) { return this.request("/programs", options); }
  observe(options) { return this.request("/p/observer/run", options); }

  collectQuant(payload, options = {}) {
    return this.request("/p/quants/collect", { ...options, method: "POST", body: payload });
  }

  signalQuant(payload, options = {}) {
    return this.request("/p/quants/signal", { ...options, method: "POST", body: payload });
  }

  newsFeed(payload, options = {}) {
    return this.request("/p/news/feed", { ...options, method: "POST", body: payload });
  }

  createFlowJob(payload, options = {}) {
    return this.request("/p/flow/jobs", { ...options, method: "POST", body: payload });
  }

  listFlowJobs({ status = "", limit = 50 } = {}, options = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (status) params.set("status", status);
    return this.request("/p/flow/jobs?" + params, options);
  }

  getFlowJob(jobId, options = {}) {
    return this.request("/p/flow/jobs/" + encodeURIComponent(jobId), options);
  }

  claimFlowJob(jobId, agent, options = {}) {
    return this.request("/p/flow/jobs/" + encodeURIComponent(jobId) + "/claim", {
      ...options, method: "POST", body: { agent }
    });
  }

  addFlowEvent(jobId, kind, data = {}, options = {}) {
    return this.request("/p/flow/jobs/" + encodeURIComponent(jobId) + "/event", {
      ...options, method: "POST", body: { kind, data }
    });
  }

  verifyFlowJob(jobId, passed, evidence = {}, options = {}) {
    return this.request("/p/flow/jobs/" + encodeURIComponent(jobId) + "/verify", {
      ...options, method: "POST", body: { passed, evidence }
    });
  }

  completeFlowJob(jobId, result = {}, options = {}) {
    return this.request("/p/flow/jobs/" + encodeURIComponent(jobId) + "/complete", {
      ...options, method: "POST", body: { result }
    });
  }
}

export const createPhiMonitorClient = options => new PhiMonitorClient(options);
