import { ensureAILearningTables, getApprovedAIKnowledge, recordAIExperience } from '../ai-learning.js';
const ALLOWED_HOSTS = new Set(["kasuhanet.store", "www.kasuhanet.store"]);
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
function cleanAIText(value){return String(value||"").replace(/\([*_`~])/g,"$1").replace(/\*\*(.*?)\*\*/gs,"$1").replace(/[ \t]{2,}/g," ").trim();}
function allowed(request){
  try{
    const url=new URL(request.url), origin=request.headers.get("Origin");
    if(url.protocol!=="https:" || !ALLOWED_HOSTS.has(url.hostname)) return false;
    if(!origin) return true;
    const parsed=new URL(origin);
    return parsed.protocol==="https:" && ALLOWED_HOSTS.has(parsed.hostname) && parsed.origin===url.origin;
  }catch{return false;}
}
async function ensureTables(db){
  await ensureAILearningTables(db);
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
  try { await db.prepare("ALTER TABLE inbox_chats ADD COLUMN page_path TEXT").run(); } catch {}
  try { await db.prepare("ALTER TABLE inbox_chats ADD COLUMN handoff_status TEXT NOT NULL DEFAULT 'ai'").run(); } catch {}
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_inbox_messages_chat_created ON inbox_messages(chat_id, created_at)").run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbox_leads (
    chat_id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    project_need TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}
function extractLeadData(message) {
  const text = String(message || "").trim();
  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || null;
  const phoneMatch = text.match(/(?:\+?60|0)[\d\s().-]{7,18}/);
  const phoneDigits = phoneMatch ? phoneMatch[0].replace(/\D/g, "") : "";
  const phone = phoneDigits.length >= 9 && phoneDigits.length <= 15 ? phoneMatch[0].trim() : null;
  const nameMatch = text.match(/(?:nama saya|nama(?=\s*[:,-])|my name is|name is)\s*[:,-]?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*){0,2})(?=[,.;\n]|$)/i);
  const customerName = nameMatch ? nameMatch[1].trim().replace(/[.,;:!?]+$/, "").slice(0, 80) : null;
  const intent = /\b(website|web site|e-?commerce|online store|landing page|booking|portal|redesign|domain|hosting|business website)\b|\b(laman web|kedai online|tempahan|sistem bayaran|pembayaran|perniagaan|bisnes|ubah suai website|bina website|buat website|web custom)\b/i.test(text);
  const projectNeed = intent && text.length >= 12 ? text.slice(0, 500) : null;
  return { customerName, email, phone, projectNeed };
}
async function captureLead(db, chatId, message) {
  const lead = extractLeadData(message);
  if (!lead.customerName && !lead.email && !lead.phone && !lead.projectNeed) return null;
  await db.prepare(`INSERT INTO inbox_leads
    (chat_id,customer_name,customer_email,customer_phone,project_need)
    VALUES(?,?,?,?,?)
    ON CONFLICT(chat_id) DO UPDATE SET
      customer_name=COALESCE(excluded.customer_name,inbox_leads.customer_name),
      customer_email=COALESCE(excluded.customer_email,inbox_leads.customer_email),
      customer_phone=COALESCE(excluded.customer_phone,inbox_leads.customer_phone),
      project_need=COALESCE(excluded.project_need,inbox_leads.project_need),
      updated_at=CURRENT_TIMESTAMP`)
    .bind(chatId,lead.customerName,lead.email,lead.phone,lead.projectNeed).run();
  return lead;
}
async function sha256(value){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
async function authorize(db,chatId,token){
  if(!/^KN-[A-F0-9]{10}$/.test(chatId) || typeof token!=="string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  const row=await db.prepare("SELECT session_token_hash,status FROM inbox_chats WHERE chat_id=?").bind(chatId).first();
  if(!row || row.status!=="open") return false;
  return row.session_token_hash===await sha256(token);
}

async function generateSalesReply(env, db, chatId, latestMessage) {
  // Cloudflare Workers AI binding is preferred. No paid API key is required
  // when the AI binding is enabled on the Pages project.
  if (!env.AI || typeof env.AI.run !== "function") {
    console.error("[KasuhaNET AI] Workers AI binding AI is missing or invalid in this deployment.");
    return null;
  }
  const history = await db.prepare(`SELECT sender,message FROM inbox_messages
    WHERE chat_id=? ORDER BY created_at DESC, rowid DESC LIMIT 12`).bind(chatId).all();
  const messages = (history.results || []).reverse()
    .filter(row => typeof row.message === "string" && row.message.length <= 500)
    .map(row => ({ role: row.sender === "buyer" ? "user" : "assistant", content: row.message }));
  const chatContext = await db.prepare('SELECT page_path FROM inbox_chats WHERE chat_id=?').bind(chatId).first();
  const learned = await getApprovedAIKnowledge(db,12);
  const learnedContext = learned.length ? '\n\nADMIN-VERIFIED LEARNED KNOWLEDGE:\n' + learned.map(x=>'['+x.category+'] '+x.fact).join('\n') : '';
  const pageContext = 'Current website page: '+(chatContext?.page_path||'unknown')+'. Use as context only, not as proof of intent.';
  const system = [
    "You are MR.JAY (STAFF), KasuhaNET's AI sales and operations assistant for KasuhaNET.STORE, operated by Kasuhanet Resources in Malaysia.",
    "Help visitors understand custom website development, website upgrades, digital services and support. Be concise, polite and commercially helpful.",
    "Reply in the language used by the customer: Bahasa Melayu or English. Use Malaysian Ringgit (RM) when discussing prices.",
    "KASUHANET WEBSITE PACKAGES AND CUSTOM WEB KNOWLEDGE (published KasuhaNET site information; Malaysia; MYR/RM):\nPACKAGE 1 - LANDING PAGE / BASIC: RM299++ (published package). Published inclusions: 1 single-page design; responsive code structure for mobile devices; Google AdSense optimisation; WhatsApp or form call-to-action. Custom domain is not included. Suitable for marketing campaigns, simple product launches and mini-shop portfolios. This is not a multi-page website or full CMS.\nPACKAGE 2 - PREMIUM STANDARD: RM900++ (published package). Published inclusions: multi-page website deployment; custom Content Management System (CMS); Google AdSense and advanced SEO; product showcase or club activity gallery; custom domain support (.com/.my); Premium Cyberpunk UI/UX style. The detailed package section describes a structure of up to 5-10 main pages, for example Home, About Us, Services, Blog/Documentation Center and Contact Us; exclusive design aligned with brand identity; Blog/Codex section for articles, technical guides and terminal commands; enquiry and booking forms that send notifications to email or a database; social media links; payment gateway integration when required; SEO including keyword management, H1/H2/H3 structure, XML sitemap and Google Search Console. Scope and final pricing are subject to agreement and technical requirements. Custom-domain support does not mean domain registration/renewal is included. Do not claim hosting/VPS, domain fees, payment-provider fees or every third-party integration are included unless the approved quotation explicitly confirms them.\nPACKAGE DIFFERENCE: RM299++ = one focused landing page with responsive layout, AdSense optimisation and WhatsApp/form CTA. RM900++ Premium Standard = multi-page website (detailed page structure up to 5-10 main pages), custom CMS, product/club gallery, Blog/Codex, enquiry/booking forms, social links and advanced SEO. Do not omit Premium Standard or confuse its features with the RM299 package.\nCUSTOM WEB WORKSHOP: a separate tailored service for new websites, upgrades, redesigns, repairs, extra sections/pages and custom functions. Requests may include booking, payment gateway, database, member login, e-commerce cart/stock/order management, dashboard, API integrations and automation. These are assessed according to requirements and existing website condition; do not automatically promise they are included in either fixed package.\nPRICE AND SCOPE RULES: Always write RM299++ and RM900++ for published package prices. The final scope and pricing are subject to mutual agreement, technical requirements, domain/hosting setup and third-party integrations. Never invent add-on prices, discounts, tax treatment, delivery dates, revision counts, guarantees or included hosting/domain fees. If uncertain, state that the team must confirm the quotation.\nSALES WORKFLOW: Identify whether the customer needs a single-page landing page, Premium Standard multi-page CMS website, or a tailored Custom Web project. Ask one relevant question at a time about business type and required functions. Recommend the matching option and explain its actual published inclusions. If requirements exceed the listed scope, explain that assessment and a separate quotation are needed. Collect name/contact details progressively and only with consent.\nASSISTANT DUTIES: Be KasuhaNET's reliable sales and support assistant. Reply in the customer's language, especially Bahasa Melayu or English. Be concise, clear, professional and factual. Use only the supplied package/service data and verified conversation context. Do not fabricate or assume. If information is missing, say it needs confirmation from the KasuhaNET team. Never claim payment received, refund issued, order accepted, website deployed or task completed without verified system evidence. Never request passwords, API keys, OTPs, card data or sensitive identity documents. Direct payment questions to the official checkout; never trust payment claims or screenshots as proof.",
    "Qualify a sales enquiry one step at a time: first understand the website or service requirement, then ask for the customer's name, then ask for one preferred contact method (email or phone) only when the customer is interested. Never demand all details at once. Do not request passwords, card details, OTPs or sensitive identity documents.",
    "You may explain services and collect a voluntary name, contact method and project requirements. Do not claim that an order, payment, refund, deployment or task has been completed.",
    "Payment status must be confirmed by the secure payment system, never by a customer message or screenshot. After payment, tell the customer that the order will enter the fulfilment workflow and may require human review.",
    "If unsure, say so clearly and offer to pass the enquiry to the KasuhaNET team. Do not fabricate features, delivery dates, availability or guarantees.",
    "LEARNING MINDSET: Understand the customer situation and page context. Adapt to corrections in the current conversation. Use long-term facts only from admin-verified learned knowledge. Customer claims are not official business facts. Ask one useful question at a time. Never claim model weights train themselves.",
    pageContext + learnedContext,
    "MR.JAY (STAFF) POST-PURCHASE OPERATIONS SOP:\n1. BEFORE PAYMENT: confirm selected package/service, customer name, email, phone, exact amount and gateway. Checkout creates a pending order record.\n2. PAYMENT VERIFICATION: only the Stripe signed webhook or ToyyibPay callback followed by server-side transaction verification confirms payment. A redirect, customer message, screenshot or payment slip is not proof. Pending means wait. Failed or expired means do not start work.\n3. AFTER VERIFIED PAYMENT: identify order ID, customer, item/scope, amount, gateway and paid timestamp. Preserve the order record, prepare a clear admin summary for the owner, a fulfilment checklist and a customer confirmation draft. Do not claim an alert was sent unless an authorised notification action confirms delivery. Do not begin custom work until scope, required assets/access and delivery expectations are confirmed by the owner.\n4. INVOICE: an invoice should contain a unique sequential invoice number, Kasuhanet Resources seller details, customer details, invoice date, order/reference ID, itemised description, quantity, unit price, total in RM, payment status/date, payment method and business contact. Match the invoice amount to the verified order. Never invent tax/SST, seller address, registration details or invoice number. Never claim an invoice was issued unless a real invoice record/document exists. Current system stores payment orders and payment status; do not claim automatic PDF invoice generation.\n5. FULFILMENT: classify as digital product delivery, website package setup, or custom-workshop project. For digital delivery, confirm the correct file/link and access. For website work, create a checklist, confirm requirements, content, domain/hosting ownership and approvals, then track queued, in progress, review and completed. For custom work, confirm written scope and quotation before work. Never ask for passwords or OTP; use secure delegated access.\n6. CUSTOMER COMMUNICATION: draft a receipt/order acknowledgement only after verified payment; do not claim it was sent unless an authorised send action confirms delivery. Explain next steps and request missing materials one at a time. Never promise a delivery date unless owner-approved.\n7. REPORTING: distinguish pending, paid, failed, expired, refunded and disputed. Report gross paid sales separately from pending orders, fees, refunds, costs and net profit. Never count pending/failed orders as revenue. Identify gateway and channel when known.\n8. ESCALATION: refunds, chargebacks, mismatched amounts, duplicate payments, unclear scope, tax questions, complaints, delivery failures and payment-detail changes go to the owner. Do not issue refunds, change orders, spend money or send external messages without explicit owner approval.\nAdmin can use /orders, /orders paid, /orders pending and /orders failed to view the latest 10 orders.",
    "Keep replies natural, clear and usually under 120 words."
  ].join(" ");
  const result = await env.AI.run(env.AI_MODEL || "@cf/zai-org/glm-4.7-flash", {
    messages: [{ role: "system", content: system }, ...messages],
    max_completion_tokens: 220,
    temperature: 0.35,
    // GLM-4.7 enables reasoning by default. Disable it for a short customer-facing reply.
    chat_template_kwargs: { enable_thinking: false }
  });
  // Accept both plain text and text-part arrays returned by Workers AI models.
  const generatedText =
    result?.choices?.[0]?.message?.content ??
    result?.response ??
    result?.output_text ??
    result?.result?.response ??
    "";
  const extractedText = typeof generatedText === "string"
    ? generatedText
    : Array.isArray(generatedText)
      ? generatedText.map(part => typeof part === "string" ? part : part?.text || "").join("")
      : "";
  const reply = cleanAIText(extractedText).slice(0, 1800);
  if (!reply) {
    console.error("[KasuhaNET AI] Model returned no usable text. Response keys:", Object.keys(result || {}));
    return null;
  }
  await db.prepare("INSERT INTO inbox_messages (id,chat_id,sender,message) VALUES (?,?,'admin',?)")
    .bind(crypto.randomUUID(), chatId, reply).run();
  await db.prepare("UPDATE inbox_chats SET updated_at=CURRENT_TIMESTAMP,last_message_at=CURRENT_TIMESTAMP WHERE chat_id=?")
    .bind(chatId).run();
  try { await recordAIExperience(db,"website_inbox",chatContext?.page_path||"","reply_saved"); } catch (error) { console.error("[KasuhaNET AI] Learning event log failed:",error?.message||String(error)); }
  console.log("[KasuhaNET AI] Inbox reply saved", { chatId, replyLength: reply.length });
  return reply;
}

export async function onRequestGet({request,env}){
  if(!allowed(request)) return json({error:"Request origin is not allowed."},403);
  if(!env.DB) return json({error:"D1 database binding DB is not configured."},503);
  const url=new URL(request.url), chatId=url.searchParams.get("chatId")||"";
  const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")||"";
  try{
    await ensureTables(env.DB);
    if(!(await authorize(env.DB,chatId,token))) return json({error:"Chat session is invalid or expired."},401);
    const after=url.searchParams.get("after")||"";
    const rows=await env.DB.prepare(`SELECT id,sender,message,created_at FROM inbox_messages
      WHERE chat_id=? ORDER BY created_at DESC, rowid DESC LIMIT 100`).bind(chatId).all();
    const chat=await env.DB.prepare("SELECT handoff_status FROM inbox_chats WHERE chat_id=?").bind(chatId).first();
    return json({messages:(rows.results||[]).reverse(),handoffStatus:chat?.handoff_status||"ai"});
  }catch{return json({error:"Unable to load chat messages."},500);}
}
export async function onRequestPost({request,env}){
  if(!allowed(request)) return json({error:"Request origin is not allowed."},403);
  if(!env.DB) return json({error:"D1 database binding DB is not configured."},503);
  let input;
  try{input=await request.json();}catch{return json({error:"Invalid message request."},400);}
  const chatId=typeof input?.chatId==="string"?input.chatId:"";
  const message=typeof input?.message==="string"?input.message.trim():"";
  const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")||"";
  let attachment=null;
  try{const parsed=JSON.parse(message);if(parsed&&["image","voice","location"].includes(parsed.kind))attachment=parsed;}catch{}
  const maxLength=attachment?1350000:500;
  if(input?.requestLiveAgent!==true && (!message || message.length>maxLength)) return json({error:attachment?"Attachment is too large. Please use a smaller file.":"Message must contain 1 to 500 characters."},400);
  if(attachment?.kind==="image" && (typeof attachment.data!=="string" || !/^data:image\/(jpeg|png|webp);base64,/.test(attachment.data))) return json({error:"Invalid image attachment."},400);
  if(attachment?.kind==="voice" && (typeof attachment.data!=="string" || !/^data:audio\/[a-z0-9.+-]+(?:;[^,]+)*;base64,/i.test(attachment.data))) return json({error:"Invalid voice attachment."},400);
  if(attachment?.kind==="location" && (!Number.isFinite(attachment.lat)||!Number.isFinite(attachment.lng)||Math.abs(attachment.lat)>90||Math.abs(attachment.lng)>180)) return json({error:"Invalid location."},400);
  try{
    await ensureTables(env.DB);
    if(!(await authorize(env.DB,chatId,token))) return json({error:"Chat session is invalid or expired."},401);
    if(input?.requestLiveAgent===true){
      const current=await env.DB.prepare("SELECT handoff_status,page_path FROM inbox_chats WHERE chat_id=?").bind(chatId).first();
      if(!current) return json({error:"Chat session is unavailable."},404);
      if(current.handoff_status==="ai"){
        await env.DB.prepare("UPDATE inbox_chats SET handoff_status='requested',updated_at=CURRENT_TIMESTAMP WHERE chat_id=?").bind(chatId).run();
        let telegramNotified=false;
        if(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID){
          try{
            const response=await fetch("https://api.telegram.org/bot"+env.TELEGRAM_BOT_TOKEN+"/sendMessage",{
              method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({chat_id:env.TELEGRAM_ADMIN_CHAT_ID,
                text:"<b>LIVE AGENT REQUEST</b>\n\n<b>CHAT ID</b>\n<code>"+chatId+"</code>\n<b>PAGE</b>\n"+String(current.page_path||"/").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"\n\nCustomer is requesting a human agent. AI replies are paused for this chat.",
                parse_mode:"HTML",disable_web_page_preview:true,
                reply_markup:{inline_keyboard:[[{text:"Reply to Customer",callback_data:"inbox:reply:"+chatId}]]}})
            });
            const result=await response.json();telegramNotified=response.ok&&result.ok===true;
          }catch{}
        }
        return json({requested:true,handoffStatus:"requested",telegramNotified});
      }
      return json({requested:true,handoffStatus:current.handoff_status||"ai",alreadyRequested:true});
    }
    const recent=await env.DB.prepare(`SELECT COUNT(*) AS total FROM inbox_messages
      WHERE chat_id=? AND sender='buyer' AND created_at>=datetime('now','-1 minute')`).bind(chatId).first();
    if((recent?.total||0)>=10) return json({error:"Please wait before sending another message."},429);
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO inbox_messages (id,chat_id,sender,message) VALUES (?,?,'buyer',?)").bind(id,chatId,message).run();
    await env.DB.prepare("UPDATE inbox_chats SET updated_at=CURRENT_TIMESTAMP,last_message_at=CURRENT_TIMESTAMP WHERE chat_id=?").bind(chatId).run();
    const capturedLead = attachment ? null : await captureLead(env.DB, chatId, message);
    const liveAgentRequest = !attachment && (
      /\b(live\s*agent|human\s*agent|real\s*person|customer\s*service|support\s*agent|operator|speak\s+to\s+(a\s+)?(person|human|agent)|talk\s+to\s+(a\s+)?(person|human|agent))\b/i.test(message) ||
      /\b(ejen\s+manusia|pegawai\s+(khidmat\s+pelanggan|support)|khidmat\s+pelanggan)\b/i.test(message) ||
      /\b(nak|mahu|ingin|boleh)\s+(sambung(kan)?|bercakap|cakap|chat)\s+(saya\s+)?(dengan|ke)\s+(live\s+)?agent\b/i.test(message)
    );
    let handoff=await env.DB.prepare("SELECT handoff_status FROM inbox_chats WHERE chat_id=?").bind(chatId).first();
    let liveAgentAutoRequested=false;
    if(liveAgentRequest && (!handoff?.handoff_status || handoff.handoff_status==="ai")){
      await env.DB.prepare("UPDATE inbox_chats SET handoff_status='requested',updated_at=CURRENT_TIMESTAMP WHERE chat_id=?").bind(chatId).run();
      const notice=/\b(nak|mahu|ingin|boleh|saya|tolong|sambung|ejen|pegawai)\b/i.test(message)
        ? "Permintaan Live Agent diterima. Pasukan KasuhaNET akan menyambung perbualan ini melalui Live Chat sebaik sahaja tersedia."
        : "Your Live Agent request has been received. The KasuhaNET team will join this chat as soon as an agent is available.";
      await env.DB.prepare("INSERT INTO inbox_messages (id,chat_id,sender,message) VALUES (?,?,'admin',?)")
        .bind(crypto.randomUUID(),chatId,notice).run();
      handoff={...handoff,handoff_status:"requested"};
      liveAgentAutoRequested=true;
    }

    // Generate an automatic sales/support reply when the Cloudflare AI binding is enabled.
    // AI failure never blocks delivery of the original customer message to the human inbox.
    let aiReplied = false;
    if (!attachment && (!handoff?.handoff_status || handoff.handoff_status==="ai")) {
      try {
        aiReplied = Boolean(await generateSalesReply(env, env.DB, chatId, message));
      } catch (error) {
        console.error("[KasuhaNET AI] Reply generation failed:", error?.message || String(error));
        aiReplied = false;
      }
    }

    // Notify the support admin in Telegram. Attachments are delivered as native Telegram media.
    // The website message remains saved even
    // if Telegram is temporarily unavailable.
    let telegramNotified=false;
    if(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID){
      try{
        const safeMessage=(attachment?(attachment.kind==="image"?"[Customer sent an image]":attachment.kind==="voice"?"[Customer sent a voice message]":"[Customer shared location]"):message).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        let method="sendMessage", body;
        if(attachment?.kind==="location"){method="sendLocation";body={chat_id:env.TELEGRAM_ADMIN_CHAT_ID,latitude:attachment.lat,longitude:attachment.lng,reply_markup:{inline_keyboard:[[{text:"Reply to Customer",callback_data:"inbox:reply:"+chatId}]]}};}
        else if(attachment?.kind==="image"||attachment?.kind==="voice"){
          const parts=attachment.data.split(",",2),mime=parts[0].match(/^data:([^;]+)/)?.[1]||"application/octet-stream";
          const bytes=Uint8Array.from(atob(parts[1]),c=>c.charCodeAt(0));
          const formData=new FormData();formData.append("chat_id",env.TELEGRAM_ADMIN_CHAT_ID);formData.append("reply_markup",JSON.stringify({inline_keyboard:[[{text:"Reply to Customer",callback_data:"inbox:reply:"+chatId}]]}));
          if(attachment.kind==="image"){
            formData.append("photo",new Blob([bytes],{type:mime}),"customer-image.jpg");
            method="sendPhoto";
          }else{
            const voiceFormat=/^(audio\/ogg|audio\/mpeg|audio\/mp4|audio\/x-m4a)/i.test(mime);
            formData.append(voiceFormat?"voice":"document",new Blob([bytes],{type:mime}),voiceFormat?"customer-voice."+(/ogg/i.test(mime)?"ogg":/mpeg/i.test(mime)?"mp3":"m4a"):"customer-voice.webm");
            method=voiceFormat?"sendVoice":"sendDocument";
          }
          body=formData;
        }else {
          const leadLines = capturedLead && (capturedLead.customerName || capturedLead.email || capturedLead.phone || capturedLead.projectNeed)
            ? "\n\n<b>LEAD DETAILS CAPTURED</b>" +
              (capturedLead.customerName ? "\nName: " + capturedLead.customerName.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : "") +
              (capturedLead.email ? "\nEmail: " + capturedLead.email.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : "") +
              (capturedLead.phone ? "\nPhone: " + capturedLead.phone.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : "") +
              (capturedLead.projectNeed ? "\nRequirement: " + capturedLead.projectNeed.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : "")
            : "";
          body={chat_id:env.TELEGRAM_ADMIN_CHAT_ID,text:(liveAgentAutoRequested?"<b>LIVE AGENT REQUEST</b>\n\n":"<b>NEW KASUHANET INBOX MESSAGE</b>\n\n")+"<b>CHAT ID</b>\n<code>"+chatId+"</code>\n\n<b>CUSTOMER MESSAGE</b>\n"+safeMessage+leadLines,parse_mode:"HTML",disable_web_page_preview:true,reply_markup:{inline_keyboard:[[{text:"Reply to Customer",callback_data:"inbox:reply:"+chatId}]]}};
        }
        const response=await fetch("https://api.telegram.org/bot"+env.TELEGRAM_BOT_TOKEN+"/"+method,{
          method:"POST",
          ...(body instanceof FormData?{body}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        });
        const result=await response.json();
        telegramNotified=response.ok && result.ok===true;
        if(telegramNotified && result.result?.message_id){
          await env.DB.prepare("UPDATE inbox_messages SET telegram_message_id=? WHERE id=?")
            .bind(String(result.result.message_id),id).run();
        }
      }catch{}
    }
    return json({sent:true,id,telegramNotified,aiReplied,handoffStatus:handoff?.handoff_status||"ai"},201);
  }catch{return json({error:"Unable to send your message. Please try again."},500);}
}

export async function onRequestDelete({request,env}){
  if(!allowed(request)) return json({error:"Request origin is not allowed."},403);
  if(!env.DB) return json({error:"D1 database binding DB is not configured."},503);
  let input;try{input=await request.json();}catch{return json({error:"Invalid clear request."},400);}
  const chatId=typeof input?.chatId==="string"?input.chatId:"";
  const token=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")||"";
  try{
    await ensureTables(env.DB);
    if(!(await authorize(env.DB,chatId,token))) return json({error:"Chat session is invalid or expired."},401);
    await env.DB.prepare("DELETE FROM inbox_messages WHERE chat_id=?").bind(chatId).run();
    await env.DB.prepare("UPDATE inbox_chats SET updated_at=CURRENT_TIMESTAMP,last_message_at=NULL WHERE chat_id=?").bind(chatId).run();
    return json({cleared:true});
  }catch{return json({error:"Unable to clear chat messages."},500);}
}
