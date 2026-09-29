/**
 * Browser verification provider for Phi agents.
 *
 * The host adapter may be agent-browser, Playwright, or a cloud browser.
 * This provider intentionally exposes observation/test primitives only.
 */
function need(value, name) {
  if (value === undefined || value === null || value === "") throw new TypeError(`${name} is required`);
  return value;
}

export function createPhiBrowserProvider(adapter) {
  need(adapter, "browser adapter");

  return {
    "browser.navigate": async ({ url, device = "android-mobile" }) => {
      need(url, "url");
      const result = await adapter.navigate({ url, device });
      return { url, device, ...result };
    },
    "browser.inspect": async ({ selector = null, interactive = true } = {}) =>
      adapter.snapshot({ selector, interactive }),
    "browser.screenshot": async ({ name = "phi-runtime", fullPage = true } = {}) =>
      adapter.screenshot({ name, fullPage }),
    "browser.console.read": async () => adapter.console(),
    "browser.media.test": async ({ selector, observeMs = 5000 }) => {
      need(selector, "selector");
      return adapter.mediaTest({ selector, observeMs });
    }
  };
}

export async function verifyMercuryCollectRuntime({ browser, runtimeUrl }) {
  need(browser, "browser capabilities");
  need(runtimeUrl, "runtimeUrl");

  const evidence = {
    runtime_url: runtimeUrl,
    checked_at: new Date().toISOString(),
    device_profile: "android-mobile",
    steps: [],
    observations: {}
  };

  evidence.steps.push(await browser.navigate({ url: runtimeUrl, device: "android-mobile" }));
  evidence.observations.before = await browser.snapshot({ interactive: true });

  const collect = await browser.find({ role: "button", name: "Collect" });
  if (!collect) return { passed: false, evidence, notes: "Collect button not found" };

  await browser.click(collect);
  evidence.steps.push({ action: "click", target: "Collect" });
  evidence.observations.afterCollect = await browser.snapshot({ interactive: true });

  const collected = await browser.find({ role: "button", name: "Collected" });
  const cartText = await browser.text({ selector: "body" });
  const mercuryVisible = /Mercury dime/i.test(cartText) && /100 Quants/i.test(cartText);
  const cartVisible = /Shop cart/i.test(cartText);

  evidence.observations.assertions = {
    collected_label: Boolean(collected),
    cart_visible: cartVisible,
    mercury_card_visible: mercuryVisible
  };
  evidence.observations.console_errors = await browser.console();
  evidence.observations.screenshot = await browser.screenshot({ name: "mercury-after-collect", fullPage: true });

  return {
    passed: Boolean(collected && cartVisible && mercuryVisible),
    evidence,
    notes: "This verifier does not submit checkout or perform a Quant transfer."
  };
}


export async function captureChannelPlaybackTrace({ browser, runtimeUrl, observeMs = 35000 }) {
  need(browser, "browser capabilities");
  need(runtimeUrl, "runtimeUrl");
  const evidence = {
    runtime_url: runtimeUrl,
    checked_at: new Date().toISOString(),
    device_profile: "android-mobile",
    observe_ms: observeMs,
    observations: {}
  };

  await browser.navigate({ url: runtimeUrl, device: "android-mobile" });
  const enter = await browser.find({ role:"button", name:/Enter Cartoon Network/i });
  if (enter) await browser.click(enter);
  await browser.wait({ ms: observeMs });

  evidence.observations.trace = await browser.evaluate(() =>
    Array.isArray(window.__INFINITY_PLAYBACK_TRACE) ? window.__INFINITY_PLAYBACK_TRACE.slice() : []
  );
  evidence.observations.player = await browser.mediaTest({ selector:"#player", observeMs:2000 });
  evidence.observations.console_errors = await browser.console();
  evidence.observations.screenshot = await browser.screenshot({ name:"cartoon-playback-trace", fullPage:true });

  return {
    passed: evidence.observations.trace.length > 0,
    evidence,
    notes: evidence.observations.trace.length ? "Playback authority trace captured." : "Runtime trace unavailable; do not claim the channel verified."
  };
}


export async function verifyChannelCandidateAdmission({
  browser,
  runtimeUrl,
  candidate,
  observeMs = 12000,
  playerSelector = "#player"
}) {
  need(browser, "browser capabilities");
  need(runtimeUrl, "runtimeUrl");
  need(candidate, "candidate");
  if (candidate.enrichmentStatus && candidate.enrichmentStatus !== "runtime-verification-required") {
    return { passed:false, candidate, admissionStatus:"rejected", notes:"Candidate did not pass enrichment." };
  }

  const identity = candidate.identity || {};
  const videoId = String(candidate.videoId || identity.id || "");
  if (!videoId) return { passed:false, candidate, admissionStatus:"rejected", notes:"Candidate has no playable provider ID." };

  const evidence = {
    runtime_url: runtimeUrl,
    checked_at: new Date().toISOString(),
    device_profile: "android-mobile",
    observe_ms: observeMs,
    candidate: { title:candidate.title, videoId, provider:identity.provider || candidate.source },
    observations: {}
  };

  await browser.navigate({ url: runtimeUrl, device:"android-mobile" });
  const enter = await browser.find({ role:"button", name:/Enter /i });
  if (enter) await browser.click(enter);

  evidence.observations.before = await browser.mediaTest({ selector:playerSelector, observeMs:1000 });

  const injection = await browser.evaluate(({ id }) => {
    const player = window.player || window.__INFINITY_PLAYER || null;
    if (!player || typeof player.loadVideoById !== "function") return { loaded:false, reason:"player-api-unavailable" };
    player.loadVideoById({ videoId:id, startSeconds:0 });
    return { loaded:true };
  }, { id:videoId });
  evidence.observations.injection = injection;
  if (!injection || !injection.loaded) {
    evidence.observations.console_errors = await browser.console();
    return { passed:false, candidate, admissionStatus:"needs_work", evidence, notes:"Runtime player API could not load candidate." };
  }

  await browser.wait({ ms:observeMs });
  const media = await browser.mediaTest({ selector:playerSelector, observeMs:3000 });
  evidence.observations.media = media;
  evidence.observations.console_errors = await browser.console();
  evidence.observations.screenshot = await browser.screenshot({ name:`candidate-${videoId}`, fullPage:true });

  const advanced = Number(media && (media.timeAdvancedSeconds ?? media.advanceSeconds ?? media.currentTimeDelta ?? 0));
  const hasVideo = media && (media.videoVisible === true || media.hasVideo === true || media.videoWidth > 0);
  const playing = media && (media.playing === true || media.state === "playing");
  const passed = Boolean(playing && hasVideo && advanced >= 2);

  return {
    passed,
    candidate,
    admissionStatus: passed ? "admitted-for-catalog-write" : "rejected-runtime",
    evidence,
    notes: passed
      ? "Candidate advanced with visible video in the actual channel player."
      : "Candidate failed timed playback/visible-video admission; do not write it to the catalog."
  };
}
