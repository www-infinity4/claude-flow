/**
 * Media-source discovery adapter for Phi channel catalog refill.
 *
 * Discovery is intentionally separate from admission. Results from API-Phi,
 * SearXNG, YouTube or Internet Archive are candidates only until the channel
 * runtime verifier proves they are playable.
 */
function need(value, name) {
  if (value === undefined || value === null || value === "") throw new TypeError(`${name} is required`);
  return value;
}

function normalizeCandidate(item, provider) {
  const sourceId = String(item.videoId || item.sourceId || item.identifier || item.id || "").trim();
  const runtimeSeconds = Number(item.runtimeSeconds || item.durationSeconds || item.duration || 0);
  return {
    title: String(item.title || "").trim(),
    year: item.year == null ? null : Number(item.year),
    runtimeSeconds: Number.isFinite(runtimeSeconds) ? runtimeSeconds : 0,
    videoId: sourceId,
    source: String(item.source || provider || "").trim(),
    sourceUrl: String(item.sourceUrl || item.url || "").trim(),
    networkChannel: String(item.networkChannel || "").trim(),
    contentClass: String(item.contentClass || "").trim(),
    cleared: item.cleared === true,
    provider,
    discoveryMetadata: item.metadata || null
  };
}

function dedupe(candidates) {
  const seen = new Set();
  return candidates.filter(item => {
    const key = item.videoId || item.sourceUrl;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createMediaDiscoveryProvider(adapters = {}) {
  const available = Object.entries(adapters).filter(([, adapter]) => adapter && typeof adapter.search === "function");
  return {
    async search({ query, channel, limit = 30, providers = null }) {
      need(query, "query");
      const allowed = providers ? new Set(providers) : null;
      const results = [];
      for (const [name, adapter] of available) {
        if (allowed && !allowed.has(name)) continue;
        const response = await adapter.search({ query, channel, limit });
        const items = Array.isArray(response) ? response : (response && response.items) || [];
        for (const item of items) results.push(normalizeCandidate(item, name));
      }
      return dedupe(results).slice(0, limit);
    }
  };
}

export function filterCatalogCandidates(candidates = [], {
  existingCatalog = [],
  peerCatalog = [],
  minRuntimeSeconds = 3600,
  maxRuntimeSeconds = 7200
} = {}) {
  const existing = new Set(existingCatalog.map(x => x && (x.videoId || x.sourceId || x.id)).filter(Boolean));
  const peer = new Set(peerCatalog.map(x => x && (x.videoId || x.sourceId || x.id)).filter(Boolean));
  const accepted = [];
  const rejected = [];

  for (const item of candidates) {
    const reasons = [];
    if (!item.title) reasons.push("missing-title");
    if (!item.videoId && !item.sourceUrl) reasons.push("missing-source-id");
    if (!Number.isFinite(item.runtimeSeconds) || item.runtimeSeconds < minRuntimeSeconds) reasons.push("too-short");
    if (item.runtimeSeconds > maxRuntimeSeconds) reasons.push("too-long");
    if (existing.has(item.videoId)) reasons.push("duplicate-target");
    if (peer.has(item.videoId)) reasons.push("peer-overlap");
    if (/\b(trailer|promo|clip|teaser)\b/i.test(item.title)) reasons.push("clip-or-promo");
    (reasons.length ? rejected : accepted).push(reasons.length ? { candidate:item, reasons } : item);
  }
  return { accepted, rejected };
}

export async function discoverCatalogRefill({
  discovery, query, channel, existingCatalog = [], peerCatalog = [], limit = 30
}) {
  need(discovery, "discovery provider");
  const discovered = await discovery.search({ query, channel, limit });
  const filtered = filterCatalogCandidates(discovered, { existingCatalog, peerCatalog });
  return {
    channel,
    query,
    discovered: discovered.length,
    candidates: filtered.accepted,
    rejected: filtered.rejected,
    admissionStatus: "runtime-verification-required"
  };
}


export function createSearxngDiscoveryAdapter({
  endpoint = (typeof process !== "undefined" && process.env && process.env.SEARXNG_URL) || "https://orange-brook-a2ac.marvaseater.workers.dev",
  fetchImpl = globalThis.fetch
} = {}) {
  need(fetchImpl, "fetch implementation");
  const base = String(endpoint || "").replace(/\/$/, "");
  need(base, "SearXNG endpoint");

  return {
    async search({ query, channel, limit = 30 }) {
      const url = new URL(base + "/search");
      url.search = new URLSearchParams({
        q: [query, channel, "full movie"].filter(Boolean).join(" "),
        format: "json",
        categories: "videos",
        safesearch: "1"
      }).toString();
      const response = await fetchImpl(url, { headers:{ accept:"application/json" } });
      if (!response.ok) throw new Error(`SearXNG search failed: ${response.status}`);
      const payload = await response.json();
      return (Array.isArray(payload && payload.results) ? payload.results : []).slice(0, limit).map(item => ({
        title: item.title,
        sourceId: item.videoId || item.video_id || item.id || "",
        runtimeSeconds: item.runtimeSeconds || item.durationSeconds || item.duration || 0,
        source: item.engine || item.source || "SearXNG",
        sourceUrl: item.url || "",
        metadata: item
      }));
    }
  };
}

export function createDefaultPhiMediaDiscovery(options = {}) {
  return createMediaDiscoveryProvider({
    searxng: createSearxngDiscoveryAdapter(options)
  });
}
