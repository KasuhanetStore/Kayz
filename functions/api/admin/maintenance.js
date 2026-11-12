const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const TYPES=new Set(["Backup","Security","Bug Fix","Update","Monitoring","Other"]),STATES=new Set(["Planned","In Progress","Completed","Blocked"]);
function getAdmin(request,env){const email=(request.headers.get("Cf-Access-Authenticated-User-Email")||"").trim().toLowerCase();const allowed=(env.ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);return email&&allowed.includes(email)?email:null;}
export async function onRequest({request,env}){
 if(!env.DB)return json({error:"Booking database is not configured."},503);
 const actor=getAdmin(request,env);if(!actor)return json({error:"Admin access denied."},401);
 if(request.method==="GET"){const rows=await env.DB.prepare("SELECT id,title,activity_type,description,status,performed_by,performed_at,is_demo,created_at FROM maintenance_logs ORDER BY performed_at DESC LIMIT 200").all();return json({logs:rows.results||[]});}
 if(request.method!=="POST")return json({error:"Method not allowed."},405);
 let input;try{input=await request.json();}catch{return json({error:"Invalid JSON request."},400);}
 const title=String(input.title||"").trim().slice(0,160),type=String(input.activity_type||"").trim(),description=String(input.description||"").trim().slice(0,2000),status=String(input.status||"Completed").trim(),performedAt=String(input.performed_at||new Date().toISOString()).trim();
 if(title.length<3||!TYPES.has(type)||!STATES.has(status)||!Number.isFinite(Date.parse(performedAt)))return json({error:"Please provide a title, valid activity type, status and date."},400);
 const id=crypto.randomUUID();await env.DB.prepare("INSERT INTO maintenance_logs (id,title,activity_type,description,status,performed_by,performed_at) VALUES (?,?,?,?,?,?,?)").bind(id,title,type,description,status,actor,new Date(performedAt).toISOString()).run();
 return json({success:true,id},201);
}
