import { strict as assert } from "node:assert";
import { parseDurationSeconds, identifyMediaSource, enrichMediaCandidate, enrichCatalogCandidates } from "./phi-media-enrichment.js";

assert.equal(parseDurationSeconds("PT1H32M10S"),5530);
assert.equal(parseDurationSeconds("1:32:10"),5530);
assert.deepEqual(identifyMediaSource({sourceUrl:"https://youtu.be/abcdefghijk"}),{provider:"youtube",id:"abcdefghijk",canonicalUrl:"https://www.youtube.com/watch?v=abcdefghijk"});
assert.equal(identifyMediaSource({sourceUrl:"https://archive.org/details/sample_feature"}).provider,"internet-archive");

const ok=await enrichMediaCandidate(
  {title:"Feature Film",sourceUrl:"https://www.youtube.com/watch?v=abcdefghijk"},
  {youtube:{lookup:async()=>({title:"Feature Film",duration:"PT1H40M",embeddable:true})}}
);
assert.equal(ok.runtimeSeconds,6000);
assert.equal(ok.enrichmentStatus,"runtime-verification-required");
assert.equal(ok.runtimePlayable,null);

const trailer=await enrichMediaCandidate({title:"Movie Trailer",sourceUrl:"https://youtu.be/abcdefghijk",runtimeSeconds:120});
assert.equal(trailer.enrichmentStatus,"rejected");
assert(trailer.rejectionReasons.includes("clip-or-promo"));
assert(trailer.rejectionReasons.includes("too-short"));

const set=await enrichCatalogCandidates([
  {title:"Long Film",sourceUrl:"https://youtu.be/abcdefghijk",runtimeSeconds:5400},
  {title:"Mystery",sourceUrl:"https://example.com/video"}
]);
assert.equal(set.acceptedForRuntimeVerification.length,1);
assert.equal(set.rejected.length,1);
