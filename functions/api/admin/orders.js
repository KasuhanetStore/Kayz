const STATUSES=new Set(["Pending","Confirmed","In Progress","Completed","Cancelled"]);
const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
function adminEmail(request,env){const email=(request.headers.get("Cf-Access-Authenticated-User-Email")||"").trim().toLowerCase();const allowed=(env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);return email&&allowed.includes(email)?email:null;}
export async function onRequest({request,env}){
 if(!env.DB)return json({error:"Booking database is not configured."},503);
 const actor=adminEmail(request,env);if(!actor)return json({error:"Admin access denied. Sign in through Cloudflare Access."},401);
 if(request.method==="GET"){
  const url=new URL(request.url),status=url.searchParams.get("status")||"",q=(url.searchParams.get("q")||"").trim().slice(0,100),conditions=[],values=[];
  if(STATUSES.has(status)){conditions.push("status = ?");values.push(status);}
  if(q){conditions.push("(id LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR customer_phone LIKE ?)");values.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`);}
  const rows=await env.DB.prepare(`SELECT id,customer_name,customer_email,customer_phone,package_name,amount_cents,currency,status,customer_note,admin_note,is_demo,created_at,updated_at FROM orders ${conditions.length?"WHERE "+conditions.join(" AND "):""} ORDER BY created_at DESC LIMIT 250`).bind(...values).all();
  return json({orders:rows.results||[]});
 }
 if(request.method!=="PATCH")return json({error:"Method not allowed."},405);
 let input;try{input=await request.json();}catch{return json({error:"Invalid JSON request."},400);}
 const id=String(input.id||"").trim().slice(0,40),status=String(input.status||"").trim(),note=String(input.note||"").trim().slice(0,1000);
 if(!id||!STATUSES.has(status))return json({error:"A valid order ID and status are required."},400);
 const current=await env.DB.prepare("SELECT status FROM orders WHERE id = ?").bind(id).first();if(!current)return json({error:"Order not found."},404);
 const now=new Date().toISOString();
 try{await env.DB.batch([
  env.DB.prepare("UPDATE orders SET status = ?,admin_note = ?,updated_at = ? WHERE id = ?").bind(status,note,now,id),
  env.DB.prepare("INSERT INTO order_status_history (id,order_id,old_status,new_status,admin_email,note,changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(),id,current.status,status,actor,note,now)
 ]);}catch(error){console.error("Order status update failed",error);return json({error:"The status change could not be saved."},500);}
 return json({success:true,id,old_status:current.status,new_status:status,changed_at:now});
}
