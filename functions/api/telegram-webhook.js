import { ensureSalesInvoiceTables } from "./order-operations.js";
import { ensureAILearningTables, getApprovedAIKnowledge, addApprovedAIKnowledge, removeApprovedAIKnowledge, recordAIExperience } from './ai-learning.js';
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

async function send(env, chatId, text, keyboard, messageId) {
  const editing = Number.isInteger(messageId);
  return telegram(env, editing ? "editMessageText" : "sendMessage", {
    chat_id: chatId,
    ...(editing ? { message_id: messageId } : {}),
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard || editing ? { reply_markup: { inline_keyboard: keyboard || [] } } : {})
  });
}

async function ensureInboxTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbox_chats (
    id TEXT PRIMARY KEY, chat_id TEXT NOT NULL UNIQUE, session_token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_message_at TEXT
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbox_messages (
    id TEXT PRIMARY KEY, chat_id TEXT NOT NULL,
    sender TEXT NOT NULL CHECK(sender IN ('buyer','admin')), message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, telegram_message_id TEXT
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbox_admin_sessions (
    admin_chat_id TEXT PRIMARY KEY, target_chat_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  try { await db.prepare("ALTER TABLE inbox_chats ADD COLUMN handoff_status TEXT NOT NULL DEFAULT 'ai'").run(); } catch {}
}
async function handleInboxAdminMessage(env, adminChatId, input) {
  if(!env.TELEGRAM_ADMIN_CHAT_ID || String(adminChatId)!==String(env.TELEGRAM_ADMIN_CHAT_ID)) return false;
  await ensureInboxTables(env.DB);
  if(input==="/cancelreply") {
    await env.DB.prepare("DELETE FROM inbox_admin_sessions WHERE admin_chat_id=?").bind(String(adminChatId)).run();
    await send(env,adminChatId,"Inbox reply mode cancelled.");
    return true;
  }
  const session=await env.DB.prepare("SELECT target_chat_id FROM inbox_admin_sessions WHERE admin_chat_id=?")
    .bind(String(adminChatId)).first();
  if(!session) return false;
  const reply=input.trim();
  if(!reply) return true;
  if(reply.length>500) {
    await send(env,adminChatId,"Reply is too long. Maximum 500 characters.");
    return true;
  }
  const chat=await env.DB.prepare("SELECT status FROM inbox_chats WHERE chat_id=?")
    .bind(session.target_chat_id).first();
  if(!chat || chat.status!=="open") {
    await env.DB.prepare("DELETE FROM inbox_admin_sessions WHERE admin_chat_id=?").bind(String(adminChatId)).run();
    await send(env,adminChatId,"This customer chat is unavailable or closed. No reply was sent.");
    return true;
  }
  await env.DB.prepare("INSERT INTO inbox_messages (id,chat_id,sender,message) VALUES (?,?,'admin',?)")
    .bind(crypto.randomUUID(),session.target_chat_id,reply).run();
  await env.DB.prepare("UPDATE inbox_chats SET updated_at=CURRENT_TIMESTAMP,last_message_at=CURRENT_TIMESTAMP WHERE chat_id=?")
    .bind(session.target_chat_id).run();
  await env.DB.prepare("DELETE FROM inbox_admin_sessions WHERE admin_chat_id=?").bind(String(adminChatId)).run();
  await send(env,adminChatId,"<b>REPLY SENT SUCCESSFULLY</b>\n\n<b>CHAT ID</b>\n<code>"+session.target_chat_id+"</code>\n\nYou can reply again when the customer sends another message.");
  return true;
}

function money(amount) {
  return "RM " + (amount / 100).toFixed(2);
}

const LANG = {
  en:{welcome:"Welcome to KasuhaNET Store.",choose:"Choose a category below.",packages:"Website Packages",services:"Custom Web Workshop",affiliate:"Affiliate Shop",visit:"Visit KasuhaNET",packageIntro:"Choose a package.",serviceIntro:"Choose one service. For multiple services, use the website workshop.",back:"Back",buyer:"Please enter buyer details",continue:"CONTINUE",name:"NAME:",email:"EMAIL:",phone:"PHONE NUMBER:",emailInvalid:"INVALID EMAIL. Enter a valid address, e.g. name@email.com",phoneInvalid:"Invalid phone number. Enter 9 to 15 digits.",detailsAccepted:"Buyer details received.",gateway:"Choose a payment gateway:",cancel:"Cancel",canceled:"Checkout cancelled. Send /start to begin again.",help:"Send /start to open the KasuhaNET store menu."},
  ms:{welcome:"Selamat datang ke KasuhaNET Store.",choose:"Pilih kategori di bawah.",packages:"Pakej Website",services:"Bengkel Web Custom",affiliate:"Kedai Affiliate",visit:"Layari KasuhaNET",packageIntro:"Pilih pakej yang dikehendaki.",serviceIntro:"Pilih satu servis. Untuk gabungan beberapa servis, gunakan bengkel di laman web.",back:"Kembali",buyer:"Sila Isikan Maklumat Pembeli",continue:"TEKAN UNTUK TERUSKAN",name:"NAMA:",email:"EMAIL:",phone:"NO. TELEFON:",emailInvalid:"EMAIL TIDAK SAH. Sila isi semula. Contoh: nama@email.com",phoneInvalid:"Nombor telefon tidak sah. Masukkan 9 hingga 15 digit.",detailsAccepted:"Maklumat pembeli diterima.",gateway:"Pilih Payment Gateway:",cancel:"Batal",canceled:"Checkout dibatalkan. Hantar /start untuk mula semula.",help:"Hantar /start untuk membuka menu KasuhaNET Store."},
  zh:{welcome:"欢迎来到 KasuhaNET 商店。",choose:"请选择以下类别。",packages:"网站配套",services:"定制网站服务",affiliate:"联盟商店",visit:"访问 KasuhaNET",packageIntro:"请选择一个配套。",serviceIntro:"请选择一项服务。多项服务请使用网站上的定制工作室。",back:"返回",buyer:"请填写买家资料",continue:"点击继续",name:"姓名：",email:"电子邮箱：",phone:"电话号码：",emailInvalid:"邮箱格式无效，请重新输入。例如：name@email.com",phoneInvalid:"电话号码无效。请输入 9 至 15 位数字。",detailsAccepted:"已收到买家资料。",gateway:"请选择付款方式：",cancel:"取消",canceled:"付款流程已取消。发送 /start 重新开始。",help:"发送 /start 打开 KasuhaNET 商店菜单。"},
  ta:{welcome:"KasuhaNET Store-க்கு வரவேற்கிறோம்.",choose:"கீழே உள்ள பிரிவைத் தேர்ந்தெடுக்கவும்.",packages:"இணையதளத் தொகுப்புகள்",services:"தனிப்பயன் இணைய சேவை",affiliate:"அஃபிலியேட் கடை",visit:"KasuhaNET-ஐ பார்வையிடு",packageIntro:"தேவையான தொகுப்பைத் தேர்ந்தெடுக்கவும்.",serviceIntro:"ஒரு சேவையைத் தேர்ந்தெடுக்கவும். பல சேவைகளுக்கு இணையதளப் பணிமனையைப் பயன்படுத்தவும்.",back:"பின்செல்",buyer:"வாங்குபவர் விவரங்களை உள்ளிடவும்",continue:"தொடர அழுத்தவும்",name:"பெயர்:",email:"மின்னஞ்சல்:",phone:"தொலைபேசி எண்:",emailInvalid:"தவறான மின்னஞ்சல். மீண்டும் உள்ளிடவும். உதாரணம்: name@email.com",phoneInvalid:"தவறான தொலைபேசி எண். 9 முதல் 15 இலக்கங்கள் உள்ளிடவும்.",detailsAccepted:"வாங்குபவர் விவரங்கள் பெறப்பட்டன.",gateway:"கட்டண முறையைத் தேர்ந்தெடுக்கவும்:",cancel:"ரத்து செய்",canceled:"செக்அவுட் ரத்து செய்யப்பட்டது. மீண்டும் தொடங்க /start அனுப்பவும்.",help:"KasuhaNET கடை பட்டியைத் திறக்க /start அனுப்பவும்."}
};
Object.assign(LANG.en,{
  stripeReady:"Stripe checkout is ready.",amount:"Amount:",payLink:"Open the link below to complete payment.",payNow:"PAY NOW",toyyibReady:"ToyyibPay payment is ready.",toyyibInfo:"Use the link below to pay with the methods enabled on your ToyyibPay account.",payToyyib:"PAY WITH TOYYIBPAY",home:"Main Menu",nameInvalid:"Invalid name. Enter your full name (2 to 100 characters), or /cancel.",sessionExpired:"Checkout session expired. Please select the product again using /start.",paymentFailed:"Unable to create payment. Please check the payment gateway or contact KasuhaNET Support.",checkoutUnavailable:"Checkout is unavailable. Please try again later."
});
Object.assign(LANG.ms,{
  stripeReady:"Checkout Stripe sedia.",amount:"Jumlah:",payLink:"Buka pautan di bawah untuk membuat pembayaran.",payNow:"BAYAR SEKARANG",toyyibReady:"Pembayaran ToyyibPay sedia.",toyyibInfo:"Gunakan pautan di bawah untuk membayar melalui kaedah yang diaktifkan pada akaun ToyyibPay anda.",payToyyib:"BAYAR DENGAN TOYYIBPAY",home:"Menu Utama",nameInvalid:"Nama tidak sah. Masukkan nama penuh (2 hingga 100 aksara), atau /cancel.",sessionExpired:"Sesi checkout tamat. Sila pilih produk semula melalui /start.",paymentFailed:"Pembayaran tidak dapat dijana. Semak konfigurasi gateway atau hubungi Support KasuhaNET.",checkoutUnavailable:"Checkout belum tersedia. Sila cuba semula kemudian."
});
Object.assign(LANG.zh,{
  stripeReady:"Stripe 付款页面已准备好。",amount:"金额：",payLink:"请点击下方链接完成付款。",payNow:"立即付款",toyyibReady:"ToyyibPay 付款已准备好。",toyyibInfo:"请使用下方链接，通过您的 ToyyibPay 账户已启用的方式付款。",payToyyib:"使用 TOYYIBPAY 付款",home:"主菜单",nameInvalid:"姓名无效。请输入完整姓名（2 至 100 个字符），或发送 /cancel。",sessionExpired:"结账会话已过期。请发送 /start 重新选择产品。",paymentFailed:"无法创建付款。请检查付款网关或联系 KasuhaNET 支持。",checkoutUnavailable:"暂时无法结账，请稍后再试。"
});
Object.assign(LANG.ta,{
  stripeReady:"Stripe கட்டணப் பக்கம் தயாராக உள்ளது.",amount:"தொகை:",payLink:"கட்டணத்தை முடிக்க கீழே உள்ள இணைப்பைத் திறக்கவும்.",payNow:"இப்போது செலுத்தவும்",toyyibReady:"ToyyibPay கட்டணம் தயாராக உள்ளது.",toyyibInfo:"உங்கள் ToyyibPay கணக்கில் செயல்படுத்தப்பட்ட முறைகள் மூலம் கீழே உள்ள இணைப்பில் பணம் செலுத்தவும்.",payToyyib:"TOYYIBPAY மூலம் செலுத்தவும்",home:"முதன்மை பட்டி",nameInvalid:"தவறான பெயர். முழுப் பெயரை உள்ளிடவும் (2 முதல் 100 எழுத்துகள்), அல்லது /cancel அனுப்பவும்.",sessionExpired:"செக்அவுட் அமர்வு காலாவதியானது. /start மூலம் மீண்டும் தயாரிப்பைத் தேர்ந்தெடுக்கவும்.",paymentFailed:"கட்டணத்தை உருவாக்க முடியவில்லை. கட்டண நுழைவாயிலைச் சரிபார்க்கவும் அல்லது KasuhaNET ஆதரவைத் தொடர்புகொள்ளவும்.",checkoutUnavailable:"செக்அவுட் தற்போது கிடைக்கவில்லை. பின்னர் முயற்சிக்கவும்."
});

function tr(lang,key){return (LANG[lang]&&LANG[lang][key])||LANG.en[key]||key;}
async function getLanguage(db,chatId){
  await db.prepare(`CREATE TABLE IF NOT EXISTS telegram_user_settings(chat_id TEXT PRIMARY KEY,language TEXT NOT NULL DEFAULT 'en',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  const row=await db.prepare("SELECT language FROM telegram_user_settings WHERE chat_id=?").bind(String(chatId)).first();
  return LANG[row?.language]?row.language:"en";
}
async function setLanguage(db,chatId,lang){
  if(!LANG[lang])return;
  await db.prepare(`INSERT INTO telegram_user_settings(chat_id,language) VALUES(?,?) ON CONFLICT(chat_id) DO UPDATE SET language=excluded.language,updated_at=CURRENT_TIMESTAMP`).bind(String(chatId),lang).run();
}
function languageMenu(){return [[{text:"English",callback_data:"lang:en"},{text:"Bahasa Melayu",callback_data:"lang:ms"}],[{text:"中文",callback_data:"lang:zh"},{text:"தமிழ்",callback_data:"lang:ta"}]];}
function mainMenu(lang="en"){return [[{text:tr(lang,"packages"),callback_data:"menu:packages"}],[{text:tr(lang,"services"),callback_data:"menu:services"}],[{text:tr(lang,"affiliate"),url:SITE+"/Shop-MyAffliate-home-EN.html"}],[{text:tr(lang,"visit"),url:SITE}],[{text:"🌐 English / Malay / 中文 / தமிழ்",callback_data:"menu:language"}]];}

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

async function beginCheckout(env, chatId, item, id, isService, messageId) {
  if (!env.DB) {
    await send(env, chatId, tr(await getLanguage(env.DB,chatId),"checkoutUnavailable"));
    return;
  }
  await ensureTelegramTables(env.DB);
  await env.DB.prepare(`INSERT INTO telegram_checkout_sessions
    (chat_id,item_type,item_id,step) VALUES(?,?,?,'name')
    ON CONFLICT(chat_id) DO UPDATE SET item_type=excluded.item_type,item_id=excluded.item_id,
    payment_method=NULL,step='name',customer_name=NULL,customer_email=NULL,customer_phone=NULL,
    created_at=CURRENT_TIMESTAMP`).bind(String(chatId),isService?"service":"package",id).run();
  const lang=await getLanguage(env.DB,chatId);
  await send(env,chatId,"<b>"+tr(lang,"buyer")+"</b>\n"+tr(lang,"continue"),[[{text:tr(lang,"continue"),callback_data:"checkout:start_details"}]],messageId);
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
  const lang=await getLanguage(env.DB,chatId);
  await send(env,chatId,
    "<b>"+tr(lang,"stripeReady")+"</b>\n"+item.name+"\n"+tr(lang,"amount")+" <b>"+money(item.amount)+"</b>\n\n"+tr(lang,"payLink"),
    [[{text:tr(lang,"payNow")+" • "+money(item.amount),url:result.url}],[{text:tr(lang,"home"),callback_data:"menu:home"}]]
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
  const lang=await getLanguage(env.DB,chatId);
  await send(env,chatId,
    "<b>"+tr(lang,"toyyibReady")+"</b>\n"+item.name+"\n"+tr(lang,"amount")+" <b>"+money(item.amount)+"</b>\n\n"+tr(lang,"toyyibInfo"),
    [[{text:tr(lang,"payToyyib")+" • "+money(item.amount),url:"https://toyyibpay.com/"+billCode}],[{text:tr(lang,"home"),callback_data:"menu:home"}]]
  );
}

async function handleCheckoutMessage(env, chatId, input) {
  await ensureTelegramTables(env.DB);
  const session=await env.DB.prepare("SELECT * FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).first();
  if(!session) return false;
  if(input==="/cancel"){
    await env.DB.prepare("DELETE FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).run();
    await send(env,chatId,tr(await getLanguage(env.DB,chatId),"canceled"),undefined,callback.message.message_id);
    return true;
  }
  if(session.step==="name"){
    if(input.length<2||input.length>100){await send(env,chatId,tr(await getLanguage(env.DB,chatId),"nameInvalid"));return true;}
    await env.DB.prepare("UPDATE telegram_checkout_sessions SET customer_name=?,step='email' WHERE chat_id=?").bind(input,String(chatId)).run();
    await send(env,chatId,tr(await getLanguage(env.DB,chatId),"email"));
    return true;
  }
  if(session.step==="email"){
    if(input.length>254||! /^[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(input)){
      await send(env,chatId,tr(await getLanguage(env.DB,chatId),"emailInvalid"));return true;
    }
    await env.DB.prepare("UPDATE telegram_checkout_sessions SET customer_email=?,step='phone' WHERE chat_id=?").bind(input,String(chatId)).run();
    await send(env,chatId,tr(await getLanguage(env.DB,chatId),"phone"));
    return true;
  }
  if(session.step==="phone"){
    const digits=input.replace(/\D/g,"");
    if(!/^[+0-9().\s-]+$/.test(input)||digits.length<9||digits.length>15){
      await send(env,chatId,tr(await getLanguage(env.DB,chatId),"phoneInvalid"));return true;
    }
    await env.DB.prepare("UPDATE telegram_checkout_sessions SET customer_phone=?,step='payment' WHERE chat_id=?").bind(input,String(chatId)).run();
    const lang=await getLanguage(env.DB,chatId);
    await send(env,chatId,
      "<b>"+tr(lang,"detailsAccepted")+"</b>\n"+tr(lang,"name")+" "+session.customer_name+"\n"+tr(lang,"email")+" "+session.customer_email+"\n"+tr(lang,"phone")+" "+input+"\n\n<b>"+tr(lang,"gateway")+"</b>",
      [
        [{text:(lang==="ms"?"STRIPE • Kad Debit / Kredit":lang==="zh"?"STRIPE • 借记卡 / 信用卡":lang==="ta"?"STRIPE • பற்று / கடன் அட்டை":"STRIPE • Debit / Credit Card"),callback_data:"pay:stripe"}],
        [{text:"TOYYIBPAY • FPX / DuitNow QR*",callback_data:"pay:toyyibpay"}],
        [{text:tr(lang,"cancel"),callback_data:"checkout:cancel"}]
      ]
    );    return true;
  }
  return true;
}


function cleanAIText(value) {
  return String(value || "").replace(/\\([*_~])/g, "$1").replace(/\*\*/g, "").replace(/[ \t]{2,}/g, " ").trim();
}
function escapeTelegramHtml(value) {
  return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function safeAIDiagnostic(error) {
  return String(error?.message || error || "Unknown error")
    .replace(/(sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{20,}|Bearer\s+\S+)/gi,"[REDACTED]")
    .replace(/[\r\n]+/g," ")
    .slice(0,240);
}
async function callKasuhaAI(env, messages) {
  if (!env.AI || typeof env.AI.run !== "function") {
    throw new Error("Cloudflare Workers AI binding AI is not configured for this environment");
  }
  const result = await env.AI.run(env.AI_MODEL || "@cf/zai-org/glm-4.7-flash", {
    messages,
    temperature: 0.3,
    max_completion_tokens: 700,
    // GLM-4.7 enables reasoning by default; disable it for direct Telegram replies.
    chat_template_kwargs: { enable_thinking: false }
  });
  const content =
    result?.choices?.[0]?.message?.content ??
    result?.response ??
    result?.output_text ??
    result?.result?.response ??
    "";
  const answer = typeof content === "string"
    ? content.trim()
    : Array.isArray(content)
      ? content.map(part => typeof part === "string" ? part : part?.text || "").join("").trim()
      : "";
  if (!answer) throw new Error("Cloudflare Workers AI returned an empty response");
  return answer;
}
async function fetchOrganicSignals(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS ai_market_signals (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, topic TEXT NOT NULL,
    title TEXT NOT NULL, url TEXT, summary TEXT, published_at TEXT,
    fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source,topic,title)
  )`).run();
  const feeds=[
    {source:'Google Trends Malaysia',topic:'trending searches Malaysia',url:'https://trends.google.com/trending/rss?geo=MY'},
    {source:'Google News Malaysia',topic:'SME website digital presence',url:'https://news.google.com/rss/search?q='+encodeURIComponent('Malaysia SME website digital presence OR small business online')+'&hl=en-MY&gl=MY&ceid=MY:en'},
    {source:'Google News Malaysia',topic:'website design and SEO demand',url:'https://news.google.com/rss/search?q='+encodeURIComponent('Malaysia website design SEO small business ecommerce')+'&hl=en-MY&gl=MY&ceid=MY:en'},
    {source:'Google News Malaysia',topic:'digital selling and online business',url:'https://news.google.com/rss/search?q='+encodeURIComponent('Malaysia digital marketing social commerce small business')+'&hl=en-MY&gl=MY&ceid=MY:en'}
  ];
  const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s+/g,' ').trim();
  const extract=(xml,tag)=>{const m=xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'>','i'));return m?decode(m[1]):'';};
  const collected=[];
  const responses=await Promise.all(feeds.map(async feed=>{
    try {
      const res=await fetch(feed.url,{headers:{'User-Agent':'KasuhaNET-MR-JAY/1.0','Accept':'application/rss+xml, application/xml, text/xml'}});
      if(!res.ok) return [];
      const xml=await res.text();
      const items=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,8);
      return items.map(m=>({source:feed.source,topic:feed.topic,title:extract(m[1],'title').slice(0,240),url:extract(m[1],'link').slice(0,1000),summary:extract(m[1],'description').slice(0,600),published_at:extract(m[1],'pubDate').slice(0,100)})).filter(x=>x.title);
    } catch { return []; }
  }));
  for(const group of responses) for(const item of group) collected.push(item);
  for(const item of collected) {
    await db.prepare(`INSERT INTO ai_market_signals(id,source,topic,title,url,summary,published_at)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(source,topic,title) DO UPDATE SET
      url=excluded.url,summary=excluded.summary,published_at=excluded.published_at,fetched_at=CURRENT_TIMESTAMP`)
      .bind(crypto.randomUUID(),item.source,item.topic,item.title,item.url,item.summary,item.published_at).run();
  }
  return collected;
}

async function handleAILearningAdminCommand(env,chatId,input) {
  if(!env.TELEGRAM_ADMIN_CHAT_ID||String(chatId)!==String(env.TELEGRAM_ADMIN_CHAT_ID)) return false;
  if(!/^\/(teach|knowledge|forget|orders|research|growth|promo|share|traffic)(\s|$)/i.test(input)) return false;
  await ensureAILearningTables(env.DB);
  if(input.startsWith('/teach ')) {
    const payload=input.slice(7).trim(); const split=payload.indexOf('|');
    if(split<0) { await send(env,chatId,'Format: /teach kategori | fakta yang telah disahkan'); return true; }
    try { const id=await addApprovedAIKnowledge(env.DB,payload.slice(split+1).trim(),payload.slice(0,split).trim(),String(chatId)); await send(env,chatId,'Pengetahuan disahkan dan disimpan. ID: '+id); }
    catch(error) { await send(env,chatId,'Tidak dapat simpan: '+escapeTelegramHtml(error.message||'Ralat')); }
    return true;
  }
  if(input==='/knowledge') { const rows=await getApprovedAIKnowledge(env.DB,20); await send(env,chatId,rows.length?'<b>MEMORI RASMI KASUHANET</b>\n'+rows.map(x=>'<code>'+x.id+'</code> ['+escapeTelegramHtml(x.category)+'] '+escapeTelegramHtml(x.fact.slice(0,160))).join('\n'):'Belum ada pengetahuan tambahan.'); return true; }
  if(input==='/orders' || input.startsWith('/orders ')) {
    await ensureTelegramTables(env.DB);
    await ensureSalesInvoiceTables(env.DB);
    const filter=(input.split(/\s+/)[1]||'all').toLowerCase();
    if(!['all','paid','pending','failed','expired'].includes(filter)) { await send(env,chatId,'Format: /orders [all|paid|pending|failed|expired]'); return true; }
    const rows=await env.DB.prepare(`SELECT * FROM (
      SELECT id,package_name,amount,currency,status,customer_name,customer_email,created_at,paid_at,'Stripe' AS gateway,(SELECT invoice_no FROM sales_invoices WHERE gateway='stripe' AND order_id=stripe_orders.id) AS invoice_no FROM stripe_orders
      UNION ALL
      SELECT id,package_name,amount,currency,status,customer_name,customer_email,created_at,paid_at,'ToyyibPay' AS gateway,(SELECT invoice_no FROM sales_invoices WHERE gateway='toyyibpay' AND order_id=toyyibpay_orders.id) AS invoice_no FROM toyyibpay_orders
    ) WHERE (?='all' OR status=?) ORDER BY created_at DESC LIMIT 10`).bind(filter,filter).all();
    const items=rows.results||[];
    const moneyText=n=>'RM '+(Number(n||0)/100).toFixed(2);
    const report=items.map(o=>'<b>'+escapeTelegramHtml(o.package_name)+'</b>\n'+moneyText(o.amount)+' | '+escapeTelegramHtml(o.status.toUpperCase())+' | '+escapeTelegramHtml(o.gateway)+'\n'+escapeTelegramHtml(o.customer_name)+' | '+escapeTelegramHtml(o.customer_email)+'\nID: <code>'+escapeTelegramHtml(o.id)+'</code>\nInvois: '+escapeTelegramHtml(o.invoice_no||'Belum dijana')+'\nTarikh: '+escapeTelegramHtml(o.created_at)+(o.paid_at?'\nBayaran: '+escapeTelegramHtml(o.paid_at):'')).join('\n\n');
    await send(env,chatId,items.length?'<b>LAPORAN PESANAN TERKINI</b>\n'+report:'Tiada pesanan untuk status tersebut.');
    return true;
  }
  if(input==='/research' || input.startsWith('/research ')) {
    const signals=await fetchOrganicSignals(env.DB);
    if(!signals.length) { await send(env,chatId,'MR.JAY tidak berjaya mengambil RSS semasa. Cuba lagi kemudian. Ini bukan data carian Google atau angka search volume.'); return true; }
    const prompt="Anda MR.JAY (STAFF), penganalisis peluang organik KasuhaNET. Analisis isyarat RSS semasa Malaysia berikut: "+JSON.stringify(signals.slice(0,28))+". Fokus perniagaan KasuhaNET: website untuk peniaga kecil, landing page RM299++, Premium Standard RM900++, custom web workshop. Beri 5 topik kandungan yang boleh menarik carian/klik relevan, 3 idea video pendek, 5 frasa kata kunci sebagai HIPOTESIS untuk disahkan di Google Trends/Search Console, dan pelan tindakan 3 hari. Bezakan tajuk berita/trending daripada bukti search volume. Sertakan sumber URL yang diberi dan tarikh jika ada. Jangan reka statistik, trend volume, atau fakta. Jangan cadang spam atau iklan berbayar.";
    const answer=await callKasuhaAI(env,[{role:'system',content:'Analisis sumber web secara kritikal. Jawab BM. Petik sumber URL hanya daripada data yang dibekalkan dan jangan buat dakwaan melebihi bukti.'},{role:'user',content:prompt}]);
    await send(env,chatId,'<b>MR.JAY | LIVE MARKET RESEARCH</b>\\n'+escapeTelegramHtml(cleanAIText(answer).slice(0,3900)));
    return true;
  }
  if(input==='/growth' || input.startsWith('/growth ')) {
    const focus=input.slice(7).trim().slice(0,180)||'Semua servis utama KasuhaNET';
    let snapshot={period:'30 hari',paid_orders:0,gross_paid_rm:0,pending_orders:0,failed_orders:0,new_leads:0};
    const marketSignals=await fetchOrganicSignals(env.DB);
    try {
      const rows=await env.DB.prepare(`SELECT status,COUNT(*) AS total,COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) AS paid_amount FROM (
        SELECT status,amount,created_at FROM stripe_orders WHERE created_at>=datetime('now','-30 days')
        UNION ALL
        SELECT status,amount,created_at FROM toyyibpay_orders WHERE created_at>=datetime('now','-30 days')
      ) GROUP BY status`).all();
      for(const row of rows.results||[]) {
        if(row.status==='paid'){snapshot.paid_orders+=Number(row.total||0);snapshot.gross_paid_rm+=Number(row.paid_amount||0)/100;}
        if(row.status==='pending') snapshot.pending_orders+=Number(row.total||0);
        if(row.status==='failed') snapshot.failed_orders+=Number(row.total||0);
      }
    } catch {}
    try { const lead=await env.DB.prepare("SELECT COUNT(*) AS total FROM inbox_leads WHERE created_at>=datetime('now','-30 days')").first(); snapshot.new_leads=Number(lead?.total||0); } catch {}
    const prompt="Anda MR.JAY (STAFF), penasihat pertumbuhan jualan KasuhaNET di Malaysia. Sediakan pelan tindakan 7 hari yang realistik untuk fokus: "+focus+". Data dalaman 30 hari: "+JSON.stringify(snapshot)+". Isyarat penyelidikan web semasa (tajuk RSS, bukan angka search volume): "+JSON.stringify(marketSignals.slice(0,24))+". Produk diketahui: Landing Page RM299++, Premium Standard RM900++, Custom Web Workshop (skop dan harga selepas penilaian). Objektif: dapatkan prospek dan pertanyaan berkualiti secara organik, naikkan kesedaran jenama KasuhaNET, dan tukarkan pertanyaan kepada jualan. Susun: (1) peluang/hipotesis pelanggan sasaran, jangan dakwa ia fakta pasaran; (2) saluran percuma yang sesuai seperti kandungan Facebook Page, TikTok video pendek, WhatsApp Status, Telegram dan SEO artikel di laman sendiri; (3) jadual harian 7 hari dengan tugasan kecil yang boleh dibuat melalui telefon; (4) CTA yang jelas ke https://kasuhanet.store dan halaman servis berkaitan jika diketahui; (5) metrik untuk direkod: reach/views, klik, pertanyaan, lead layak, quotation, paid order dan hasil RM; (6) eksperimen minggu depan berdasarkan hasil. Beri idea yang khusus kepada servis web untuk peniaga kecil/usahawan, bukan nasihat umum. Jangan cadang iklan berbayar, spam group/DM, beli followers, fake review atau dakwaan palsu. Jangan reka data jualan. Terangkan data dalaman ini bukan bukti saiz pasaran. Gunakan RSS Google Trends Malaysia dan Google News yang berjaya diambil sebagai isyarat awal sahaja. Nyatakan jika mana-mana feed gagal. Jangan anggap tajuk berita sebagai angka search volume atau bukti permintaan pelanggan. Senaraikan kata kunci yang perlu disahkan melalui Google Trends dan Search Console.";
    await send(env,chatId,'<b>MR.JAY | PELAN SALES GROWTH</b>\nSedang susun pelan berdasarkan rekod dalaman 30 hari dan strategi organik...');
    const answer=await callKasuhaAI(env,[{role:'system',content:'Anda penasihat pemasaran digital yang teliti. Jawab Bahasa Melayu, ringkas tetapi boleh terus dibuat. Jangan cipta statistik atau dakwaan telah membuat carian.'},{role:'user',content:prompt}]);
    await send(env,chatId,escapeTelegramHtml(cleanAIText(answer).slice(0,3800)));
    return true;
  }
  if(input==='/promo' || input.startsWith('/promo ')) {
    const focus=input.slice(6).trim().slice(0,180)||'Promosi pengenalan KasuhaNET dan servis pembinaan website';
    const prompt="Anda MR.JAY (STAFF), copywriter pemasaran KasuhaNET. Hasilkan satu set kempen organik untuk topik: "+focus+". Sasaran: peniaga kecil, usahawan mikro, freelancer dan organisasi kecil di Malaysia yang perlukan laman web. Maklumat sah: Landing Page RM299++ (satu halaman, responsive, AdSense optimisation, CTA WhatsApp/form; domain custom tidak termasuk); Premium Standard RM900++ (multi-page, CMS, SEO lanjutan; skop akhir tertakluk persetujuan); Custom Web Workshop ialah servis khusus dengan penilaian dan sebut harga berasingan. Sediakan: 1) tajuk kempen; 2) caption Facebook yang menarik tetapi tidak memaksa; 3) skrip video TikTok 20-30 saat dengan hook, isi dan CTA; 4) WhatsApp Status pendek; 5) ayat Telegram; 6) CTA dan pautan https://kasuhanet.store/custom-web-workshop-MS serta https://kasuhanet.store/Banner-WebSale-MS.html. Bahasa Melayu semula jadi, jelas dan tidak berlebihan. Jangan cipta testimoni, pelanggan, hasil, diskaun, jaminan, harga tambahan atau ciri pakej yang tiada dalam fakta. Elak spam, clickbait palsu dan janji ranking Google/pendapatan. Nyatakan harga dengan tepat RM299++ dan RM900++.";
    const answer=await callKasuhaAI(env,[{role:'system',content:'Anda copywriter pemasaran BM untuk perniagaan digital Malaysia. Hasilkan bahan yang boleh terus disalin. Jangan tambah fakta yang tidak dibekalkan.'},{role:'user',content:prompt}]);
    await send(env,chatId,'<b>MR.JAY | SET PROMOSI</b>\n'+escapeTelegramHtml(cleanAIText(answer).slice(0,3700)));
    return true;
  }
  if(input==='/traffic' || input.startsWith('/traffic ')) {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS marketing_clicks (
      id TEXT PRIMARY KEY, offer TEXT NOT NULL, source TEXT NOT NULL,
      campaign TEXT NOT NULL, referrer TEXT, user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    const rows=await env.DB.prepare(`SELECT offer,source,campaign,COUNT(*) AS clicks,
      MAX(created_at) AS latest_click FROM marketing_clicks
      WHERE created_at>=datetime('now','-30 days')
      GROUP BY offer,source,campaign ORDER BY clicks DESC LIMIT 15`).all();
    const items=rows.results||[];
    const total=items.reduce((sum,row)=>sum+Number(row.clicks||0),0);
    const report=items.map(row=>'<b>'+escapeTelegramHtml(row.offer)+'</b> | '+escapeTelegramHtml(row.source)+'\nKempen: '+escapeTelegramHtml(row.campaign)+'\nKlik: '+Number(row.clicks||0)+' | Terakhir: '+escapeTelegramHtml(row.latest_click||'-')).join('\n\n');
    await send(env,chatId,'<b>MR.JAY | TRAFIK KEMPEN 30 HARI</b>\nJumlah klik pautan kempen: <b>'+total+'</b>\n\n'+(items.length?report:'Belum ada klik direkodkan. Gunakan pautan /share supaya klik kempen boleh diukur.')+'\n\nNota: angka ini ialah klik pautan, bukan pelawat unik atau bukti jualan.');
    return true;
  }
  if(input==='/share' || input.startsWith('/share ')) {
    const focus=input.slice(6).trim().slice(0,160)||'Landing Page RM299++ untuk peniaga kecil';
    const campaign='mrjay-'+new Date().toISOString().slice(0,10)+'-'+(focus.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'offer');
    const offers=[
      {name:'Landing Page RM299++',slug:'landing',path:'/Banner-WebSale-MS.html'},
      {name:'Premium Standard RM900++',slug:'premium',path:'/Banner-WebSale-MS.html'},
      {name:'Custom Web Workshop',slug:'workshop',path:'/custom-web-workshop-MS'}
    ];
    const tracked=(offer,source)=>SITE+'/api/marketing-click?offer='+encodeURIComponent(offer)+'&source='+encodeURIComponent(source)+'&campaign='+encodeURIComponent(campaign);
    const channels=['facebook','tiktok','whatsapp','telegram'];
    const links=offers.map(o=>o.name+'\n'+channels.map(channel=>channel+': '+tracked(o.slug,channel)).join('\n')).join('\n\n');
    const prompt="Anda MR.JAY (STAFF), pengurus kempen organik KasuhaNET. Bina bahan Share Offer Marketing untuk kempen: "+focus+". Fakta tawaran: Landing Page RM299++ ialah satu halaman responsif dengan AdSense optimisation dan CTA WhatsApp/form; domain custom tidak termasuk. Premium Standard RM900++ ialah laman berbilang halaman dengan CMS dan SEO lanjutan, skop akhir tertakluk persetujuan. Custom Web Workshop dinilai dan disebut harga berasingan. Sediakan caption Facebook, skrip TikTok 20-30 saat, WhatsApp Status dan Telegram. Setiap bahan mesti ada hook, manfaat yang realistik dan CTA. Jangan cipta diskaun, testimoni, angka prestasi, jaminan atau ciri yang tidak dinyatakan. Jangan janji ranking Google atau pendapatan. Pautan kempen yang perlu digunakan mengikut saluran: "+links+". Gunakan pautan Facebook dalam caption Facebook, TikTok dalam skrip TikTok, WhatsApp dalam Status dan Telegram dalam mesej Telegram. Jangan ubah atau pendekkan URL. Bahasa Melayu semula jadi.";
    try {
      const answer=await callKasuhaAI(env,[{role:'system',content:'Anda pengurus pemasaran digital. Bahan mesti terus boleh disalin, fakta tepat, tiada spam atau dakwaan palsu.'},{role:'user',content:prompt}]);
      await send(env,chatId,'<b>MR.JAY | SHARE OFFER MARKETING</b>\nKempen: <code>'+campaign+'</code>\n\n'+escapeTelegramHtml(cleanAIText(answer).slice(0,1800))+'\n\n<b>PAUTAN KEMPEN</b>\n'+offers.map(o=>escapeTelegramHtml(o.name)+'\n'+channels.map(channel=>channel.toUpperCase()+':\n'+escapeTelegramHtml(tracked(o.slug,channel))).join('\n')).join('\n\n')+'\n\nGuna pautan ini semasa berkongsi. Klik akan direkodkan untuk laporan /traffic.');
    } catch(error) {
      await send(env,chatId,'MR.JAY gagal menjana bahan kempen. Semak Workers AI dan cuba lagi.');
    }
    return true;
  }
  if(input.startsWith('/forget ')) { const id=Number(input.slice(8).trim()); const ok=Number.isInteger(id)&&id>0?await removeApprovedAIKnowledge(env.DB,id):false; await send(env,chatId,ok?'Memori ID '+id+' dipadam.':'ID tidak sah atau tidak ditemui.'); return true; }
  return true;
}
async function handleAIMessage(env,chatId,input) {
  const lang=await getLanguage(env.DB,chatId);
  try {
    const catalogue="KasuhaNET packages (MYR):\n"+
      Object.entries(PACKAGES).map(([id,item])=>id+": "+item.name+" - "+money(item.amount)).join("\n")+
      "\n\nKasuhaNET services (MYR):\n"+
      Object.entries(SERVICES).map(([id,item])=>id+": "+item.name+" - "+money(item.amount)).join("\n");
    const salesKnowledge="KASUHANET WEBSITE PACKAGES AND CUSTOM WEB KNOWLEDGE (published KasuhaNET site information; Malaysia; MYR/RM):\nPACKAGE 1 - LANDING PAGE / BASIC: RM299++ (published package). Published inclusions: 1 single-page design; responsive code structure for mobile devices; Google AdSense optimisation; WhatsApp or form call-to-action. Custom domain is not included. Suitable for marketing campaigns, simple product launches and mini-shop portfolios. This is not a multi-page website or full CMS.\nPACKAGE 2 - PREMIUM STANDARD: RM900++ (published package). Published inclusions: multi-page website deployment; custom Content Management System (CMS); Google AdSense and advanced SEO; product showcase or club activity gallery; custom domain support (.com/.my); Premium Cyberpunk UI/UX style. The detailed package section describes a structure of up to 5-10 main pages, for example Home, About Us, Services, Blog/Documentation Center and Contact Us; exclusive design aligned with brand identity; Blog/Codex section for articles, technical guides and terminal commands; enquiry and booking forms that send notifications to email or a database; social media links; payment gateway integration when required; SEO including keyword management, H1/H2/H3 structure, XML sitemap and Google Search Console. Scope and final pricing are subject to agreement and technical requirements. Custom-domain support does not mean domain registration/renewal is included. Do not claim hosting/VPS, domain fees, payment-provider fees or every third-party integration are included unless the approved quotation explicitly confirms them.\nPACKAGE DIFFERENCE: RM299++ = one focused landing page with responsive layout, AdSense optimisation and WhatsApp/form CTA. RM900++ Premium Standard = multi-page website (detailed page structure up to 5-10 main pages), custom CMS, product/club gallery, Blog/Codex, enquiry/booking forms, social links and advanced SEO. Do not omit Premium Standard or confuse its features with the RM299 package.\nCUSTOM WEB WORKSHOP: a separate tailored service for new websites, upgrades, redesigns, repairs, extra sections/pages and custom functions. Requests may include booking, payment gateway, database, member login, e-commerce cart/stock/order management, dashboard, API integrations and automation. These are assessed according to requirements and existing website condition; do not automatically promise they are included in either fixed package.\nPRICE AND SCOPE RULES: Always write RM299++ and RM900++ for published package prices. The final scope and pricing are subject to mutual agreement, technical requirements, domain/hosting setup and third-party integrations. Never invent add-on prices, discounts, tax treatment, delivery dates, revision counts, guarantees or included hosting/domain fees. If uncertain, state that the team must confirm the quotation.\nSALES WORKFLOW: Identify whether the customer needs a single-page landing page, Premium Standard multi-page CMS website, or a tailored Custom Web project. Ask one relevant question at a time about business type and required functions. Recommend the matching option and explain its actual published inclusions. If requirements exceed the listed scope, explain that assessment and a separate quotation are needed. Collect name/contact details progressively and only with consent.\nASSISTANT DUTIES: Be KasuhaNET's reliable sales and support assistant. Reply in the customer's language, especially Bahasa Melayu or English. Be concise, clear, professional and factual. Use only the supplied package/service data and verified conversation context. Do not fabricate or assume. If information is missing, say it needs confirmation from the KasuhaNET team. Never claim payment received, refund issued, order accepted, website deployed or task completed without verified system evidence. Never request passwords, API keys, OTPs, card data or sensitive identity documents. Direct payment questions to the official checkout; never trust payment claims or screenshots as proof.";
    const postPurchaseSOP="MR.JAY (STAFF) POST-PURCHASE OPERATIONS SOP:\n1. BEFORE PAYMENT: confirm selected package/service, customer name, email, phone, exact amount and gateway. Checkout creates a pending order record.\n2. PAYMENT VERIFICATION: only the Stripe signed webhook or ToyyibPay callback followed by server-side transaction verification confirms payment. A redirect, customer message, screenshot or payment slip is not proof. Pending means wait. Failed or expired means do not start work.\n3. AFTER VERIFIED PAYMENT: identify order ID, customer, item/scope, amount, gateway and paid timestamp. Preserve the order record, prepare a clear admin summary for the owner, a fulfilment checklist and a customer confirmation draft. Do not claim an alert was sent unless an authorised notification action confirms delivery. Do not begin custom work until scope, required assets/access and delivery expectations are confirmed by the owner.\n4. INVOICE: an invoice should contain a unique sequential invoice number, Kasuhanet Resources seller details, customer details, invoice date, order/reference ID, itemised description, quantity, unit price, total in RM, payment status/date, payment method and business contact. Match the invoice amount to the verified order. Never invent tax/SST, seller address, registration details or invoice number. Never claim an invoice was issued unless a real invoice record/document exists. Current system stores payment orders and payment status; do not claim automatic PDF invoice generation.\n5. FULFILMENT: classify as digital product delivery, website package setup, or custom-workshop project. For digital delivery, confirm the correct file/link and access. For website work, create a checklist, confirm requirements, content, domain/hosting ownership and approvals, then track queued, in progress, review and completed. For custom work, confirm written scope and quotation before work. Never ask for passwords or OTP; use secure delegated access.\n6. CUSTOMER COMMUNICATION: draft a receipt/order acknowledgement only after verified payment; do not claim it was sent unless an authorised send action confirms delivery. Explain next steps and request missing materials one at a time. Never promise a delivery date unless owner-approved.\n7. REPORTING: distinguish pending, paid, failed, expired, refunded and disputed. Report gross paid sales separately from pending orders, fees, refunds, costs and net profit. Never count pending/failed orders as revenue. Identify gateway and channel when known.\n8. ESCALATION: refunds, chargebacks, mismatched amounts, duplicate payments, unclear scope, tax questions, complaints, delivery failures and payment-detail changes go to the owner. Do not issue refunds, change orders, spend money or send external messages without explicit owner approval.\nAdmin can use /orders, /orders paid, /orders pending and /orders failed to view the latest 10 orders.";
    const learned=await getApprovedAIKnowledge(env.DB,12);
    const learnedContext=learned.length?'\n\nADMIN-VERIFIED LEARNED KNOWLEDGE:\n'+learned.map(x=>'['+x.category+'] '+x.fact).join('\n'):'';
    const answer=await callKasuhaAI(env,[
      {role:"system",content:"You are KasuhaNET's customer-facing Telegram sales and support assistant. Answer in the customer's language. Use only supplied catalogue and service knowledge. Explain both RM299++ Landing Page and RM900++ Premium Standard accurately, and distinguish them from Custom Web Workshop. Distinguish the starting price from a confirmed quotation. Ask one useful discovery question at a time. Never invent prices, discounts, delivery times, page counts, revisions, policies or included features. Never request passwords, API keys, payment card details or one-time codes. Do not initiate or alter checkout; direct purchases to /start. For account/order-specific matters you cannot verify, direct the customer to KasuhaNET support. Keep replies concise and Telegram-friendly.\n\n"+postPurchaseSOP+"\n\n"+salesKnowledge+learnedContext+"\n\nLEARNING MINDSET: Understand the customer situation, adapt to corrections in the current conversation, and use only admin-verified long-term knowledge. Customer claims are not official business facts. Ask one useful question at a time. Never claim model weights train themselves."},
      {role:"user",content:catalogue+"\nCustomer language: "+lang+"\nCustomer message: "+input}
    ]);
    try { await recordAIExperience(env.DB,"telegram","","reply_sent"); } catch (logError) { console.error("KasuhaNET AI learning event log failed:",safeAIDiagnostic(logError)); }
    await send(env,chatId,escapeTelegramHtml(cleanAIText(answer).slice(0,3800)));
  } catch(error) {
    const detail=safeAIDiagnostic(error);
    console.error("KasuhaNET Workers AI operator failed:",detail);
    await send(env,chatId,"<b>AI KasuhaNET tidak dapat menjawab buat sementara waktu.</b>\nSila cuba lagi sebentar atau gunakan /start untuk menu kedai.");
  }
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
      if (await handleAILearningAdminCommand(env,chatId,input)) {
        // Admin-managed, verified AI knowledge.
      } else if (await handleInboxAdminMessage(env,chatId,input)) {
        // Admin Inbox reply handled and stored for the website customer.
      } else if (input === "/myid") {
        await send(env, chatId, "Telegram Chat ID anda: <code>" + String(chatId) + "</code>\nSimpan nombor ini sebagai TELEGRAM_ADMIN_CHAT_ID di Cloudflare Pages Secrets.");
      } else if (input !== "/start" && input !== "/menu" && await handleCheckoutMessage(env, chatId, input)) {
        // Checkout conversation handled.
      } else if (input === "/start") {
        await getLanguage(env.DB,chatId);
        await send(env,chatId,"<b>KasuhaNET STORE</b>\nChoose your language / Pilih bahasa / 选择语言 / மொழியைத் தேர்ந்தெடுக்கவும்",languageMenu());
      } else if (input === "/menu") {
        const lang=await getLanguage(env.DB,chatId);
        await send(env,chatId,"<b>"+tr(lang,"welcome")+"</b>\n"+tr(lang,"choose"),mainMenu(lang));
      } else if (input === "/help") {
        await send(env,chatId,tr(await getLanguage(env.DB,chatId),"help"));
      } else {
        await handleAIMessage(env, chatId, input);
      }
    } else if (callback?.message?.chat?.id && callback.data) {
      const chatId = callback.message.chat.id;
      const action = callback.data;
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });

      if (action.startsWith("inbox:resume:")) {
        if(!env.TELEGRAM_ADMIN_CHAT_ID || String(chatId)!==String(env.TELEGRAM_ADMIN_CHAT_ID)) {
          await send(env,chatId,"You are not authorised to manage KasuhaNET Inbox.");
        } else {
          const targetChatId=action.slice("inbox:resume:".length);
          if(!/^KN-[A-F0-9]{10}$/.test(targetChatId)) await send(env,chatId,"Invalid Inbox Chat ID.");
          else {
            await ensureInboxTables(env.DB);
            await env.DB.prepare("UPDATE inbox_chats SET handoff_status='ai',updated_at=CURRENT_TIMESTAMP WHERE chat_id=? AND status='open'").bind(targetChatId).run();
            await env.DB.prepare("DELETE FROM inbox_admin_sessions WHERE admin_chat_id=? AND target_chat_id=?").bind(String(chatId),targetChatId).run();
            await send(env,chatId,"<b>AI MODE RESTORED</b>\n\nChat <code>"+targetChatId+"</code> has been returned to MR.JAY.");
          }
        }
      } else if (action.startsWith("inbox:reply:")) {
        if(!env.TELEGRAM_ADMIN_CHAT_ID || String(chatId)!==String(env.TELEGRAM_ADMIN_CHAT_ID)) {
          await send(env,chatId,"You are not authorised to reply to KasuhaNET Inbox messages.");
        } else {
          const targetChatId=action.slice("inbox:reply:".length);
          if(!/^KN-[A-F0-9]{10}$/.test(targetChatId)) {
            await send(env,chatId,"Invalid Inbox Chat ID.");
          } else {
            await ensureInboxTables(env.DB);
            const target=await env.DB.prepare("SELECT status FROM inbox_chats WHERE chat_id=?").bind(targetChatId).first();
            if(!target || target.status!=="open") {
              await send(env,chatId,"This customer chat is unavailable or closed.");
            } else {
              await env.DB.prepare("UPDATE inbox_chats SET handoff_status='human',updated_at=CURRENT_TIMESTAMP WHERE chat_id=?").bind(targetChatId).run();
              await env.DB.prepare(`INSERT INTO inbox_admin_sessions(admin_chat_id,target_chat_id)
                VALUES(?,?) ON CONFLICT(admin_chat_id) DO UPDATE SET
                target_chat_id=excluded.target_chat_id,updated_at=CURRENT_TIMESTAMP`)
                .bind(String(chatId),targetChatId).run();
              await send(env,chatId,"<b>LIVE AGENT MODE ENABLED</b>\n\n<b>CHAT ID</b>\n<code>"+targetChatId+"</code>\n\nSend your reply as your next Telegram message. AI replies are paused. Use /cancelreply to cancel typing mode, or finish the handover with the button below.",[[{text:"Return chat to MR.JAY (AI)",callback_data:"inbox:resume:"+targetChatId}]]);
            }
          }
        }
      } else if (action.startsWith("lang:")) {
        const lang=action.slice(5);
        if(LANG[lang]) {
          await setLanguage(env.DB,chatId,lang);
          await send(env,chatId,"<b>"+tr(lang,"welcome")+"</b>\n"+tr(lang,"choose"),mainMenu(lang),callback.message.message_id);
        }
      } else if (action === "menu:language") {
        const lang=await getLanguage(env.DB,chatId);
        await send(env,chatId,"Choose your language / Pilih bahasa / 选择语言 / மொழியைத் தேர்ந்தெடுக்கவும்",languageMenu(),callback.message.message_id);
      } else if (action === "menu:home") {
        const lang=await getLanguage(env.DB,chatId);
        await send(env,chatId,"<b>"+tr(lang,"welcome")+"</b>\n"+tr(lang,"choose"),mainMenu(lang),callback.message.message_id);
      } else if (action === "menu:packages") {
        const lang=await getLanguage(env.DB,chatId);
        const rows=Object.entries(PACKAGES).map(([id,item])=>[{text:item.name+" • "+money(item.amount),callback_data:"buy:package:"+id}]);
        rows.push([{text:tr(lang,"back"),callback_data:"menu:home"}]);
        rows.push([{text:"🌐 Language / Bahasa / 语言 / மொழி",callback_data:"menu:language"}]);
        await send(env,chatId,"<b>"+tr(lang,"packages")+"</b>\n"+tr(lang,"packageIntro"),rows,callback.message.message_id);
      } else if (action === "menu:services") {
        const lang=await getLanguage(env.DB,chatId);
        const rows=Object.entries(SERVICES).map(([id,item])=>[{text:item.name+" • "+money(item.amount),callback_data:"buy:service:"+id}]);
        rows.push([{text:tr(lang,"back"),callback_data:"menu:home"}]);
        rows.push([{text:"🌐 Language / Bahasa / 语言 / மொழி",callback_data:"menu:language"}]);
        await send(env,chatId,"<b>"+tr(lang,"services")+"</b>\n"+tr(lang,"serviceIntro"),rows,callback.message.message_id);
      } else if (action.startsWith("buy:package:")) {
        const id = action.slice("buy:package:".length);
        if (PACKAGES[id]) await beginCheckout(env, chatId, PACKAGES[id], id, false, callback.message.message_id);
      } else if (action.startsWith("buy:service:")) {
        const id = action.slice("buy:service:".length);
        if (SERVICES[id]) await beginCheckout(env, chatId, SERVICES[id], id, true, callback.message.message_id);
      } else if (action === "checkout:start_details") {
        await ensureTelegramTables(env.DB);
        const result=await env.DB.prepare("UPDATE telegram_checkout_sessions SET step='name' WHERE chat_id=? AND step='name'")
          .bind(String(chatId)).run();
        if(result.meta?.changes===0) {
          await send(env,chatId,tr(await getLanguage(env.DB,chatId),"sessionExpired"));
        } else {
          await send(env,chatId,tr(await getLanguage(env.DB,chatId),"name"),undefined,callback.message.message_id);
        }
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
            await send(env,chatId,tr(await getLanguage(env.DB,chatId),"paymentFailed"));
          }
        }
      } else if (action === "checkout:cancel") {
        await env.DB.prepare("DELETE FROM telegram_checkout_sessions WHERE chat_id=?").bind(String(chatId)).run();
        await send(env,chatId,tr(await getLanguage(env.DB,chatId),"canceled"));
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
