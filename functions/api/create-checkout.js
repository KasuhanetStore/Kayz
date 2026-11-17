const PACKAGES = {
  "landing-page": {
    name: "KasuhaNET Landing Page Package",
    amount: 29900
  },
  "premium-standard": {
    name: "KasuhaNET Premium Standard",
    amount: 90000
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
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  if (phone.length > 25) {
    return json({ error: "Please enter a valid phone number." }, 400);
  }

  const orderId = crypto.randomUUID();

  try {
    await env.DB.prepare(
      `INSERT INTO stripe_orders
       (id, package_id, package_name, amount, currency, customer_name, customer_email, customer_phone, status)
       VALUES (?, ?, ?, ?, 'myr', ?, ?, ?, 'pending')`
    ).bind(
      orderId,
      isWorkshopOrder ? "custom-workshop" : input.packageId,
      orderName,
      amount,
      name,
      email,
      phone
    ).run();
  } catch {
    return json({ error: "Unable to save the order. Please try again." }, 500);
  }

  const form = new URLSearchParams();
  form.set("mode", "payment");
  const returnPage = isWorkshopOrder
    ? "https://kasuhanet.store/custom-web-workshop-EN"
    : "https://kasuhanet.store/Banner-WebSale-EN.html";
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
    form.set(`line_items[${index}][price_data][product_data][description]`, "KasuhaNET one-time setup and deployment service");
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
        : "Stripe could not create the checkout session. Check the Stripe test key and account configuration."
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
