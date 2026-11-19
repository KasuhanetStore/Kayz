const REDIRECT_URI = "https://www.kasuhanet.store/api/social-hub/tiktok/callback";
function escapeHtml(value){return String(value).replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c]));}\nfunction page(message,ok=false){const color=ok?"#80e8f3":"#f4a7a7";return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TikTok connection | KasuhaNET</title><style>body{margin:0;background:#070b12;color:#edf6ff;font:15px Arial;display:grid;min-height:100vh;place-items:center}.box{max-width:520px;margin:20px;padding:28px;border:1px solid #263748;border-radius:16px;background:#101824}h2{color:${color}}a{color:#80e8f3}</style><main class="box"><h2>${ok?"TikTok connected":"TikTok connection failed"}</h2><p>${escapeHtml(message)}</p><p><a href="/social-hub/">Return to Social Hub</a></p></main>`,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
async function ensureTables(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS social_hub_tiktok_oauth_state (state_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS social_hub_tiktok_connection (id TEXT PRIMARY KEY, encrypted_tokens TEXT NOT NULL, open_id TEXT, display_name TEXT, avatar_url TEXT, scopes TEXT, access_expires_at INTEGER, refresh_expires_at INTEGER, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
}
async function encryptionKey(secret){const raw=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt"]);}
async function encryptTokens(value,secret){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await encryptionKey(secret);const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(value)));const bytes=new Uint8Array(iv.length+encrypted.byteLength);bytes.set(iv);bytes.set(new Uint8Array(encrypted),iv.length);return btoa(String.fromCharCode(...bytes));}
export async function onRequestGet({request,env}){
 const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state");
 if(url.searchParams.has("error"))return page("TikTok menolak atau membatalkan kebenaran akses: "+(url.searchParams.get("error_description")||url.searchParams.get("error")));
 if(!code||!state||!env.DB||!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET||!env.TIKTOK_TOKEN_ENCRYPTION_KEY)return page("Callback tidak lengkap atau konfigurasi backend TikTok belum siap.");
 try{
  await ensureTables(env.DB);
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(state));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  const row=await env.DB.prepare("SELECT state_hash,expires_at FROM social_hub_tiktok_oauth_state WHERE state_hash=?").bind(hash).first();
  if(!row||Number(row.expires_at)<Math.floor(Date.now()/1000))return page("State OAuth tidak sah atau telah tamat tempoh. Mulakan sambungan sekali lagi.");
  await env.DB.prepare("DELETE FROM social_hub_tiktok_oauth_state WHERE state_hash=?").bind(hash).run();
  const body=new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,code,grant_type:"authorization_code",redirect_uri:REDIRECT_URI});
  const tokenResponse=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Cache-Control":"no-cache"},body});
  const tokens=await tokenResponse.json();
  if(!tokenResponse.ok||tokens.error||!tokens.access_token||!tokens.refresh_token)return page("TikTok gagal mengeluarkan token akses. Semak Redirect URI, Client Key dan status produk Login Kit.");
  const profileResponse=await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",{headers:{Authorization:"Bearer "+tokens.access_token}});
  const profile=await profileResponse.json();
  if(!profileResponse.ok||profile.error?.code&&profile.error.code!=="ok")return page("OAuth berjaya tetapi maklumat profil tidak dapat dibaca. Pastikan scope user.info.basic diluluskan.");
  const user=profile.data?.user||{};
  const encrypted=await encryptTokens({access_token:tokens.access_token,refresh_token:tokens.refresh_token,token_type:tokens.token_type,scope:tokens.scope},env.TIKTOK_TOKEN_ENCRYPTION_KEY);
  await env.DB.prepare(`INSERT INTO social_hub_tiktok_connection (id,encrypted_tokens,open_id,display_name,avatar_url,scopes,access_expires_at,refresh_expires_at,updated_at)
   VALUES ('primary',?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
   ON CONFLICT(id) DO UPDATE SET encrypted_tokens=excluded.encrypted_tokens,open_id=excluded.open_id,display_name=excluded.display_name,avatar_url=excluded.avatar_url,scopes=excluded.scopes,access_expires_at=excluded.access_expires_at,refresh_expires_at=excluded.refresh_expires_at,updated_at=CURRENT_TIMESTAMP`)
   .bind(encrypted,user.open_id||tokens.open_id||null,user.display_name||null,user.avatar_url||null,tokens.scope||"",Math.floor(Date.now()/1000)+Number(tokens.expires_in||7200),Math.floor(Date.now()/1000)+Number(tokens.refresh_expires_in||15552000)).run();
  return page("Akaun TikTok berjaya disambungkan. Kembali ke Social Hub untuk semak status.",true);
 }catch{return page("Ralat backend semasa memproses callback TikTok. Tiada token dipaparkan.");}
}
