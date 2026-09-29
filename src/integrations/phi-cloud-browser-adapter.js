/**
 * Adapter for a host-controlled cloud/agent browser session.
 * The host must supply the actual browser implementation; this file does not
 * claim a session exists merely because the adapter contract is present.
 */
function req(v,n){if(!v)throw new TypeError(n+" is required");return v;}
export function cloudBrowserAdapter(session){
 req(session,"cloud browser session");
 const call=(name,args)=>{const fn=session[name];if(typeof fn!=="function")throw new Error("cloud browser capability unavailable: "+name);return fn.call(session,args);};
 return{
  navigate:({url,device})=>call("navigate",{url,device}),
  snapshot:({selector,interactive})=>call("snapshot",{selector,interactive}),
  screenshot:({name,fullPage})=>call("screenshot",{name,fullPage}),
  console:()=>call("console",{}),
  mediaTest:({selector,observeMs})=>call("mediaTest",{selector,observeMs}),
  find:args=>call("find",args),
  click:target=>call("click",target),
  wait:({ms})=>call("wait",{ms}),
  text:({selector})=>call("text",{selector}),
  evaluate:(fn,arg)=>call("evaluate",{fn:String(fn),arg})
 };
}

export function browserCapabilitiesFromSession(session){
 const adapter=cloudBrowserAdapter(session);
 return{
  navigate:adapter.navigate,snapshot:adapter.snapshot,screenshot:adapter.screenshot,
  console:adapter.console,mediaTest:adapter.mediaTest,find:adapter.find,click:adapter.click,
  wait:adapter.wait,text:adapter.text,evaluate:adapter.evaluate
 };
}
