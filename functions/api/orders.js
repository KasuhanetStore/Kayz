const PACKAGES = {
 "landing-page": { name: "Landing Page Package", amountCents: 29900 },
 "premium-standard": { name: "Premium Standard", amountCents: 90000 }
};
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const clean = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
export async function onRequestPost({ request, env }) {
 if (!env.DB) return json({ error: "Booking database is not configured." }, 503);
 let input; try { input = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
 const name=clean(input.name,120), email=clean(input.email,254).toLowerCase(), phone=clean(input.phone,32), note=clean(input.note,1000);
 const packageId=clean(input.packageId,40), selected=PACKAGES[packageId];
 if(name.length<2) return json({error:"Please enter your full name."},400);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Please enter a valid email address."},400);
 if(!/^\+?[0-9 ()-]{8,32}$/.test(phone)) return json({error:"Please enter a valid phone number."},400);
 if(!selected) return json({error:"The selected package is not available."},400);
 const key=clean(request.headers.get("Idempotency-Key")||"",100)||crypto.randomUUID();
 const existing=await env.DB.prepare("SELECT id, tracking_token, status, package_name, amount_cents, currency, created_at FROM orders WHERE idempotency_key = ?").bind(key).first();
 if(existing) return json({success:true,order:existing,reused:true});
 const id="KN-"+crypto.randomUUID().replace(/-/g,"").slice(0,12).toUpperCase(), token=crypto.randomUUID()+crypto.randomUUID(), now=new Date().toISOString();
 try {
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO orders (id,tracking_token,idempotency_key,customer_name,customer_email,customer_phone,package_id,package_name,amount_cents,currency,status,customer_note,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'MYR','Pending',?,?,?)`).bind(id,token,key,name,email,phone,packageId,selected.name,selected.amountCents,note,now,now),
   env.DB.prepare("INSERT INTO order_status_history (id,order_id,old_status,new_status,admin_email,note,changed_at) VALUES (?, ?, NULL, 'Pending', 'system', 'Order created by customer', ?)").bind(crypto.randomUUID(),id,now)
  ]);
 } catch(error) {
  if(String(error?.message||"").includes("UNIQUE")) { const duplicate=await env.DB.prepare("SELECT id,tracking_token,status,package_name,amount_cents,currency,created_at FROM orders WHERE idempotency_key = ?").bind(key).first(); if(duplicate)return json({success:true,order:duplicate,reused:true}); }
  console.error("Order creation failed",error); return json({error:"The order could not be saved. Please try again."},500);
 }
 return json({success:true,order:{id,tracking_token:token,status:"Pending",package_name:selected.name,amount_cents:selected.amountCents,currency:"MYR",created_at:now}},201);
}
export async function onRequestGet({request,env}) {
 if(!env.DB)return json({error:"Booking database is not configured."},503);
 const url=new URL(request.url),id=clean(url.searchParams.get("id"),40),token=clean(url.searchParams.get("token"),100);
 if(!id||!token)return json({error:"Order ID and tracking token are required."},400);
 const order=await env.DB.prepare("SELECT id,package_name,amount_cents,currency,status,customer_note,admin_note,created_at,updated_at FROM orders WHERE id = ? AND tracking_token = ?").bind(id,token).first();
 if(!order)return json({error:"Order not found."},404);
 const history=await env.DB.prepare("SELECT old_status,new_status,note,changed_at FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC").bind(id).all();
 return json({order,history:history.results||[]});
}
