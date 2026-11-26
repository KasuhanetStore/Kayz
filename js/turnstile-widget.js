(function(){
  if(window.KN_Turnstile)return;
  const SITE_KEY="0x4AAAAAAGThYpCOsoizh7Te";
  let apiPromise=null;
  const states=new WeakMap();
  function loadApi(){
    if(window.turnstile)return Promise.resolve();
    if(apiPromise)return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      let script=document.querySelector('script[data-kn-turnstile-api]');
      if(!script){
        script=document.createElement("script");
        script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async=true;script.defer=true;script.dataset.knTurnstileApi="1";
        document.head.appendChild(script);
      }
      script.addEventListener("load",()=>window.turnstile?resolve():reject(new Error("Turnstile failed to initialise.")),{once:true});
      script.addEventListener("error",()=>reject(new Error("Turnstile could not load. Please refresh and try again.")),{once:true});
      if(window.turnstile)resolve();
    });
    return apiPromise;
  }
  async function render(container,action){
    if(!container)return null;
    let state=states.get(container);
    if(state?.id!==undefined)return state.id;
    state={id:undefined,token:"",waiters:[],action};states.set(container,state);
    try{
      await loadApi();
      if(state.id!==undefined)return state.id;
      state.id=window.turnstile.render(container,{
        sitekey:SITE_KEY,theme:"dark",appearance:"always",action,
        callback(token){state.token=token;container.dataset.token=token;state.waiters.splice(0).forEach(resolve=>resolve(token));},
        "expired-callback"(){state.token="";delete container.dataset.token;},
        "error-callback"(){state.token="";delete container.dataset.token;state.waiters.splice(0).forEach((_,i)=>{});}
      });
      return state.id;
    }catch(error){states.delete(container);throw error;}
  }
  function attachForm(form){
    if(!form||form.dataset.knTurnstileAttached==="1")return;
    const action=form.id==="knWorkshopPaymentForm"?"workshop_checkout":"checkout";
    const widget=document.createElement("div");
    widget.className="kn-turnstile-widget";
    widget.setAttribute("aria-label","Security verification");
    const submit=form.querySelector('button[type="submit"]');
    if(submit)form.insertBefore(widget,submit);else form.appendChild(widget);
    form.dataset.knTurnstileAttached="1";
    form.__knTurnstileWidget=widget;
    if("IntersectionObserver"in window){
      const observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();render(widget,action).catch(()=>{});}
      },{threshold:0.05});
      observer.observe(widget);
    }else render(widget,action).catch(()=>{});
  }
  function scan(root){
    if(root?.matches?.("form#knCheckoutForm,form#knWorkshopPaymentForm,form#knDualStreamPaymentForm"))attachForm(root);
    root?.querySelectorAll?.("form#knCheckoutForm,form#knWorkshopPaymentForm,form#knDualStreamPaymentForm").forEach(attachForm);
  }
  function getToken(form){
    const widget=form?.__knTurnstileWidget;
    if(!widget)return "";
    const state=states.get(widget);
    if(!state?.id||!window.turnstile)return "";
    try{return window.turnstile.getResponse(state.id)||"";}catch{return "";}
  }
  async function waitForToken(container,action){
    await render(container,action);
    const state=states.get(container);
    if(state?.token)return state.token;
    return new Promise((resolve,reject)=>{
      state.waiters.push(resolve);
      container.scrollIntoView?.({block:"nearest",behavior:"smooth"});
    });
  }
  window.KN_Turnstile={render,getToken,waitForToken,scan};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>scan(document),{once:true});else scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)scan(node);}))).observe(document.documentElement,{childList:true,subtree:true});
})();