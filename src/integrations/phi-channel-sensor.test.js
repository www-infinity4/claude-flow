import { diagnosePlaybackSamples, compareChannelRegression } from "./phi-channel-sensor.js";

describe("Phi channel sensor", () => {
  test("detects restart loop and flapping title", () => {
    const result = diagnosePlaybackSamples([
      { currentTime: 1, title: "Monsters", src: "movie.mp4", videoReady: true },
      { currentTime: 12, title: "Pretty Outrageous", src: "movie.mp4", videoReady: true },
      { currentTime: 2, title: "Monsters", src: "movie.mp4", videoReady: true }
    ]);
    expect(result.passed).toBe(false);
    expect(result.defects.map(x => x.code)).toContain("playback-reset");
    expect(result.defects.map(x => x.code)).toContain("stale-or-flapping-title");
  });

  test("detects audio without video", () => {
    const result = diagnosePlaybackSamples([
      { currentTime: 0, title: "HBO", src: "a.mp4" },
      { currentTime: 10, title: "HBO", src: "a.mp4", audioActive: true, videoReady: false }
    ]);
    expect(result.defects.map(x => x.code)).toContain("audio-without-video");
  });

  test("detects wrong scheduled content", () => {
    const result = diagnosePlaybackSamples([
      { currentTime: 1, title: "Old movie", src: "old.mp4" },
      { currentTime: 12, title: "Old movie", src: "old.mp4", assetId: "old", expectedAssetId: "new", expectedTitle: "New movie" }
    ]);
    expect(result.defects.map(x => x.code)).toEqual(expect.arrayContaining(["wrong-scheduled-asset", "wrong-scheduled-title"]));
  });

  test("preserves a clean baseline", () => {
    const baseline = { passed: true, defects: [] };
    const candidate = diagnosePlaybackSamples([
      { currentTime: 2, title: "Movie", src: "movie.mp4" },
      { currentTime: 12, title: "Movie", src: "movie.mp4", videoReady: true, audioActive: true }
    ]);
    expect(compareChannelRegression(candidate, baseline).passed).toBe(true);
  });
});
