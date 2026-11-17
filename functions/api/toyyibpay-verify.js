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

export async function onRequestGet({request,env}){
  if(!env.DB) return json({error:"D1 database binding DB is not configured."},503);
  const id=new URL(request.url).searchParams.get("order_id")||"";
  if(!/^[0-9a-f-]{36}$/i.test(id)) return json({error:"Invalid order reference."},400);
  try{
    await ensureTable(env.DB);
    const order=await env.DB.prepare("SELECT status,package_name,amount,currency,created_at,paid_at FROM toyyibpay_orders WHERE id=?").bind(id).first();
    if(!order) return json({error:"Order not found."},404);
    return json({status:order.status,packageName:order.package_name,amount:order.amount,currency:order.currency,createdAt:order.created_at,paidAt:order.paid_at});
  }catch{return json({error:"Unable to retrieve order status."},500);}
}
