/**
 * TV/radio runtime sensor.
 *
 * Samples a player over time and reports observable playback/schedule defects.
 * The browser adapter owns DOM/player access; this module owns diagnosis.
 */
export function diagnosePlaybackSamples(samples, { minAdvanceSeconds = 8, resetToleranceSeconds = 2 } = {}) {
  if (!Array.isArray(samples) || samples.length < 2) throw new TypeError("at least two playback samples are required");
  const defects = [];
  let advances = 0;
  let resets = 0;
  let titleChanges = 0;
  let sourceChanges = 0;

  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (Number.isFinite(a.currentTime) && Number.isFinite(b.currentTime)) {
      if (b.currentTime > a.currentTime + 0.25) advances++;
      if (b.currentTime + resetToleranceSeconds < a.currentTime) resets++;
    }
    if (a.title && b.title && a.title !== b.title) titleChanges++;
    if (a.src && b.src && a.src !== b.src) sourceChanges++;
  }

  const totalAdvance = (samples.at(-1)?.currentTime || 0) - (samples[0]?.currentTime || 0);
  if (resets > 0) defects.push({ code: "playback-reset", count: resets });
  if (totalAdvance < minAdvanceSeconds && advances < samples.length - 1) defects.push({ code: "playback-stalled", totalAdvance });
  if (titleChanges > 0 && sourceChanges === 0) defects.push({ code: "stale-or-flapping-title", count: titleChanges });
  if (sourceChanges > 0 && titleChanges === 0) defects.push({ code: "source-title-mismatch", count: sourceChanges });

  const last = samples.at(-1) || {};
  if (last.videoReady === false && last.audioActive === true) defects.push({ code: "audio-without-video" });
  if (last.expectedAssetId && last.assetId && last.expectedAssetId !== last.assetId) {
    defects.push({ code: "wrong-scheduled-asset", expected: last.expectedAssetId, actual: last.assetId });
  }
  if (last.expectedTitle && last.title && last.expectedTitle !== last.title) {
    defects.push({ code: "wrong-scheduled-title", expected: last.expectedTitle, actual: last.title });
  }

  return {
    passed: defects.length === 0,
    metrics: { samples: samples.length, advances, resets, titleChanges, sourceChanges, totalAdvance },
    defects
  };
}

export async function observeChannelPlayback({
  browser,
  runtimeUrl,
  channel,
  sampleCount = 6,
  intervalMs = 5000
}) {
  if (!browser || !runtimeUrl || !channel) throw new TypeError("browser, runtimeUrl and channel are required");
  await browser.navigate({ url: runtimeUrl, device: "android-mobile" });
  await browser.selectChannel(channel);

  const samples = [];
  for (let i = 0; i < sampleCount; i++) {
    samples.push(await browser.playerState({ channel }));
    if (i < sampleCount - 1) await browser.wait(intervalMs);
  }

  const diagnosis = diagnosePlaybackSamples(samples);
  return {
    ...diagnosis,
    evidence: {
      runtime_url: runtimeUrl,
      checked_at: new Date().toISOString(),
      device_profile: "android-mobile",
      channel,
      samples,
      console_errors: await browser.console(),
      screenshot: await browser.screenshot({ name: `channel-${channel}-playback`, fullPage: true })
    }
  };
}

export function compareChannelRegression(candidate, baseline) {
  const introduced = candidate.defects.filter(d => !baseline.defects.some(b => b.code === d.code));
  return {
    passed: candidate.passed && introduced.length === 0,
    introducedDefects: introduced,
    baselineDefects: baseline.defects,
    candidateDefects: candidate.defects
  };
}
