function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
async function ensure(db){
 await db.prepare(`CREATE TABLE IF NOT EXISTS shopgo_products(
 sku TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT,image_url TEXT,wholesale_price REAL NOT NULL DEFAULT 0,
 sale_price REAL NOT NULL DEFAULT 0,category TEXT,stock INTEGER NOT NULL DEFAULT 0,source_url TEXT,
 active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 )`).run();
}
export async function onRequestPost({request,env}){
 if(!env.DB)return json({error:'D1 binding DB belum dikonfigurasi.'},503);
 if(!env.SHOPGO_IMPORT_TOKEN)return json({error:'Tetapkan SHOPGO_IMPORT_TOKEN dalam Cloudflare Pages Environment Variables.'},503);
 if(request.headers.get('X-ShopGO-Import-Token')!==env.SHOPGO_IMPORT_TOKEN)return json({error:'Token import tidak sah.'},401);
 let body;try{body=await request.json()}catch{return json({error:'JSON tidak sah.'},400)}
 if(!body||!Array.isArray(body.products)||body.products.length<1||body.products.length>200)return json({error:'Import memerlukan 1 hingga 200 produk setiap kelompok.'},400);
 const margin=Math.max(0,Math.min(500,Number(body.margin)||0));await ensure(env.DB);
 let imported=0,skipped=0;
 for(const p of body.products){
  const sku=String(p.sku||'').trim().slice(0,100),name=String(p.name||'').trim().slice(0,240);
  const wholesale=Number(p.wholesale_price),stock=Math.max(0,Math.floor(Number(p.stock)||0));
  if(!sku||!name||!Number.isFinite(wholesale)||wholesale<0){skipped++;continue}
  let image='';try{const u=new URL(String(p.image_url||''));if(['https:','http:'].includes(u.protocol))image=u.href}catch{}
  const sale=Number((wholesale*(1+margin/100)).toFixed(2));
  await env.DB.prepare(`INSERT INTO shopgo_products(sku,name,description,image_url,wholesale_price,sale_price,category,stock,source_url,updated_at)
   VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
   ON CONFLICT(sku) DO UPDATE SET name=excluded.name,description=excluded.description,image_url=excluded.image_url,
   wholesale_price=excluded.wholesale_price,sale_price=excluded.sale_price,category=excluded.category,stock=excluded.stock,
   source_url=excluded.source_url,updated_at=CURRENT_TIMESTAMP`)
   .bind(sku,name,String(p.description||'').slice(0,3000),image,wholesale,sale,String(p.category||'Mainan').slice(0,120),stock,String(p.source_url||'').slice(0,500)).run();
  imported++;
 }
 return json({ok:true,imported,skipped});
}