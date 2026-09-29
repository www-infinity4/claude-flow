import{strict as assert}from"node:assert";import{browserJobStartupGate}from"./phi-runtime-bootstrap.js";
const noBrowser={browser:{configured:false,status:"unavailable"}};
const yesBrowser={browser:{configured:true,status:"host-session-supplied"}};
const channel={id:"cinemax-refill",repair_route:{handler:"channelCatalogWriter"},verification:{acceptanceChecks:["playback"]}};
assert.deepEqual(browserJobStartupGate(channel,noBrowser).runnable,false);
assert.equal(browserJobStartupGate(channel,noBrowser).reason,"browser-session-unavailable");
assert.equal(browserJobStartupGate(channel,yesBrowser).runnable,true);
assert.equal(browserJobStartupGate({id:"docs-only"},noBrowser).runnable,true);
