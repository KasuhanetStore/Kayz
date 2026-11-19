const REDIRECT_URI = "https://www.kasuhanet.store/api/social-hub/tiktok/callback";
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
function safeEqual(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
async function ensureTable(db){await db.prepare("CREATE TABLE IF NOT EXISTS social_hub_tiktok_oauth_state (state_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();}
export async function onRequestPost({request,env}){
 const expected=env.SOCIAL_HUB_ADMIN_TOKEN;
 const supplied=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!expected||!safeEqual(supplied,expected))return json({error:"Admin authentication required."},401);
 if(!env.DB||!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET||!env.TIKTOK_TOKEN_ENCRYPTION_KEY)return json({error:"TikTok API configuration is incomplete. Check D1, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and TIKTOK_TOKEN_ENCRYPTION_KEY."},503);
 try{
  await ensureTable(env.DB);
  const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
  const expires=Math.floor(Date.now()/1000)+600;
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(state));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  await env.DB.prepare("DELETE FROM social_hub_tiktok_oauth_state WHERE expires_at < ?").bind(Math.floor(Date.now()/1000)).run();
  await env.DB.prepare("INSERT INTO social_hub_tiktok_oauth_state (state_hash,expires_at) VALUES (?,?)").bind(hash,expires).run();
  const auth=new URL("https://www.tiktok.com/v2/auth/authorize/");
  auth.searchParams.set("client_key",env.TIKTOK_CLIENT_KEY);
  auth.searchParams.set("response_type","code");
  auth.searchParams.set("scope","user.info.basic");
  auth.searchParams.set("redirect_uri",REDIRECT_URI);
  auth.searchParams.set("state",state);
  return json({authorizationUrl:auth.toString()});
 }catch{return json({error:"Unable to start TikTok authorization."},500);}
}
