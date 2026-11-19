(function () {
  if (window.__KN_INBOX_WIDGET__) return;
  window.__KN_INBOX_WIDGET__ = true;

  const isMalay = /(^|\/)MS(\/|$)/i.test(location.pathname);
  const copy = isMalay ? {
    launcher:"Live Chat Support", title:"Live Chat Support", status:"Sokongan pelanggan",
    greeting:"Hai! Selamat datang ke KasuhaNET.",
    intro:"Mesej anda akan dihantar terus kepada pasukan sokongan KasuhaNET.",
    placeholder:"Taip mesej anda...", send:"Hantar",
    notReady:"Tidak dapat menghantar mesej. Sila cuba semula.",
    close:"Tutup", minimize:"Kecilkan", maximize:"Besarkan", restore:"Pulihkan"
  } : {
    launcher:"Live Chat Support", title:"Live Chat Support", status:"Customer support",
    greeting:"Hello! Welcome to KasuhaNET.",
    intro:"Your messages will be sent to the KasuhaNET support team.",
    placeholder:"Type your message...", send:"Send",
    notReady:"Unable to send your message. Please try again.",
    close:"Close", minimize:"Minimize", maximize:"Maximize", restore:"Restore"
  };

  const style = document.createElement("style");
  style.id = "kn-inbox-chat-styles";
  style.textContent = `
    #knInboxLauncher{position:fixed;right:22px;bottom:96px;z-index:99990;display:flex;align-items:center;gap:10px;padding:11px 15px;border:1px solid rgba(0,240,255,.55);border-radius:14px;background:linear-gradient(135deg,#071522,#101827);color:#eafcff;font:600 13px/1.2 Inter,Arial,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.42),0 0 18px rgba(0,220,255,.14);cursor:pointer;transition:transform .2s,box-shadow .2s}
    #knInboxLauncher:hover{transform:translateY(-3px);box-shadow:0 10px 32px rgba(0,0,0,.5),0 0 22px rgba(0,220,255,.24)}
    .whatsapp-float,#floating-whatsapp,#whatsapp-float,.floating-whatsapp,.float-whatsapp,a.whatsapp-float{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
    #knInboxLauncher .kn-inbox-dot{width:9px;height:9px;border-radius:50%;background:#19e6c1;box-shadow:0 0 10px #19e6c1}
    #knInboxPanel{position:fixed;right:22px;bottom:158px;z-index:99991;width:min(350px,calc(100vw - 28px));height:440px;max-height:calc(100dvh - 185px);display:none;flex-direction:column;overflow:hidden;border:1px solid rgba(0,225,255,.42);border-radius:16px;background:#080f19;color:#eaf3ff;box-shadow:0 18px 55px rgba(0,0,0,.58),0 0 24px rgba(0,210,255,.12);font-family:Inter,Arial,sans-serif}
    #knInboxPanel.kn-open{display:flex;animation:knInboxIn .2s ease-out}
    @keyframes knInboxIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    #knInboxPanel .kn-inbox-head{display:flex;align-items:center;gap:10px;padding:13px 14px;background:linear-gradient(110deg,#071d2b,#111b2b);border-bottom:1px solid rgba(0,225,255,.2)}
    #knInboxPanel .kn-inbox-logo{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border:1px solid rgba(0,225,255,.35);border-radius:11px;background:rgba(0,220,255,.1);color:#00eaff;box-shadow:0 0 14px rgba(0,220,255,.12)}
    #knInboxPanel .kn-inbox-logo svg{width:22px;height:22px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #knInboxPanel .kn-inbox-brand{min-width:0;flex:1}
    #knInboxPanel .kn-inbox-title{margin:0;color:#00eaff;font-size:14px;font-weight:800;letter-spacing:.25px}
    #knInboxPanel .kn-inbox-status{display:flex;align-items:center;gap:6px;margin-top:4px;color:#9eafc2;font-size:10px}
    #knInboxPanel .kn-inbox-status:before{content:"";width:6px;height:6px;border-radius:50%;background:#f0b44b}
    #knInboxPanel .kn-inbox-actions{display:flex;gap:5px}
    #knInboxPanel .kn-inbox-actions button{width:29px;height:29px;border:1px solid rgba(255,255,255,.13);border-radius:7px;background:rgba(255,255,255,.05);color:#eaf3ff;font-size:17px;line-height:1;cursor:pointer}
    #knInboxPanel .kn-inbox-actions button:hover{border-color:#00eaff;color:#00eaff}
    #knInboxPanel .kn-inbox-body{flex:1;overflow:auto;padding:17px 14px;background:radial-gradient(ellipse at top left,rgba(0,210,255,.07),transparent 58%)}
    #knInboxPanel .kn-inbox-welcome{padding:13px;border:1px solid rgba(0,225,255,.17);border-radius:12px;background:rgba(12,27,42,.88)}
    #knInboxPanel .kn-inbox-welcome strong{display:block;margin-bottom:7px;color:#f2fbff;font-size:13px}
    #knInboxPanel .kn-inbox-welcome p{margin:0;color:#aab9ca;font-size:12px;line-height:1.6}
    #knInboxPanel .kn-inbox-id{margin-top:12px;padding:10px 11px;border:1px dashed rgba(0,225,255,.28);border-radius:9px;color:#93a9bb;font-size:11px;text-align:center}
    #knInboxPanel .kn-inbox-id b{display:block;margin-top:4px;color:#00eaff;font-size:13px;letter-spacing:1px}
    #knInboxPanel .kn-inbox-messages{display:flex;flex-direction:column;gap:8px;margin-top:12px}
    #knInboxPanel .kn-inbox-message{max-width:88%;padding:9px 11px;border-radius:11px;background:#142638;color:#eaf3ff;font-size:12px;line-height:1.5;overflow-wrap:anywhere;white-space:pre-wrap}
    #knInboxPanel .kn-inbox-message.kn-mine{align-self:flex-end;background:#063c50;border:1px solid rgba(0,225,255,.22)}
    #knInboxPanel .kn-inbox-message.kn-admin{align-self:flex-start}
    #knInboxPanel .kn-inbox-compose{display:flex;gap:7px;padding:11px;border-top:1px solid rgba(0,225,255,.16);background:#0b1420}
    #knInboxPanel .kn-inbox-compose input{min-width:0;flex:1;padding:10px 11px;border:1px solid rgba(255,255,255,.14);border-radius:9px;outline:none;background:#101e2c;color:#fff;font:12px Inter,Arial,sans-serif}
    #knInboxPanel .kn-inbox-compose input:focus{border-color:#00dff5}
    #knInboxPanel .kn-inbox-compose button{padding:0 13px;border:0;border-radius:9px;background:linear-gradient(135deg,#00d9f5,#087da8);color:#03121b;font-size:11px;font-weight:800;cursor:pointer}
    #knInboxPanel .kn-inbox-note{display:none;margin:0;padding:0 12px 10px;color:#ffc978;background:#0b1420;font-size:10px;line-height:1.4}
    #knInboxPanel.kn-maximized{inset:16px!important;right:16px!important;bottom:16px!important;width:auto!important;height:auto!important;max-height:none!important;border-radius:15px}
    #knInboxPanel.kn-maximized .kn-inbox-body{padding:24px}
    @media(max-width:600px){
      #knInboxLauncher{right:14px;bottom:88px;padding:10px 13px}
      #knInboxPanel{right:10px;bottom:148px;width:calc(100vw - 20px);height:min(480px,calc(100dvh - 170px));max-height:calc(100dvh - 170px)}
      #knInboxPanel.kn-maximized{inset:0!important;border-radius:0}
    }
    @media(prefers-reduced-motion:reduce){#knInboxPanel.kn-open{animation:none}#knInboxLauncher{transition:none}}
  `;
  document.head.appendChild(style);

  // Remove only the floating WhatsApp shortcut; keep normal WhatsApp links elsewhere.
  function hideWhatsAppFloat(){
    document.querySelectorAll('.whatsapp-float,#floating-whatsapp,#whatsapp-float,.floating-whatsapp,.float-whatsapp').forEach(function(node){
      node.style.setProperty('display','none','important');
      node.style.setProperty('visibility','hidden','important');
      node.setAttribute('aria-hidden','true');
    });
  }
  hideWhatsAppFloat();
  if(document.body){
    new MutationObserver(hideWhatsAppFloat).observe(document.body,{childList:true,subtree:true});
  }

  const launcher = document.createElement("button");
  launcher.id = "knInboxLauncher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", copy.launcher);
  launcher.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5Z"/></svg><span>' + copy.launcher + '</span>';

  const panel = document.createElement("section");
  panel.id = "knInboxPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", copy.title);
  panel.setAttribute("aria-modal", "false");
  panel.innerHTML = `
    <header class="kn-inbox-head">
      <div class="kn-inbox-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5Z"/><path d="M8 10h8M8 14h5"/></svg></div>
      <div class="kn-inbox-brand">
        <h2 class="kn-inbox-title">${copy.title}</h2>
        <div class="kn-inbox-status">${copy.status}</div>
      </div>
      <div class="kn-inbox-actions">
        <button type="button" data-action="minimize" aria-label="${copy.minimize}" title="${copy.minimize}">−</button>
        <button type="button" data-action="maximize" aria-label="${copy.maximize}" title="${copy.maximize}">□</button>
        <button type="button" data-action="close" aria-label="${copy.close}" title="${copy.close}">×</button>
      </div>
    </header>
    <div class="kn-inbox-body">
      <div class="kn-inbox-welcome">
        <strong>${copy.greeting}</strong>
        <p>${copy.intro}</p>
      </div>
      <div class="kn-inbox-id">CHAT ID <b id="knInboxChatId">Connecting...</b></div>
      <div class="kn-inbox-messages" id="knInboxMessages" aria-live="polite"></div>
    </div>
    <form class="kn-inbox-compose">
      <input type="text" maxlength="500" placeholder="${copy.placeholder}" aria-label="${copy.placeholder}" autocomplete="off" disabled>
      <button type="submit" disabled>${copy.send}</button>
    </form>
    <p class="kn-inbox-note" role="status">${copy.notReady}</p>
  `;

  document.body.append(launcher, panel);
  const maximizeButton = panel.querySelector('[data-action="maximize"]');
  const note = panel.querySelector(".kn-inbox-note");
  const chatIdNode = panel.querySelector("#knInboxChatId");
  const messagesNode = panel.querySelector("#knInboxMessages");
  const form = panel.querySelector(".kn-inbox-compose");
  const messageInput = form.querySelector("input");
  const sendButton = form.querySelector("button");
  const storageKey = "kn_inbox_session_v1";
  let session = null;
  let pollHandle = null;
  const renderedIds = new Set();

  function showMessage(item){
    if(!item || renderedIds.has(item.id)) return;
    renderedIds.add(item.id);
    const bubble=document.createElement("div");
    bubble.className="kn-inbox-message "+(item.sender==="buyer"?"kn-mine":"kn-admin");
    bubble.textContent=item.message;
    messagesNode.appendChild(bubble);
    const body=panel.querySelector(".kn-inbox-body");
    body.scrollTop=body.scrollHeight;
  }
  async function pollMessages(){
    if(!session) return;
    try{
      const response=await fetch("/api/chat/messages?chatId="+encodeURIComponent(session.chatId),{
        headers:{Authorization:"Bearer "+session.sessionToken},cache:"no-store"
      });
      if(response.status===401) return;
      if(!response.ok) return;
      const data=await response.json();
      (data.messages||[]).forEach(showMessage);
    }catch{}
  }
  async function connectChat(){
    if(session) return;
    chatIdNode.textContent="Connecting...";
    try{
      const saved=localStorage.getItem(storageKey);
      if(saved){
        const parsed=JSON.parse(saved);
        if(parsed && /^KN-[A-F0-9]{10}$/.test(parsed.chatId) && /^[a-f0-9]{64}$/.test(parsed.sessionToken)){
          session=parsed;
          const check=await fetch("/api/chat/messages?chatId="+encodeURIComponent(session.chatId),{
            headers:{Authorization:"Bearer "+session.sessionToken},cache:"no-store"
          });
          if(check.ok){
            chatIdNode.textContent=session.chatId;
            messageInput.disabled=false;sendButton.disabled=false;
            const data=await check.json();(data.messages||[]).forEach(showMessage);
            pollHandle=setInterval(pollMessages,5000);
            return;
          }
        }
        localStorage.removeItem(storageKey);
        session=null;
      }
      const response=await fetch("/api/chat/start",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const data=await response.json();
      if(!response.ok || !data.chatId || !data.sessionToken) throw new Error("Chat setup failed");
      session={chatId:data.chatId,sessionToken:data.sessionToken};
      localStorage.setItem(storageKey,JSON.stringify(session));
      chatIdNode.textContent=session.chatId;
      messageInput.disabled=false;sendButton.disabled=false;
      pollHandle=setInterval(pollMessages,5000);
    }catch{
      chatIdNode.textContent="Unavailable";
      note.textContent=copy.notReady;note.style.display="block";
    }
  }
  function openPanel(){panel.classList.add("kn-open");launcher.hidden=true;connectChat();}
  function closePanel(){panel.classList.remove("kn-open","kn-maximized");launcher.hidden=false;maximizeButton.textContent="□";maximizeButton.title=copy.maximize;}
  function toggleMaximize(){
    const maximized=panel.classList.toggle("kn-maximized");
    maximizeButton.textContent=maximized?"❐":"□";
    maximizeButton.title=maximized?copy.restore:copy.maximize;
  }
  launcher.addEventListener("click",openPanel);
  panel.querySelector('[data-action="close"]').addEventListener("click",closePanel);
  panel.querySelector('[data-action="minimize"]').addEventListener("click",closePanel);
  maximizeButton.addEventListener("click",toggleMaximize);
  form.addEventListener("submit",async function(e){
    e.preventDefault();
    const message=messageInput.value.trim();
    if(!message || !session) return;
    sendButton.disabled=true;
    try{
      const response=await fetch("/api/chat/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.sessionToken},
        body:JSON.stringify({chatId:session.chatId,message})
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Message failed");
      messageInput.value="";
      await pollMessages();
      note.style.display="none";
    }catch(error){
      note.textContent=error.message||copy.notReady;
      note.style.display="block";
    }finally{sendButton.disabled=false;}
  });
})();