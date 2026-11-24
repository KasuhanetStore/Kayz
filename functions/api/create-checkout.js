const PACKAGES = {
  "landing-page": {
    name: "KasuhaNET Landing Page Package",
    amount: 29900
  },
  "premium-standard": {
    name: "KasuhaNET Premium Standard",
    amount: 90000
  },
  "dualstream-pro": {
    name: "DualStream Pro",
    amount: 4770
  }
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

const ALLOWED_HOSTS = new Set([
  "kasuhanet.store",
  "www.kasuhanet.store"
]);

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function ensureTermsColumns(db, table) {
  if (table !== "stripe_orders" && table !== "toyyibpay_orders") throw new Error("Invalid order table.");
  const info = await db.prepare("PRAGMA table_info(" + table + ")").all();
  const columns = new Set((info.results || []).map(column => column.name));
  if (!columns.has("terms_accepted")) await db.prepare("ALTER TABLE " + table + " ADD COLUMN terms_accepted INTEGER NOT NULL DEFAULT 0").run();
  if (!columns.has("terms_version")) await db.prepare("ALTER TABLE " + table + " ADD COLUMN terms_version TEXT").run();
  if (!columns.has("terms_accepted_at")) await db.prepare("ALTER TABLE " + table + " ADD COLUMN terms_accepted_at TEXT").run();
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

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;
  const origin = request.headers.get("Origin");

  let originUrl;
  let requestUrl;
  try {
    if (origin) originUrl = new URL(origin);
    requestUrl = new URL(request.url);
  } catch {
    return json({ error: "Request origin is not allowed." }, 403);
  }

  const allowedOrigin =
    originUrl &&
    originUrl.protocol === "https:" &&
    ALLOWED_HOSTS.has(originUrl.hostname) &&
    originUrl.origin === requestUrl.origin;

  if (!allowedOrigin) {
    return json({ error: "Request origin is not allowed." }, 403);
  }

  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Stripe secret key is not configured for this deployment." }, 503);
  }
  if (!env.DB) {
    return json({ error: "D1 database binding DB is not configured." }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid checkout request." }, 400);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ error: "Invalid checkout details." }, 400);
  }

  if (input.termsAccepted !== true || input.termsVersion !== "2026-11-25") return json({ error: "Please accept the current Terms & Conditions before payment." }, 400);

  const selected = PACKAGES[input.packageId];
  const rawServiceIds = input.serviceIds;
  let selectedServices = [];
  if (Array.isArray(rawServiceIds)) {
    if (rawServiceIds.length < 1 || rawServiceIds.length > 14) {
      return json({ error: "Select between 1 and 14 workshop services." }, 400);
    }
    const uniqueIds = [...new Set(rawServiceIds)];
    if (uniqueIds.length !== rawServiceIds.length) {
      return json({ error: "Duplicate workshop services are not allowed." }, 400);
    }
    selectedServices = uniqueIds.map(id => WORKSHOP_SERVICES[id]);
    if (selectedServices.some(service => !service)) {
      return json({ error: "One or more selected services are invalid." }, 400);
    }
  }

  const isWorkshopOrder = selectedServices.length > 0;
  const orderName = isWorkshopOrder
    ? selectedServices.map(service => service.name).join(", ")
    : selected?.name;
  const amount = isWorkshopOrder
    ? selectedServices.reduce((sum, service) => sum + service.amount, 0)
    : selected?.amount;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";

  if (!isWorkshopOrder && !selected) return json({ error: "Please select a valid package or workshop service." }, 400);
  if (name.length < 2 || name.length > 100) {
    return json({ error: "Please enter a valid full name." }, 400);
  }
  if (email.length > 254 || !/^[^\s@]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(email)) {
    return json({ error: "Please enter a valid email address with a complete domain." }, 400);
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^[+0-9().\s-]+$/.test(phone) || phoneDigits.length < 9 || phoneDigits.length > 15) {
    return json({ error: "Please enter a phone number containing 9 to 15 digits." }, 400);
  }

  if (!(await verifyRecaptcha(input.recaptchaToken, env, isWorkshopOrder ? "workshop_checkout" : "checkout"))) {
    return json({ error: "Security verification failed. Please refresh the page and try again." }, 403);
  }

  const orderId = crypto.randomUUID();

  try {
    await ensureTermsColumns(env.DB, "stripe_orders");
    await env.DB.prepare(
      `INSERT INTO stripe_orders
       (id, package_id, package_name, amount, currency, customer_name, customer_email, customer_phone, status, terms_accepted, terms_version, terms_accepted_at)
       VALUES (?, ?, ?, ?, 'myr', ?, ?, ?, 'pending', 1, ?, CURRENT_TIMESTAMP)`
    ).bind(
      orderId,
      isWorkshopOrder ? "custom-workshop" : input.packageId,
      orderName,
      amount,
      name,
      email,
      phone,
      input.termsVersion
    ).run();
  } catch {
    return json({ error: "Unable to save the order. Please try again." }, 500);
  }

  const form = new URLSearchParams();
  form.set("mode", "payment");
  const locale = input.locale === "MS" ? "MS" : "EN";
  const returnPage = isWorkshopOrder
    ? (locale === "MS"
        ? "https://kasuhanet.store/MS/Bengkel-Custom-WebSite-MS.html"
        : "https://kasuhanet.store/custom-web-workshop-EN.html")
    : input.packageId === "dualstream-pro"
      ? (locale === "MS"
          ? "https://kasuhanet.store/MS/Terminal-Option_MS.html"
          : "https://kasuhanet.store/Terminal-Option_EN.html")
      : (locale === "MS"
          ? "https://kasuhanet.store/MS/Banner-WebSale-MS.html"
          : "https://kasuhanet.store/Banner-WebSale-EN.html");
  form.set("success_url", returnPage + "?payment=success&session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url", returnPage + "?payment=cancel");
  form.set("customer_email", email);
  form.set("customer_creation", "always");
  form.set("billing_address_collection", "auto");
  form.set("phone_number_collection[enabled]", "true");
  const stripeItems = isWorkshopOrder
    ? selectedServices
    : [{ name: selected.name, amount: selected.amount }];
  stripeItems.forEach((item, index) => {
    form.set(`line_items[${index}][quantity]`, "1");
    form.set(`line_items[${index}][price_data][currency]`, "myr");
    form.set(`line_items[${index}][price_data][unit_amount]`, String(item.amount));
    form.set(`line_items[${index}][price_data][product_data][name]`, item.name);
    form.set(`line_items[${index}][price_data][product_data][description]`, input.packageId === "dualstream-pro" ? "DualStream Pro Linux terminal downloader software." : "KasuhaNET one-time setup and deployment service");
  });
  form.set("metadata[order_id]", orderId);
  form.set("metadata[package_id]", isWorkshopOrder ? "custom-workshop" : input.packageId);
  if (isWorkshopOrder) {
    form.set("metadata[service_ids]", rawServiceIds.join(","));
  }
  form.set("metadata[customer_name]", name);
  form.set("metadata[customer_email]", email);
  form.set("metadata[customer_phone]", phone);

  let stripeResponse;
  try {
    stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    });
  } catch {
    await env.DB.prepare(
      "UPDATE stripe_orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(orderId).run();
    return json({ error: "Unable to reach the payment provider. Please try again." }, 502);
  }

  let stripeData;
  try {
    stripeData = await stripeResponse.json();
  } catch {
    stripeData = {};
  }

  if (!stripeResponse.ok || !stripeData.url || !stripeData.id) {
    await env.DB.prepare(
      "UPDATE stripe_orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(orderId).run();
    const stripeMessage = stripeData?.error?.message;
    return json({
      error: stripeMessage
        ? "Stripe checkout error: " + String(stripeMessage).slice(0, 240)
        : "Stripe could not create the checkout session. Check the Stripe account configuration."
    }, 502);
  }

  try {
    await env.DB.prepare(
      `UPDATE stripe_orders
       SET stripe_checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(stripeData.id, orderId).run();
  } catch {
    return json({ error: "Checkout was created but the order could not be linked. Contact support before retrying." }, 500);
  }

  return json({ url: stripeData.url }, 200);
}
