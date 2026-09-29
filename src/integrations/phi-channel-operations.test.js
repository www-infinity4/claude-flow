import { diagnoseChannelOperations, buildChannelRepairCandidate } from "./phi-channel-operations.js";

describe("Phi Channel Operations", () => {
  test("routes a restart loop to player writers and verifier", () => {
    const diagnosis = diagnoseChannelOperations({
      playbackSamples:[
        {currentTime:2,title:"Movie",src:"m.mp4"},
        {currentTime:15,title:"Movie",src:"m.mp4"},
        {currentTime:1,title:"Movie",src:"m.mp4",videoReady:true,audioActive:true}
      ],
      slots:[{id:"s",start:"2026-09-28T20:00:00Z",end:"2026-09-28T22:00:00Z",assetId:"m",title:"Movie"}],
      catalog:[{id:"m",title:"Movie"}],
      served:{assetId:"m",title:"Movie"},
      now:Date.parse("2026-09-28T21:00:00Z")
    });
    expect(diagnosis.domains).toContain("player");
    expect(diagnosis.routing.specialist_roles).toEqual(expect.arrayContaining(["frontend-writer","integration-writer","independent-verifier"]));
  });

  test("routes stale schedule/catalog separately", () => {
    const diagnosis = diagnoseChannelOperations({
      playbackSamples:[
        {currentTime:1,title:"Old",src:"old.mp4"},
        {currentTime:12,title:"Old",src:"old.mp4",videoReady:true,audioActive:true}
      ],
      slots:[{id:"s",start:"2026-09-28T20:00:00Z",end:"2026-09-28T22:00:00Z",assetId:"new",title:"New"}],
      catalog:[{id:"new",title:"New"}],
      served:{assetId:"old",title:"Old"},
      now:Date.parse("2026-09-28T21:00:00Z")
    });
    expect(diagnosis.domains).toContain("schedule");
    expect(diagnosis.routing.specialist_roles).toEqual(expect.arrayContaining(["schedule-sensor","backend-writer"]));
  });

  test("creates scanner-compatible repair candidate", () => {
    const diagnosis={defects:[{code:"playback-reset"}],routing:{priority:"production-broken",specialist_roles:["repo-reader","frontend-writer","independent-verifier"]}};
    const job=buildChannelRepairCandidate({channel:"Cartoon Network",repository:"www-infinity4/Cartoon-Network",diagnosis});
    expect(job.regression_group).toBe("channels");
    expect(job.acceptance_checks.length).toBeGreaterThan(3);
  });
});
