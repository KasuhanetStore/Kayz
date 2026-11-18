const PACKAGES = {
  "landing-page": { name: "KasuhaNET Landing Page Package", amount: 29900, description: "Website setup and deployment service" },
  "premium-standard": { name: "KasuhaNET Premium Standard", amount: 90000, description: "Premium website setup and deployment service" },
  "dualstream-pro": { name: "DualStream Pro", amount: 4770, description: "DualStream Pro Linux terminal downloader software" }
};

const SERVICES = {
  "domain-dns": { name: "Domain Management & DNS Routing", amount: 5000 },
  "vps-setup": { name: "Server / VPS Setup & Installation", amount: 12000 },
  "ssl": { name: "SSL Certificate Configuration (HTTPS)", amount: 5000 },
  "cms-script": { name: "CMS & Custom Script / Source Code Setup", amount: 15000 },
  "database": { name: "Database Setup & Migration", amount: 10000 },
  "payment-gateway": { name: "Local Payment Gateway Integration", amount: 15000 },
  "email": { name: "Custom Domain Official Email Setup", amount: 10000 },
  "troubleshooting": { name: "Troubleshooting & Error Fixing", amount: 10000 },
  "malware-security": { name: "Malware Cleanup & Web Security", amount: 25000 },
  "optimization": { name: "Speed & Performance Optimization", amount: 15000 },
  "migration": { name: "Full Website & Server Migration", amount: 20000 },
  "analytics": { name: "Analytics & Tracking Pixel Integration", amount: 8000 },
  "blogger-upgrade": { name: "Blogspot / Custom Platform Upgrade", amount: 12000 },
  "page-design": { name: "Page Design Scripts (HTML/CSS/JS)", amount: 18000 }
};

const SITE = "https://kasuhanet.store";

async function telegram(env, method, payload) {
  const response = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error("Telegram API request failed");
  return data.result;
}

async function send(env, chatId, text, keyboard) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {})
  });
}

function money(amount) {
  return "RM " + (amount / 100).toFixed(2);
}

function mainMenu() {
  return [
    [{ text: "Website Packages", callback_data: "menu:packages" }],
    [{ text: "Custom Web Workshop", callback_data: "menu:services" }],
    [{ text: "Affiliate Shop", url: SITE + "/Shop-MyAffliate-home-EN.html" }],
    [{ text: "Visit KasuhaNET", url: SITE }]
  ];
}

async function ensureTelegramTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS telegram_checkout_sessions (
    chat_id TEXT PRIMARY KEY, item_type TEXT NOT NULL, item_id TEXT NOT NULL,
    payment_method TEXT, step TEXT NOT NULL, customer_name TEXT, customer_email TEXT,
    customer_phone TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS toyyibpay_orders (
    id TEXT PRIMARY KEY, external_ref TEXT NOT NULL UNIQUE, bill_code TEXT UNIQUE,
    package_id TEXT NOT NULL, package_name TEXT NOT NULL, amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'myr', customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL, customer_phone TEXT, status TEXT NOT NULL DEFAULT 'pending',
    payment_ref TEXT, paid_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function beginCheckout(env, chatId, item, id, isService) {
  if (!env.DB) {
    await send(env, chatId, "Checkout belum tersedia. Sila cuba semula kemudian.");
    return;
  }
  await ensureTelegramTables(env.DB);
  await env.DB.prepare(`INSERT INTO telegram_checkout_sessions
    (chat_id,item_type,item_id,step) VALUES(?,?,?,'name')
    ON CONFLICT(chat_id) DO UPDATE SET item_type=excluded.item_type,item_id=excluded.item_id,
    payment_method=NULL,step='name',customer_name=NULL,customer_email=NULL,customer_phone=NULL,
    created_at=CURRENT_TIMESTAMP`).bind(String(chatId),isService?"service":"package",id).run();
  await send(env, chatId,
    "<b>" + item.name + "</b>\\nHarga: <b>" + money(item.amount) + "</b>\\n\\nSila isi nama penuh anda. Taip nama dan tekan Enter.\\n\\nHantar /cancel untuk batalkan."
  );
}

async function createStripePayment(env, chatId, session, item, packageId) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  const orderId=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO stripe_orders
    (id,package_id,package_name,amount,currency,customer_name,customer_email,customer_phone,status)
    VALUES(?,?,?,?,'myr',?,?,?,'pending')`)
    .bind(orderId,packageId,item.name,item.amount,session.customer_name,session.customer_email,session.customer_phone).run();

  const form=new URLSearchParams();
  form.set("mode","payment");
  form.set("success_url",SITE+"/Banner-WebSale-EN.html?payment=success&session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url",SITE+"/Banner-WebSale-EN.html?payment=cancel");
  form.set("customer_creation","always");
  form.set("customer_email",session.customer_email);
  form.set("billing_address_collection","auto");
  form.set("phone_number_collection[enabled]","true");
  form.set("line_items[0][quantity]","1");
  form.set("line_items[0][price_data][currency]","myr");
  form.set("line_items[0][price_data][unit_amount]",String(item.amount));
  form.set("line_items[0][price_data][product_data][name]",item.name);
  form.set("metadata[order_id]",orderId);
  form.set("metadata[package_id]",packageId);
  form.set("metadata[telegram_chat_id]",String(chatId));
  form.set("metadata[customer_name]",session.customer_name);
  form.set("metadata[customer_phone]",session.customer_phone);

  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{
    method:"POST",
    headers:{"Authorization":"Bearer "+env.STRIPE_SECRET_KEY,"Content-Type":"application/x-www-form-urlencoded"},
    body:form.toString()
  });
  const result=await response.json();
  if(!response.ok||!result.url||!result.id) throw new Error("Stripe checkout creation failed");
  await env.DB.prepare("UPDATE stripe_orders SET stripe_checkout_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .bind(result.id,orderId).run();
  await send(env,chatId,
    "<b>Stripe checkout sedia.</b>\n"+item.name+"\nJumlah: <b>"+money(item.amount)+"</b>\n\nTekan pautan di bawah untuk membuat pembayaran.",
    [[{text:"PAY NOW • "+money(item.amount),url:result.url}],[{text:"Menu Utama",callback_data:"menu:home"}]]
  );
}

async function createToyyibPayPayment(env, chatId, session, item, packageId) {
  if(!env.TOYYIBPAY_SECRET_KEY||!env.TOYYIBPAY_CATEGORY_CODE) throw new Error("ToyyibPay Live credentials are not configured");
  const id=crypto.randomUUID();
  const externalRef=id.replace(/-/g,"").slice(0,20).toUpperCase();
  await env.DB.prepare(`INSERT INTO toyyibpay_orders
    (id,external_ref,package_id,package_name,amount,customer_name,customer_email,customer_phone,status)
    VALUES(?,?,?,?,?,?,?,?,'pending')`)
    .bind(id,externalRef,packageId,item.name,item.amount,session.customer_name,session.customer_email,session.customer_phone).run();

  let duitNowQrEnabled=false;
  try {
    const statusForm=new URLSearchParams({userSecretKey:env.TOYYIBPAY_SECRET_KEY.trim()});
    const statusResponse=await fetch("https://toyyibpay.com/index.php/api/checkDuitNowQRStatus",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:statusForm.toString()
    });
    const statusData=await statusResponse.json();
    duitNowQrEnabled=statusResponse.ok&&statusData?.status==="success"&&statusData?.duitnowqr_activated===true;
  } catch {}

  const fields={
    userSecretKey:env.TOYYIBPAY_SECRET_KEY.trim(),
    categoryCode:env.TOYYIBPAY_CATEGORY_CODE.trim(),
    billName:("KasuhaNET_"+externalRef).slice(0,30),
    billDescription:("Payment_"+externalRef).slice(0,100),
    billPriceSetting:"1",billPayorInfo:"1",billAmount:String(item.amount),
    billReturnUrl:SITE+"/Banner-WebSale-EN.html?payment=toyyibpay_return&order_id="+encodeURIComponent(id),
    billCallbackUrl:SITE+"/api/toyyibpay-callback",
    billExternalReferenceNo:externalRef,billTo:session.customer_name,
    billEmail:session.customer_email,billPhone:session.customer_phone,
    billPaymentChannel:"2",billExpiryDays:"1"
  };
  if(duitNowQrEnabled){fields.enableDuitNowQR="1";fields.chargeDuitNowQR="0";}
  const response=await fetch("https://toyyibpay.com/index.php/api/createBill",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams(fields).toString()
  });
  const data=await response.json().catch(()=>null);
  const billCode=Array.isArray(data)?data[0]?.BillCode:null;
  if(!response.ok||!billCode||!/^[a-zA-Z0-9]+$/.test(billCode)){
    await env.DB.prepare("UPDATE toyyibpay_orders SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    throw new Error("ToyyibPay could not create the payment bill");
  }
  await env.DB.prepare("UPDATE toyyibpay_orders SET bill_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(billCode,id).run();
  await send(env,chatId,
    "<b>ToyyibPay bill sedia.</b>\n"+item.name+"\nJumlah: <b>"+money(item.amount)+"</b>\n\nBuka pautan untuk bayar melalui kaedah yang diaktifkan pada akaun ToyyibPay.",
    [[{text:"PAY WITH TOYYIBPAY • "+money(item.amount),url:"https://toyyibpay.com/"+billCode}],[{text:"Menu Utama",callback_data:"menu:home"}]]
  );
}

async function handleCheckoutMessage(env, chatId, input) {
  await ensureTelegramTables(env.DB);
  const session=await env.DB.prepare("SELECT * FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).first();
  if(!session) return false;
  if(input==="/cancel"){
    await env.DB.prepare("DELETE FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).run();
    await send(env,chatId,"Checkout dibatalkan. Gunakan /start untuk buka menu.");
    return true;
  }
  if(session.step==="name"){
    if(input.length<2||input.length>100){await send(env,chatId,"Nama tidak sah. Masukkan nama penuh (2 hingga 100 aksara), atau /cancel.");return true;}
    await env.DB.prepare("UPDATE telegram_checkout_sessions SET customer_name=?,step='email' WHERE chat_id=?").bind(input,String(chatId)).run();
    await send(env,chatId,"Masukkan alamat e-mel yang sah:");
    return true;
  }
  if(session.step==="email"){
    if(input.length>254||! /^[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(input)){
      await send(env,chatId,"Format e-mel tidak sah. Cuba semula, atau /cancel.");return true;
    }
    await env.DB.prepare("UPDATE telegram_checkout_sessions SET customer_email=?,step='phone' WHERE chat_id=?").bind(input,String(chatId)).run();
    await send(env,chatId,"Masukkan nombor telefon dengan kod negara. Contoh: +60123456789");
    return true;
  }
  if(session.step==="phone"){
    const digits=input.replace(/\D/g,"");
    if(!/^[+0-9().\s-]+$/.test(input)||digits.length<9||digits.length>15){
      await send(env,chatId,"Nombor telefon tidak sah. Masukkan 9 hingga 15 digit, atau /cancel.");return true;
    }
    await env.DB.prepare("UPDATE telegram_checkout_sessions SET customer_phone=?,step='payment' WHERE chat_id=?").bind(input,String(chatId)).run();
    await send(env,chatId,
      "<b>Maklumat pelanggan diterima.</b>\\nNama: "+session.customer_name+"\\nEmail: "+session.customer_email+"\\nTelefon: "+input+"\\n\\n<b>Pilih Payment Gateway:</b>",
      [
        [{text:"STRIPE • Kad Debit / Kredit",callback_data:"pay:stripe"}],
        [{text:"TOYYIBPAY • FPX / DuitNow QR*",callback_data:"pay:toyyibpay"}],
        [{text:"Batalkan",callback_data:"checkout:cancel"}]
      ]
    );
    return true;
  }
  return true;
}

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN) return new Response("Bot not configured", { status: 503 });

  const setupKey = request.headers.get("X-KasuhaNET-Setup-Key");
  if (setupKey && env.TELEGRAM_WEBHOOK_SECRET && setupKey === env.TELEGRAM_WEBHOOK_SECRET) {
    try {
      await telegram(env, "setWebhook", {
        url: SITE + "/api/telegram-webhook",
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false
      });
      return new Response("Telegram webhook connected successfully.", { status: 200 });
    } catch {
      return new Response("Unable to register Telegram webhook. Check bot token and webhook secret.", { status: 502 });
    }
  }

  const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!env.TELEGRAM_WEBHOOK_SECRET || suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    const message = update.message;
    const callback = update.callback_query;
    if (message?.chat?.id) {
      const chatId = message.chat.id;
      const input = (message.text || "").trim();
      if (input !== "/start" && input !== "/menu" && await handleCheckoutMessage(env, chatId, input)) {
        // Checkout conversation handled.
      } else if (input === "/start" || input === "/menu") {
        await send(env, chatId,
          "<b>Selamat datang ke KasuhaNET Store.</b>\nPilih servis atau produk yang ingin dibeli. Harga dipaparkan dalam MYR.",
          mainMenu()
        );
      } else if (input === "/help") {
        await send(env, chatId, "Gunakan /start untuk membuka menu kedai KasuhaNET.");
      } else {
        await send(env, chatId, "Gunakan /start untuk melihat katalog dan pilihan pembelian.");
      }
    } else if (callback?.message?.chat?.id && callback.data) {
      const chatId = callback.message.chat.id;
      const action = callback.data;
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });

      if (action === "menu:home") {
        await send(env, chatId, "<b>KasuhaNET Store</b>\nPilih kategori:", mainMenu());
      } else if (action === "menu:packages") {
        const rows = Object.entries(PACKAGES).map(([id, item]) => [{
          text: item.name + " • " + money(item.amount),
          callback_data: "buy:package:" + id
        }]);
        rows.push([{ text: "Kembali", callback_data: "menu:home" }]);
        await send(env, chatId, "<b>Website Packages</b>\nPilih pakej, kemudian pilih kaedah pembayaran.", rows);
      } else if (action === "menu:services") {
        const rows = Object.entries(SERVICES).map(([id, item]) => [{
          text: item.name + " • " + money(item.amount),
          callback_data: "buy:service:" + id
        }]);
        rows.push([{ text: "Kembali", callback_data: "menu:home" }]);
        await send(env, chatId, "<b>Custom Web Workshop</b>\nPilih satu servis. Untuk gabungan beberapa servis, gunakan laman bengkel.", rows);
      } else if (action.startsWith("buy:package:")) {
        const id = action.slice("buy:package:".length);
        if (PACKAGES[id]) await beginCheckout(env, chatId, PACKAGES[id], id, false);
      } else if (action.startsWith("buy:service:")) {
        const id = action.slice("buy:service:".length);
        if (SERVICES[id]) await beginCheckout(env, chatId, SERVICES[id], id, true);
      } else if (action === "pay:stripe" || action === "pay:toyyibpay") {
        await ensureTelegramTables(env.DB);
        const method=action==="pay:stripe"?"stripe":"toyyibpay";
        const result=await env.DB.prepare("UPDATE telegram_checkout_sessions SET payment_method=?,step='processing' WHERE chat_id=? AND step='payment'")
          .bind(method,String(chatId)).run();
        if(result.meta?.changes===0) {
          await send(env,chatId,"Sesi checkout tamat. Sila pilih produk semula melalui /start.");
        } else {
          const session=await env.DB.prepare("SELECT * FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).first();
          const item=session?.item_type==="service"?SERVICES[session.item_id]:PACKAGES[session?.item_id];
          const packageId=session?.item_type==="service"?"telegram-workshop-"+session.item_id:session?.item_id;
          try {
            if(!session||!item||!session.customer_name||!session.customer_email||!session.customer_phone) throw new Error("Incomplete checkout");
            if(method==="stripe") await createStripePayment(env,chatId,session,item,packageId);
            else await createToyyibPayPayment(env,chatId,session,item,packageId);
            await env.DB.prepare("DELETE FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).run();
          } catch {
            await env.DB.prepare("DELETE FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).run();
            await send(env,chatId,"Pembayaran tidak dapat dijana. Semak konfigurasi gateway atau hubungi Support KasuhaNET.");
          }
        }
      } else if (action === "checkout:cancel") {
        await env.DB.prepare("DELETE FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).run();
        await send(env,chatId,"Checkout dibatalkan. Gunakan /start untuk mula semula.");
      }
    }
  } catch {
    // Telegram retries webhook deliveries when the endpoint fails. Acknowledge safely.
  }

  return new Response("OK", { status: 200 });
}

export async function onRequestGet() {
  return new Response("KasuhaNET Telegram webhook is ready.", {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
