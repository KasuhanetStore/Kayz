function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff"
    }
  });
}
function safeEqual(a,b){
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length) return false;
  let diff=0;
  for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function telegram(token,method){
  const response=await fetch("https://api.telegram.org/bot"+token+"/"+method,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:"{}"
  });
  const data=await response.json();
  if(!response.ok||!data.ok) throw new Error("Telegram API unavailable");
  return data.result;
}
export async function onRequestGet({request,env}){
  const expected=env.SOCIAL_HUB_ADMIN_TOKEN;
  const supplied=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!expected||!safeEqual(supplied,expected)) return json({error:"Admin authentication required."},401);
  if(!env.TELEGRAM_BOT_TOKEN) return json({error:"Telegram bot token is not configured."},503);
  try{
    const [bot,webhook]=await Promise.all([
      telegram(env.TELEGRAM_BOT_TOKEN,"getMe"),
      telegram(env.TELEGRAM_BOT_TOKEN,"getWebhookInfo")
    ]);
    return json({
      ok:true,
      bot:{id:String(bot.id),name:bot.first_name||"",username:bot.username||"",canJoinGroups:!!bot.can_join_groups},
      webhook:{
        configured:!!webhook.url,
        pendingUpdates:Number(webhook.pending_update_count||0),
        lastErrorDate:webhook.last_error_date||null,
        lastErrorMessage:webhook.last_error_message||null,
        maxConnections:webhook.max_connections||null,
        allowedUpdates:Array.isArray(webhook.allowed_updates)?webhook.allowed_updates:[]
      },
      checkedAt:new Date().toISOString()
    });
  }catch{
    return json({error:"Unable to retrieve Telegram bot or webhook status. Check the existing Telegram configuration."},502);
  }
}
