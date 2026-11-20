import { createPaidInvoiceRecord } from "./order-operations.js";
const PACKAGES = {
  "landing-page": { name: "KasuhaNET Landing Page Package", amount: 29900 },
  "premium-standard": { name: "KasuhaNET Premium Standard", amount: 90000 }
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
function md5(input) {
  const bytes = new TextEncoder().encode(input);
  const words = [];
  for (let i = 0; i < bytes.length; i++) words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << ((i % 4) * 8));
  words[bytes.length >> 2] = (words[bytes.length >> 2] || 0) | (0x80 << ((bytes.length % 4) * 8));
  const bitLength = bytes.length * 8;
  const padIndex = (((bytes.length + 8) >>> 6) << 4) + 14;
  while (words.length <= padIndex + 1) words.push(0);
  words[padIndex] = bitLength >>> 0;
  words[padIndex + 1] = Math.floor(bitLength / 0x100000000);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const shifts = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const k = Array.from({length:64}, (_,i)=>Math.floor(Math.abs(Math.sin(i+1))*0x100000000)>>>0);
  const rot = (x,n)=>(x<<n)|(x>>>(32-n));
  for(let offset=0; offset<words.length; offset+=16){
    let a=a0,b=b0,c=c0,d=d0;
    for(let i=0;i<64;i++){
      let f,g;
      if(i<16){f=(b&c)|(~b&d);g=i;}
      else if(i<32){f=(d&b)|(~d&c);g=(5*i+1)%16;}
      else if(i<48){f=b^c^d;g=(3*i+5)%16;}
      else{f=c^(b|~d);g=(7*i)%16;}
      const sum=(a+f+k[i]+(words[offset+g]||0))|0;
      const next=(b+rot(sum,shifts[i]))|0;
      a=d;d=c;c=b;b=next;
    }
    a0=(a0+a)|0;b0=(b0+b)|0;c0=(c0+c)|0;d0=(d0+d)|0;
  }
  return [a0,b0,c0,d0].map(n=>[0,8,16,24].map(s=>((n>>>s)&255).toString(16).padStart(2,"0")).join("")).join("");
}
async function verifyPaidTransaction(env, billCode, externalRef, expectedAmount){
  const form=new URLSearchParams({billCode,userSecretKey:env.TOYYIBPAY_SECRET_KEY.trim()});
  const response=await fetch(API+"/getBillTransactions",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()});
  if(!response.ok) return false;
  let rows;try{rows=await response.json();}catch{return false;}
  if(!Array.isArray(rows)) return false;
  return rows.some(row=>{
    const amount=Math.round(Number(row.billpaymentAmount)*100);
    return String(row.billExternalReferenceNo||"")===externalRef &&
      String(row.billpaymentStatus||"") === "1" &&
      Number.isFinite(amount) && amount===expectedAmount;
  });
}
export async function onRequestPost({request,env}){
  if(!env.DB || !env.TOYYIBPAY_SECRET_KEY) return new Response("Configuration error",{status:503});
  let form;try{form=await request.formData();}catch{return new Response("Invalid callback",{status:400});}
  const status=String(form.get("status")||"");
  const billCode=String(form.get("billcode")||"");
  const externalRef=String(form.get("order_id")||"");
  const refno=String(form.get("refno")||"");
  const receivedHash=String(form.get("hash")||"").toLowerCase();
  if(!/^[a-zA-Z0-9]+$/.test(billCode) || !/^[A-Z0-9]{20}$/.test(externalRef) || !refno || !["1","2","3"].includes(status)) return new Response("Invalid callback fields",{status:400});
  const expectedHash=md5(env.TOYYIBPAY_SECRET_KEY.trim()+status+externalRef+refno+"ok");
  if(receivedHash!==expectedHash) return new Response("Invalid callback hash",{status:400});
  await ensureTable(env.DB);
  const order=await env.DB.prepare("SELECT id,amount,bill_code,external_ref,status FROM toyyibpay_orders WHERE external_ref=?").bind(externalRef).first();
  if(!order || order.bill_code!==billCode) return new Response("Order not found",{status:404});
  if(order.status==="paid") { try { await createPaidInvoiceRecord(env.DB,"toyyibpay",order.id); return new Response("OK",{status:200}); } catch { return new Response("Invoice record pending retry",{status:500}); } }
  let nextStatus=status==="2"?"pending":status==="3"?"failed":"pending";
  if(status==="1"){
    let verified=false;try{verified=await verifyPaidTransaction(env,billCode,externalRef,Number(order.amount));}catch{verified=false;}
    if(!verified) return new Response("Payment verification pending",{status:202});
    nextStatus="paid";
  }
  await env.DB.prepare(`UPDATE toyyibpay_orders SET status=?,
    payment_ref=?,paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,CURRENT_TIMESTAMP) ELSE paid_at END,
    updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='paid'`).bind(nextStatus,refno,nextStatus,order.id).run();
  if(nextStatus==="paid") { try { await createPaidInvoiceRecord(env.DB,"toyyibpay",order.id); } catch { return new Response("Invoice record pending retry",{status:500}); } }
  return new Response("OK",{status:200,headers:{"Cache-Control":"no-store"}});
}
