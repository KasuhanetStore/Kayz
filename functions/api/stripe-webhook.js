function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;

  const parts = header.split(",").map(part => part.trim());
  const timestampPart = parts.find(part => part.startsWith("t="));
  const signatures = parts
    .filter(part => part.startsWith("v1="))
    .map(part => part.slice(3));

  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isInteger(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signedPayload = timestamp + "." + payload;
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expected = bytesToHex(digest);

  return signatures.some(signature => {
    if (signature.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < expected.length; i++) {
      difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return difference === 0;
  });
}

function getPaymentIntentId(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.id === "string") return value.id;
  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return json({ error: "D1 database binding DB is not configured." }, 503);
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: "Stripe webhook signing secret is not configured." }, 503);
  }

  const payload = await request.text();
  const signature = request.headers.get("Stripe-Signature");

  let valid = false;
  try {
    valid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    valid = false;
  }

  if (!valid) {
    return json({ error: "Invalid Stripe signature." }, 400);
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Invalid event payload." }, 400);
  }

  const session = event?.data?.object;
  if (!session || typeof session.id !== "string") {
    return json({ received: true });
  }

  let status = null;
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    status = session.payment_status === "paid" ? "paid" : "pending";
  } else if (event.type === "checkout.session.async_payment_failed") {
    status = "failed";
  } else if (event.type === "checkout.session.expired") {
    status = "expired";
  }

  if (!status) {
    return json({ received: true });
  }

  const orderId = session.metadata?.order_id;
  const paymentIntentId = getPaymentIntentId(session.payment_intent);

  try {
    const result = orderId
      ? await env.DB.prepare(
          `UPDATE stripe_orders
           SET status = ?,
               stripe_checkout_session_id = ?,
               stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
               paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP) ELSE paid_at END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`
        ).bind(status, session.id, paymentIntentId, status, orderId).run()
      : await env.DB.prepare(
          `UPDATE stripe_orders
           SET status = ?,
               stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
               paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP) ELSE paid_at END,
               updated_at = CURRENT_TIMESTAMP
           WHERE stripe_checkout_session_id = ?`
        ).bind(status, paymentIntentId, status, session.id).run();

    if (result.meta && result.meta.changes === 0) {
      return json({ error: "Order not found for this Stripe session." }, 404);
    }
  } catch {
    return json({ error: "Unable to update the order in D1." }, 500);
  }

  return json({ received: true });
}
