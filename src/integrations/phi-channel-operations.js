import { diagnosePlaybackSamples } from "./phi-channel-sensor.js";
import { inspectChannelSchedule, compareServedToScheduled } from "./phi-schedule-sensor.js";

const PLAYER_CODES = new Set(["playback-reset","playback-stalled","stale-or-flapping-title","source-title-mismatch","audio-without-video"]);
const SCHEDULE_CODES = new Set(["schedule-gap","schedule-overlap","no-active-slot","served-wrong-asset","served-stale-title","stale-schedule-version"]);
const CATALOG_CODES = new Set(["slot-missing-asset","catalog-asset-missing","active-catalog-asset-missing","consecutive-duplicate-asset"]);

export function diagnoseChannelOperations({ playbackSamples, slots, catalog, served, now = Date.now(), deployment = null }) {
  const playback = diagnosePlaybackSamples(playbackSamples);
  const schedule = inspectChannelSchedule(slots, catalog, { now });
  const servedCheck = compareServedToScheduled({ scheduled: schedule.activeSlot, served });
  const defects = [...playback.defects, ...schedule.defects, ...servedCheck.defects];

  const codes = new Set(defects.map(x => x.code));
  const domains = [];
  if ([...codes].some(x => PLAYER_CODES.has(x))) domains.push("player");
  if ([...codes].some(x => SCHEDULE_CODES.has(x))) domains.push("schedule");
  if ([...codes].some(x => CATALOG_CODES.has(x))) domains.push("catalog");

  if (deployment?.sourceCommit && deployment?.liveCommit && deployment.sourceCommit !== deployment.liveCommit) {
    defects.push({ code:"deployment-behind-source", sourceCommit:deployment.sourceCommit, liveCommit:deployment.liveCommit });
    domains.push("deployment");
  }

  const uniqueDomains = [...new Set(domains)];
  return {
    passed: defects.length === 0,
    defects,
    domains: uniqueDomains,
    routing: routeChannelDefects(uniqueDomains, defects),
    evidence: { playback, schedule, servedCheck, deployment }
  };
}

export function routeChannelDefects(domains, defects = []) {
  const roles = ["repo-reader"];
  if (domains.includes("player")) roles.push("ui-sensor","media-sensor","frontend-writer","integration-writer");
  if (domains.includes("schedule")) roles.push("schedule-sensor","backend-writer","integration-writer");
  if (domains.includes("catalog")) roles.push("data-sensor","catalog-writer");
  if (domains.includes("deployment")) roles.push("runtime-sensor");
  if (roles.some(x => x.endsWith("-writer"))) roles.push("independent-verifier");

  return {
    specialist_roles:[...new Set(roles)],
    regression_group:"channels",
    priority: defects.some(x => ["playback-reset","audio-without-video","served-wrong-asset"].includes(x.code))
      ? "production-broken" : "shared-runtime"
  };
}

export function buildChannelRepairCandidate({ channel, repository, runtimeTarget, diagnosis, requirementSource }) {
  if (!channel || !repository || !diagnosis) throw new TypeError("channel, repository and diagnosis are required");
  return {
    job_key:`${repository}:${channel}:channel-operations`.toLowerCase().replace(/[^a-z0-9:.-]+/g,"-"),
    requirement_source:requirementSource || "runtime-channel-operations",
    requirement_text:`Repair and independently verify ${channel} channel defects: ${diagnosis.defects.map(x=>x.code).join(", ") || "none"}.`,
    repository_full_name:repository,
    runtime_target:runtimeTarget || channel,
    classification:"active-site",
    priority:diagnosis.routing.priority,
    specialist_roles:diagnosis.routing.specialist_roles,
    acceptance_checks:[
      "Scheduled active asset matches the asset served by the player.",
      "Title metadata matches the scheduled asset and remains stable during playback.",
      "Playback advances without unexpected restart or stall.",
      "Video and audio are both available when the scheduled asset contains both.",
      "No new regression is introduced on channels sharing the same player/schedule structure."
    ],
    regression_group:"channels",
    risk:"low-reversible",
    authorization_required:false,
    evidence_required:["before playback samples","schedule/catalog comparison","repair commit SHA if changed","after playback samples","shared-channel regression result","independent verifier result"]
  };
}
