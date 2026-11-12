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
    return json({ error: "Stripe test key is not configured for this deployment." }, 503);
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
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";

  if (!selected) return json({ error: "Please select a valid package." }, 400);
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
    ).bind(orderId, input.packageId, selected.name, selected.amount, name, email, phone).run();
  } catch {
    return json({ error: "Unable to save the order. Please try again." }, 500);
  }

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", "https://kasuhanet.store/Banner-WebSale-EN.html?payment=success");
  form.set("cancel_url", "https://kasuhanet.store/Banner-WebSale-EN.html?payment=cancel");
  form.set("customer_email", email);
  form.set("customer_creation", "always");
  form.set("billing_address_collection", "auto");
  form.set("phone_number_collection[enabled]", "true");
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "myr");
  form.set("line_items[0][price_data][unit_amount]", String(selected.amount));
  form.set("line_items[0][price_data][product_data][name]", selected.name);
  form.set("line_items[0][price_data][product_data][description]", "One-time website development service");
  form.set("metadata[order_id]", orderId);
  form.set("metadata[package_id]", input.packageId);
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
