(function () {
  if (window.__KN_INBOX_WIDGET__) return;
  window.__KN_INBOX_WIDGET__ = true;

  const isMalay = /(^|\/)MS(\/|$)/i.test(location.pathname);
  const copy = isMalay ? {
    launcher:"Inbox Chat", title:"KasuhaNET Inbox", status:"Sokongan pelanggan",
    greeting:"Hai! Selamat datang ke KasuhaNET.",
    intro:"Ruang chat ini sedang disediakan. Chat ID akan dijana apabila sistem chat diaktifkan.",
    placeholder:"Taip mesej anda...", send:"Hantar",
    notReady:"Sistem chat belum disambungkan. Mesej ini belum dihantar.",
    close:"Tutup", minimize:"Kecilkan", maximize:"Besarkan", restore:"Pulihkan"
  } : {
    launcher:"Inbox Chat", title:"KasuhaNET Inbox", status:"Customer support",
    greeting:"Hello! Welcome to KasuhaNET.",
    intro:"This chat window is being prepared. Your Chat ID will be generated when the chat service is activated.",
    placeholder:"Type your message...", send:"Send",
    notReady:"Live chat is not connected yet. This message has not been sent.",
    close:"Close", minimize:"Minimize", maximize:"Maximize", restore:"Restore"
  };

  const style = document.createElement("style");
  style.id = "kn-inbox-chat-styles";
  style.textContent = `
    #knInboxLauncher{position:fixed;right:22px;bottom:96px;z-index:99990;display:flex;align-items:center;gap:10px;padding:11px 15px;border:1px solid rgba(0,240,255,.55);border-radius:14px;background:linear-gradient(135deg,#071522,#101827);color:#eafcff;font:600 13px/1.2 Inter,Arial,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.42),0 0 18px rgba(0,220,255,.14);cursor:pointer;transition:transform .2s,box-shadow .2s}
    #knInboxLauncher:hover{transform:translateY(-3px);box-shadow:0 10px 32px rgba(0,0,0,.5),0 0 22px rgba(0,220,255,.24)}
    #knInboxLauncher .kn-inbox-dot{width:9px;height:9px;border-radius:50%;background:#19e6c1;box-shadow:0 0 10px #19e6c1}
    #knInboxPanel{position:fixed;right:22px;bottom:158px;z-index:99991;width:min(350px,calc(100vw - 28px));height:440px;max-height:calc(100dvh - 185px);display:none;flex-direction:column;overflow:hidden;border:1px solid rgba(0,225,255,.42);border-radius:16px;background:#080f19;color:#eaf3ff;box-shadow:0 18px 55px rgba(0,0,0,.58),0 0 24px rgba(0,210,255,.12);font-family:Inter,Arial,sans-serif}
    #knInboxPanel.kn-open{display:flex;animation:knInboxIn .2s ease-out}
    @keyframes knInboxIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    #knInboxPanel .kn-inbox-head{display:flex;align-items:center;gap:10px;padding:13px 14px;background:linear-gradient(110deg,#071d2b,#111b2b);border-bottom:1px solid rgba(0,225,255,.2)}
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

  const launcher = document.createElement("button");
  launcher.id = "knInboxLauncher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", copy.launcher);
  launcher.innerHTML = '<span class="kn-inbox-dot"></span><span>' + copy.launcher + '</span>';

  const panel = document.createElement("section");
  panel.id = "knInboxPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", copy.title);
  panel.setAttribute("aria-modal", "false");
  panel.innerHTML = `
    <header class="kn-inbox-head">
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
      <div class="kn-inbox-id">CHAT ID<b>Will be generated</b></div>
    </div>
    <form class="kn-inbox-compose">
      <input type="text" maxlength="500" placeholder="${copy.placeholder}" aria-label="${copy.placeholder}">
      <button type="submit">${copy.send}</button>
    </form>
    <p class="kn-inbox-note" role="status">${copy.notReady}</p>
  `;

  document.body.append(launcher, panel);
  const maximizeButton = panel.querySelector('[data-action="maximize"]');
  const note = panel.querySelector(".kn-inbox-note");

  function openPanel(){panel.classList.add("kn-open");launcher.hidden=true;}
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
  panel.querySelector(".kn-inbox-compose").addEventListener("submit",function(e){
    e.preventDefault();
    note.style.display="block";
  });
})();