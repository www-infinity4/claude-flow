import { strict as assert } from "node:assert";
import { createMediaDiscoveryProvider, filterCatalogCandidates, discoverCatalogRefill } from "./phi-media-discovery-provider.js";

const discovery = createMediaDiscoveryProvider({
  youtube: { search: async () => [
    { title:"Full Feature", videoId:"new-full-1", runtimeSeconds:5400, source:"YouTube" },
    { title:"Full Feature Trailer", videoId:"trailer-1", runtimeSeconds:120, source:"YouTube" }
  ]},
  archive: { search: async () => [
    { title:"Archive Feature", identifier:"archive-full-2", runtimeSeconds:6000, source:"Internet Archive" }
  ]}
});

const found = await discovery.search({ query:"full movie", channel:"Cinemax" });
assert.equal(found.length, 3);

const filtered = filterCatalogCandidates(found, {
  existingCatalog:[{ videoId:"existing" }],
  peerCatalog:[{ videoId:"archive-full-2" }]
});
assert.deepEqual(filtered.accepted.map(x => x.videoId), ["new-full-1"]);
assert(filtered.rejected.some(x => x.reasons.includes("too-short")));
assert(filtered.rejected.some(x => x.reasons.includes("peer-overlap")));

const refill = await discoverCatalogRefill({
  discovery,
  query:"full movie",
  channel:"Cinemax",
  peerCatalog:[{ videoId:"archive-full-2" }]
});
assert.equal(refill.admissionStatus, "runtime-verification-required");
assert.equal(refill.candidates.length, 1);
