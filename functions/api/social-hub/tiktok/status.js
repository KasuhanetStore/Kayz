function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
function safeEqual(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
export async function onRequestGet({request,env}){
 const expected=env.SOCIAL_HUB_ADMIN_TOKEN,supplied=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!expected||!safeEqual(supplied,expected))return json({error:"Admin authentication required."},401);
 if(!env.DB)return json({error:"D1 database binding DB is not configured."},503);
 try{
  const row=await env.DB.prepare("SELECT open_id,display_name,avatar_url,scopes,access_expires_at,refresh_expires_at,updated_at FROM social_hub_tiktok_connection WHERE id='primary'").first();
  if(!row)return json({connected:false});
  return json({connected:true,profile:{openId:row.open_id||"",displayName:row.display_name||"TikTok account",avatarUrl:row.avatar_url||""},scopes:row.scopes||"",accessExpiresAt:row.access_expires_at||null,refreshExpiresAt:row.refresh_expires_at||null,updatedAt:row.updated_at||null});
 }catch{return json({error:"Unable to read TikTok connection status."},500);}
}
