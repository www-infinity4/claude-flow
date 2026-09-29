import { inspectChannelSchedule, compareServedToScheduled } from "./phi-schedule-sensor.js";

describe("Phi schedule sensor", () => {
  const now = Date.parse("2026-09-28T20:30:00Z");

  test("finds gaps overlaps duplicates and missing catalog assets", () => {
    const slots = [
      { id:"a", start:"2026-09-28T19:00:00Z", end:"2026-09-28T20:00:00Z", assetId:"movie-1" },
      { id:"b", start:"2026-09-28T20:10:00Z", end:"2026-09-28T21:00:00Z", assetId:"movie-1" },
      { id:"c", start:"2026-09-28T20:50:00Z", end:"2026-09-28T22:00:00Z", assetId:"missing" }
    ];
    const result = inspectChannelSchedule(slots, [{id:"movie-1",title:"Movie One"}], {now});
    const codes = result.defects.map(x=>x.code);
    expect(codes).toEqual(expect.arrayContaining(["schedule-gap","schedule-overlap","consecutive-duplicate-asset","catalog-asset-missing"]));
  });

  test("flags stale served schedule and title", () => {
    const result = compareServedToScheduled({
      scheduled:{assetId:"new-2",title:"New Movie",scheduleVersion:"2026-09-28"},
      served:{assetId:"old-9",title:"Old Movie",scheduleVersion:"2026-09-27"}
    });
    expect(result.defects.map(x=>x.code)).toEqual(expect.arrayContaining(["served-wrong-asset","served-stale-title","stale-schedule-version"]));
  });

  test("accepts matching scheduled and served content", () => {
    const x={assetId:"m1",title:"Movie",scheduleVersion:"v2"};
    expect(compareServedToScheduled({scheduled:x,served:x}).passed).toBe(true);
  });
});
