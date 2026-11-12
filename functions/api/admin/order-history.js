const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function onRequest({request,env}){
 if(!env.DB)return json({error:"Booking database is not configured."},503);
 const email=(request.headers.get("Cf-Access-Authenticated-User-Email")||"").trim().toLowerCase();
 const allowed=(env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
 if(!email||!allowed.includes(email))return json({error:"Admin access denied."},401);
 if(request.method!=="GET")return json({error:"Method not allowed."},405);
 const id=(new URL(request.url).searchParams.get("id")||"").trim().slice(0,40);
 if(!id)return json({error:"Order ID is required."},400);
 const rows=await env.DB.prepare("SELECT old_status,new_status,admin_email,note,changed_at FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC").bind(id).all();
 return json({history:rows.results||[]});
}
