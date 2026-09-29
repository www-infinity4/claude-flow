export async function verifyChannelRegression({browser,runtimeUrl,channel,observeMs=12000}){
 if(!browser||!runtimeUrl)throw new TypeError("browser and runtimeUrl are required");
 const evidence={channel,runtimeUrl,checkedAt:new Date().toISOString(),device:"android-mobile",observations:{}};
 await browser.navigate({url:runtimeUrl,device:"android-mobile"});
 const enter=await browser.find({role:"button",name:/Enter /i});if(enter)await browser.click(enter);
 const first=await browser.mediaTest({selector:"#player",observeMs:2000});
 await browser.wait({ms:observeMs});
 const second=await browser.mediaTest({selector:"#player",observeMs:3000});
 const body=await browser.text({selector:"body"});
 const errors=await browser.console();
 const shot=await browser.screenshot({name:String(channel||"channel").toLowerCase()+"-post-refill",fullPage:true});
 evidence.observations={first,second,titleText:String(body||"").slice(0,4000),console_errors:errors,screenshot:shot};
 const advanced=Number(second?.timeAdvancedSeconds??second?.advanceSeconds??second?.currentTimeDelta??0);
 const playing=second?.playing===true||second?.state==="playing";
 const visible=second?.videoVisible===true||second?.hasVideo===true||Number(second?.videoWidth)>0;
 const severe=(Array.isArray(errors)?errors:[]).filter(x=>/uncaught|fatal|media.*error|not allowed/i.test(String(x)));
 const passed=Boolean(playing&&visible&&advanced>=2&&!severe.length);
 return{passed,evidence,notes:passed?"Post-refill channel playback regression passed.":"Post-refill playback regression failed; keep job needs_work."};
}
