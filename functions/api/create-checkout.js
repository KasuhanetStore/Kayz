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

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
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

  if (origin !== "https://kasuhanet.store" && origin !== "https://www.kasuhanet.store") {
    return json({ error: "Request origin is not allowed." }, 403);
  }

  if (!env.STRIPE_SECRET_KEY) {
    return json({
      error: "Secure payment is not configured yet. Please contact KasuhaNET support."
    }, 503);
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
  form.set("metadata[package_id]", input.packageId);
  form.set("metadata[customer_name]", name);
  form.set("metadata[customer_email]", email);
  form.set("metadata[customer_phone]", phone.slice(0, 25));

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
    return json({ error: "Unable to reach the payment provider. Please try again." }, 502);
  }

  const stripeData = await stripeResponse.json();
  if (!stripeResponse.ok || !stripeData.url) {
    return json({
      error: "Stripe could not create the checkout session. Check the Stripe account configuration."
    }, 502);
  }

  return json({ url: stripeData.url }, 200);
}
