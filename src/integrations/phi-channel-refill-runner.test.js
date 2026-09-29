import{strict as assert}from"node:assert";import{runChannelCatalogRefill}from"./phi-channel-refill-runner.js";
const catalog='window.HERMIT_CATALOG = [\n'+Array.from({length:11},(_,i)=>'  { id:"MAX-SAFE-'+String(i+1).padStart(3,"0")+'", title:"Old '+i+'", runtimeSeconds:5400, videoId:"oldvideo'+String(i).padStart(3,"0")+'", cleared:true }').join(",\n")+'\n].map(movie => ({ ...movie, posterUrl:"" }));';
const discovery={search:async()=>[{title:"New Feature",videoId:"abcdefghijk",runtimeSeconds:5400,source:"YouTube",sourceUrl:"https://youtube.com/watch?v=abcdefghijk"}]};
const browser={navigate:async()=>({}),find:async()=>null,mediaTest:async()=>({playing:true,videoVisible:true,timeAdvancedSeconds:3}),evaluate:async()=>({loaded:true}),wait:async()=>{},console:async()=>[],screenshot:async()=>({})};
let wrote=false;
const out=await runChannelCatalogRefill({channel:"Cinemax",query:"feature",discovery,browser,runtimeUrl:"https://example.test/Cinemax/",catalogSource:catalog,indexSource:'<script src="data/catalog.js?v=old"></script>',peerCatalog:[],cacheStamp:"20260929-refill1",writeFiles:async x=>(wrote=true,{ok:true,...x}),verifyRegression:async()=>({passed:true})});
assert.equal(out.status,"verified");assert.equal(out.added,1);assert.equal(wrote,true);
await assert.rejects(()=>runChannelCatalogRefill({channel:"HBO",query:"x"}),/Unsupported/);
