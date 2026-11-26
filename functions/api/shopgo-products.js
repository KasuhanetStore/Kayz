function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
export async function onRequestGet({env}){
 if(!env.DB)return json({error:'D1 database binding DB tidak tersedia.'},503);
 try{
  const result=await env.DB.prepare('SELECT sku,name,description,image_url,sale_price,category,stock FROM shopgo_products WHERE active=1 ORDER BY updated_at DESC LIMIT 300').all();
  return json({products:result.results||[]});
 }catch{return json({products:[]})}
}