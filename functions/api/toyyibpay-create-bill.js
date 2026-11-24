const PACKAGES = {
  "landing-page": { name: "KasuhaNET Landing Page Package", amount: 29900 },
  "premium-standard": { name: "KasuhaNET Premium Standard", amount: 90000 },
  "dualstream-pro": { name: "DualStream Pro", amount: 4770 }
};
const WORKSHOP_SERVICES = {
  "domain-dns": { name: "Domain Management & DNS Routing", amount: 5000 },
  "vps-setup": { name: "Server / VPS Setup & Installation", amount: 12000 },
  "ssl": { name: "SSL Certificate Configuration (HTTPS)", amount: 5000 },
  "cms-script": { name: "CMS & Custom Script / Source Code Setup", amount: 15000 },
  "database": { name: "Database Setup & Migration", amount: 10000 },
  "payment-gateway": { name: "Local Payment Gateway Integration", amount: 15000 },
  "email": { name: "Custom Domain Official Email Setup", amount: 10000 },
  "troubleshooting": { name: "Troubleshooting & Error Fixing", amount: 10000 },
  "malware-security": { name: "Malware Cleanup & Web Security", amount: 25000 },
  "optimization": { name: "Speed & Performance Optimization", amount: 15000 },
  "migration": { name: "Full Website & Server Migration", amount: 20000 },
  "analytics": { name: "Analytics & Tracking Pixel Integration", amount: 8000 },
  "blogger-upgrade": { name: "Blogspot / Custom Platform Upgrade", amount: 12000 },
  "page-design": { name: "Page Design Scripts (HTML/CSS/JS)", amount: 18000 }
};
const API = "https://toyyibpay.com/index.php/api";
const ALLOWED_HOSTS = new Set(["kasuhanet.store", "www.kasuhanet.store"]);
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
async function ensureTable(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS toyyibpay_orders (
    id TEXT PRIMARY KEY, external_ref TEXT NOT NULL UNIQUE, bill_code TEXT UNIQUE,
    package_id TEXT NOT NULL, package_name TEXT NOT NULL, amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'myr', customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL, customer_phone TEXT, status TEXT NOT NULL DEFAULT 'pending',
    payment_ref TEXT, paid_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function verifyRecaptcha(token, env, expectedAction) {
  if (!env.RECAPTCHA_SECRET_KEY || typeof token !== "string" || token.length > 4096) return false;
  try {
    const body = new URLSearchParams({
      secret: env.RECAPTCHA_SECRET_KEY,
      response: token
    });
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true &&
      result.action === expectedAction &&
      ALLOWED_HOSTS.has(result.hostname) &&
      typeof result.score === "number" &&
      result.score >= 0.5;
  } catch {
    return false;
  }
}

export async function onRequestPost({request,env}){
  if(!env.DB) return json({error:"D1 database binding DB is not configured."},503);
  if(!env.TOYYIBPAY_SECRET_KEY || !env.TOYYIBPAY_CATEGORY_CODE) return json({error:"ToyyibPay Live credentials are not configured."},503);
  let url, origin;
  try{url=new URL(request.url);const raw=request.headers.get("Origin");if(raw)origin=new URL(raw);}catch{return json({error:"Invalid request origin."},403);}
  if(!origin || origin.protocol!=="https:" || !ALLOWED_HOSTS.has(origin.hostname) || origin.origin!==url.origin) return json({error:"Request origin is not allowed."},403);
  let input;try{input=await request.json();}catch{return json({error:"Invalid checkout request."},400);}
  if(!input || typeof input!=="object" || Array.isArray(input)) return json({error:"Invalid checkout details."},400);
  const rawIds=input.serviceIds;
  let services=[];
  if(Array.isArray(rawIds)){
    if(rawIds.length<1 || rawIds.length>14 || new Set(rawIds).size!==rawIds.length) return json({error:"Select between 1 and 14 unique workshop services."},400);
    services=rawIds.map(id=>WORKSHOP_SERVICES[id]);
    if(services.some(x=>!x)) return json({error:"One or more selected services are invalid."},400);
  }
  const isWorkshop=services.length>0;
  const selected=PACKAGES[input.packageId];
  if(!isWorkshop && !selected) return json({error:"Please select a valid package or workshop service."},400);
  const amount=isWorkshop?services.reduce((n,x)=>n+x.amount,0):selected.amount;
  const packageName=isWorkshop?services.map(x=>x.name).join(", "):selected.name;
  const name=typeof input.name==="string"?input.name.trim():"";
  const email=typeof input.email==="string"?input.email.trim():"";
  const phone=typeof input.phone==="string"?input.phone.trim():"";
  if(name.length<2 || name.length>100) return json({error:"Please enter a valid full name."},400);
  if(email.length>254 || !/^[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(email)) return json({error:"Please enter a valid email address with a complete domain."},400);
  const phoneDigits=phone.replace(/\D/g,"");
  if(!/^[+0-9().\s-]+$/.test(phone) || phoneDigits.length<9 || phoneDigits.length>15) return json({error:"Please enter a phone number containing 9 to 15 digits."},400);
  if(!(await verifyRecaptcha(input.recaptchaToken,env,isWorkshop?"workshop_checkout":"checkout"))) {
    return json({error:"Pengesahan keselamatan gagal. Sila muat semula halaman dan cuba lagi."},403);
  }
  const id=crypto.randomUUID();
  const externalRef=id.replace(/-/g,"").slice(0,20).toUpperCase();
  try{
    await ensureTable(env.DB);
    await env.DB.prepare(`INSERT INTO toyyibpay_orders (id,external_ref,package_id,package_name,amount,customer_name,customer_email,customer_phone,status)
      VALUES(?,?,?,?,?,?,?,?,'pending')`).bind(id,externalRef,isWorkshop?"custom-workshop":input.packageId,packageName,amount,name,email,phone).run();
  }catch{return json({error:"Unable to save the ToyyibPay order. Please try again."},500);}
  const locale=input.locale==="MS"?"MS":"EN";
  const returnPage=isWorkshop?(locale==="MS"?"https://kasuhanet.store/MS/Bengkel-Custom-WebSite-MS.html":"https://kasuhanet.store/custom-web-workshop-EN"):(input.packageId==="dualstream-pro"?"https://kasuhanet.store/Terminal-Option_MS.html":"https://kasuhanet.store/Banner-WebSale-EN.html");
  const billName=("KasuhaNET_"+externalRef).slice(0,30);
  const billDescription=(input.packageId==="dualstream-pro"?"DualStream Pro "+externalRef:"Payment_"+externalRef).slice(0,100);
  // Check whether DuitNow QR has been activated for this ToyyibPay merchant.
  // If it is not active or the status endpoint is unavailable, keep the existing FPX/card checkout working.
  let duitNowQrEnabled=false;
  try{
    const statusForm=new URLSearchParams({userSecretKey:env.TOYYIBPAY_SECRET_KEY.trim()});
    const statusResponse=await fetch(API+"/checkDuitNowQRStatus",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:statusForm.toString()});
    const statusRaw=await statusResponse.text();
    const statusData=JSON.parse(statusRaw);
    duitNowQrEnabled=statusResponse.ok && statusData?.status==="success" && statusData?.duitnowqr_activated===true;
  }catch{
    duitNowQrEnabled=false;
  }
  const billFields={
    userSecretKey:env.TOYYIBPAY_SECRET_KEY.trim(),
    categoryCode:env.TOYYIBPAY_CATEGORY_CODE.trim(),
    billName,billDescription,billPriceSetting:"1",billPayorInfo:"1",
    billAmount:String(amount),billReturnUrl:returnPage+"?payment=toyyibpay_return&order_id="+encodeURIComponent(id),
    billCallbackUrl:"https://kasuhanet.store/api/toyyibpay-callback",
    billExternalReferenceNo:externalRef,billTo:name,billEmail:email,billPhone:phone,
    billPaymentChannel:"2",billExpiryDays:"1"
  };
  if(duitNowQrEnabled){
    billFields.enableDuitNowQR="1";
    billFields.chargeDuitNowQR="0";
  }
  const form=new URLSearchParams(billFields);
  let response, raw;
  try{
    response=await fetch(API+"/createBill",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()});
    raw=await response.text();
  }catch{
    await env.DB.prepare("UPDATE toyyibpay_orders SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    return json({error:"Unable to reach ToyyibPay Live. Please try again."},502);
  }
  let data;try{data=JSON.parse(raw);}catch{data=null;}
  const billCode=Array.isArray(data)?data[0]?.BillCode:null;
  if(!billCode || !/^[a-zA-Z0-9]+$/.test(billCode)){
    await env.DB.prepare("UPDATE toyyibpay_orders SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    return json({error:"ToyyibPay could not create the bill. Check the Live Secret Key, active Category Code and payment channel."},502);
  }
  try{
    await env.DB.prepare("UPDATE toyyibpay_orders SET bill_code=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(billCode,id).run();
  }catch{return json({error:"Bill created but order linking failed. Contact support before retrying."},500);}
  return json({url:"https://toyyibpay.com/"+billCode,orderId:id},200);
}
