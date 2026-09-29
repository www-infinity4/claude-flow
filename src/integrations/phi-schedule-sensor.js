/**
 * Phi schedule/catalog consistency sensor.
 * Pure diagnosis: it does not rewrite schedules or catalogs.
 */
function ms(value) {
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

export function inspectSchedule(slots, { now = Date.now() } = {}) {
  if (!Array.isArray(slots)) throw new TypeError("slots must be an array");
  const ordered = [...slots].sort((a,b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0));
  const defects = [];

  for (let i = 0; i < ordered.length; i++) {
    const slot = ordered[i];
    const start = ms(slot.start), end = ms(slot.end);
    if (start === null || end === null || end <= start) {
      defects.push({ code:"invalid-slot-time", slotId:slot.id ?? i });
      continue;
    }
    if (!slot.assetId) defects.push({ code:"slot-missing-asset", slotId:slot.id ?? i });
    if (i) {
      const prev = ordered[i-1], prevEnd = ms(prev.end);
      if (prevEnd !== null && start > prevEnd) defects.push({ code:"schedule-gap", after:prev.id ?? i-1, before:slot.id ?? i, milliseconds:start-prevEnd });
      if (prevEnd !== null && start < prevEnd) defects.push({ code:"schedule-overlap", first:prev.id ?? i-1, second:slot.id ?? i, milliseconds:prevEnd-start });
      if (prev.assetId && slot.assetId && prev.assetId === slot.assetId) defects.push({ code:"consecutive-duplicate-asset", assetId:slot.assetId });
    }
  }

  const active = ordered.find(slot => {
    const start=ms(slot.start), end=ms(slot.end);
    return start !== null && end !== null && start <= now && now < end;
  }) || null;

  if (!active) defects.push({ code:"no-active-slot" });
  return { passed:defects.length===0, activeSlot:active, defects, slots:ordered.length };
}

export function compareScheduleToCatalog(scheduleResult, catalog) {
  const defects = [...scheduleResult.defects];
  const byId = new Map((catalog || []).map(x => [x.id, x]));
  for (const slot of scheduleResult._slots || []) {
    if (slot.assetId && !byId.has(slot.assetId)) defects.push({ code:"catalog-asset-missing", assetId:slot.assetId, slotId:slot.id ?? null });
  }
  const active = scheduleResult.activeSlot;
  const activeAsset = active?.assetId ? byId.get(active.assetId) : null;
  if (active?.assetId && !activeAsset) defects.push({ code:"active-catalog-asset-missing", assetId:active.assetId });
  return { passed:defects.length===0, activeSlot:active, activeAsset:activeAsset || null, defects };
}

export function inspectChannelSchedule(slots, catalog, options = {}) {
  const schedule = inspectSchedule(slots, options);
  schedule._slots = [...slots];
  const result = compareScheduleToCatalog(schedule, catalog);
  delete schedule._slots;
  return result;
}

export function compareServedToScheduled({ scheduled, served }) {
  const defects = [];
  if (!scheduled) defects.push({ code:"scheduled-slot-unavailable" });
  if (!served) defects.push({ code:"served-state-unavailable" });
  if (scheduled && served) {
    if (scheduled.assetId && served.assetId && scheduled.assetId !== served.assetId) defects.push({ code:"served-wrong-asset", expected:scheduled.assetId, actual:served.assetId });
    if (scheduled.title && served.title && scheduled.title !== served.title) defects.push({ code:"served-stale-title", expected:scheduled.title, actual:served.title });
    if (scheduled.scheduleVersion && served.scheduleVersion && scheduled.scheduleVersion !== served.scheduleVersion) defects.push({ code:"stale-schedule-version", expected:scheduled.scheduleVersion, actual:served.scheduleVersion });
  }
  return { passed:defects.length===0, defects };
}


export function inspectCatalogFreshness(catalog = [], peerCatalogs = [], { minUniqueAssets = 12, maxPeerOverlapRatio = 0.5 } = {}) {
  const ids = new Set((catalog || []).map(x => x && (x.videoId || x.assetId || x.id)).filter(Boolean));
  const defects = [];
  if (ids.size < minUniqueAssets) defects.push({ code:"catalog-too-shallow", uniqueAssets:ids.size, minimum:minUniqueAssets });

  const peerResults = (peerCatalogs || []).map(peer => {
    const peerIds = new Set(((peer && peer.catalog) || []).map(x => x && (x.videoId || x.assetId || x.id)).filter(Boolean));
    const overlap = [...ids].filter(id => peerIds.has(id));
    const ratio = ids.size ? overlap.length / ids.size : 0;
    if (ratio > maxPeerOverlapRatio) defects.push({ code:"catalog-peer-overlap", peer:peer && peer.name, overlap:overlap.length, ratio });
    return { peer:peer && peer.name, overlap:overlap.length, ratio };
  });

  return { passed:defects.length===0, defects, metrics:{ uniqueAssets:ids.size, peerResults } };
}
