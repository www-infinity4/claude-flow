/**
 * Enrich search-discovered channel media without treating discovery metadata as
 * runtime proof. Canonical provider IDs and normalized durations are produced
 * here; actual player admission remains a separate verification step.
 */
function text(v){ return String(v == null ? "" : v).trim(); }

export function parseDurationSeconds(value) {
  if (Number.isFinite(Number(value)) && Number(value) > 0) return Math.round(Number(value));
  const s=text(value);
  if (!s) return 0;
  const iso=s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) return (+iso[1]||0)*3600+(+iso[2]||0)*60+(+iso[3]||0);
  const parts=s.split(":").map(Number);
  if (parts.length>=2 && parts.every(Number.isFinite)) return parts.reduce((n,x)=>n*60+x,0);
  return 0;
}

export function identifyMediaSource(candidate={}) {
  const rawUrl=text(candidate.sourceUrl || candidate.url);
  const direct=text(candidate.videoId || candidate.sourceId);
  if (direct && /^[A-Za-z0-9_-]{6,15}$/.test(direct) && /youtube/i.test(text(candidate.source)+rawUrl))
    return { provider:"youtube", id:direct, canonicalUrl:`https://www.youtube.com/watch?v=${direct}` };

  try {
    const u=new URL(rawUrl);
    const host=u.hostname.replace(/^www\./,"").toLowerCase();
    if (host==="youtube.com" || host==="m.youtube.com") {
      const id=text(u.searchParams.get("v"));
      if (/^[A-Za-z0-9_-]{6,15}$/.test(id)) return {provider:"youtube",id,canonicalUrl:`https://www.youtube.com/watch?v=${id}`};
    }
    if (host==="youtu.be") {
      const id=text(u.pathname.split("/").filter(Boolean)[0]);
      if (/^[A-Za-z0-9_-]{6,15}$/.test(id)) return {provider:"youtube",id,canonicalUrl:`https://www.youtube.com/watch?v=${id}`};
    }
    if (host==="archive.org") {
      const m=u.pathname.match(/^\/details\/([^/?#]+)/);
      if (m) return {provider:"internet-archive",id:decodeURIComponent(m[1]),canonicalUrl:`https://archive.org/details/${m[1]}`};
    }
  } catch {}
  return {provider:"unknown",id:direct,canonicalUrl:rawUrl};
}

export async function enrichMediaCandidate(candidate, adapters={}) {
  const identity=identifyMediaSource(candidate);
  if (!identity.id || identity.provider==="unknown")
    return {...candidate,identity,enrichmentStatus:"rejected",rejectionReasons:["unresolved-provider-or-id"]};

  const adapter=adapters[identity.provider];
  let metadata={};
  if (adapter && typeof adapter.lookup==="function") metadata=await adapter.lookup(identity.id) || {};

  const title=text(metadata.title || candidate.title);
  const runtimeSeconds=parseDurationSeconds(metadata.runtimeSeconds || metadata.durationSeconds || metadata.duration || candidate.runtimeSeconds);
  const rejectionReasons=[];
  if (!title) rejectionReasons.push("missing-title");
  if (/\b(trailer|promo|clip|teaser)\b/i.test(title)) rejectionReasons.push("clip-or-promo");
  if (!runtimeSeconds) rejectionReasons.push("runtime-unresolved");
  if (runtimeSeconds && runtimeSeconds < 3600) rejectionReasons.push("too-short");
  if (runtimeSeconds > 7200) rejectionReasons.push("too-long");

  return {
    ...candidate,
    title,
    runtimeSeconds,
    videoId: identity.provider==="youtube" ? identity.id : text(candidate.videoId),
    archiveId: identity.provider==="internet-archive" ? identity.id : text(candidate.archiveId),
    sourceUrl: identity.canonicalUrl,
    identity,
    embeddable: metadata.embeddable === false ? false : null,
    runtimePlayable: null,
    enrichmentStatus: rejectionReasons.length ? "rejected" : "runtime-verification-required",
    rejectionReasons
  };
}

export async function enrichCatalogCandidates(candidates=[], adapters={}) {
  const enriched=[];
  for (const candidate of candidates) enriched.push(await enrichMediaCandidate(candidate,adapters));
  return {
    acceptedForRuntimeVerification: enriched.filter(x=>x.enrichmentStatus==="runtime-verification-required"),
    rejected: enriched.filter(x=>x.enrichmentStatus==="rejected")
  };
}
