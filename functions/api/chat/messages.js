const ALLOWED_HOSTS = new Set(["kasuhanet.store", "www.kasuhanet.store"]);
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
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
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_inbox_messages_chat_created ON inbox_messages(chat_id, created_at)").run();
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
      WHERE chat_id=? ORDER BY created_at DESC LIMIT 100`).bind(chatId).all();
    return json({messages:(rows.results||[]).reverse()});
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
  if(!message || message.length>maxLength) return json({error:attachment?"Attachment is too large. Please use a smaller file.":"Message must contain 1 to 500 characters."},400);
  if(attachment?.kind==="image" && (typeof attachment.data!=="string" || !/^data:image\/(jpeg|png|webp);base64,/.test(attachment.data))) return json({error:"Invalid image attachment."},400);
  if(attachment?.kind==="voice" && (typeof attachment.data!=="string" || !/^data:audio\/[a-z0-9.+-]+(?:;[^,]+)*;base64,/i.test(attachment.data))) return json({error:"Invalid voice attachment."},400);
  if(attachment?.kind==="location" && (!Number.isFinite(attachment.lat)||!Number.isFinite(attachment.lng)||Math.abs(attachment.lat)>90||Math.abs(attachment.lng)>180)) return json({error:"Invalid location."},400);
  try{
    await ensureTables(env.DB);
    if(!(await authorize(env.DB,chatId,token))) return json({error:"Chat session is invalid or expired."},401);
    const recent=await env.DB.prepare(`SELECT COUNT(*) AS total FROM inbox_messages
      WHERE chat_id=? AND sender='buyer' AND created_at>=datetime('now','-1 minute')`).bind(chatId).first();
    if((recent?.total||0)>=10) return json({error:"Please wait before sending another message."},429);
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO inbox_messages (id,chat_id,sender,message) VALUES (?,?,'buyer',?)").bind(id,chatId,message).run();
    await env.DB.prepare("UPDATE inbox_chats SET updated_at=CURRENT_TIMESTAMP,last_message_at=CURRENT_TIMESTAMP WHERE chat_id=?").bind(chatId).run();

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
          formData.append(attachment.kind==="image"?"photo":"voice",new Blob([bytes],{type:mime}),attachment.kind==="image"?"customer-image.jpg":"customer-voice.webm");
          method=attachment.kind==="image"?"sendPhoto":"sendVoice";body=formData;
        }else body={chat_id:env.TELEGRAM_ADMIN_CHAT_ID,text:"<b>New KasuhaNET Inbox Message</b>\\nChat ID: <code>"+chatId+"</code>\\n\\n"+safeMessage,parse_mode:"HTML",disable_web_page_preview:true,reply_markup:{inline_keyboard:[[{text:"Reply to Customer",callback_data:"inbox:reply:"+chatId}]]}};
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
    return json({sent:true,id,telegramNotified},201);
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
