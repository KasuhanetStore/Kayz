function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;

  const parts = header.split(",").map(part => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = timestamp + "." + payload;
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = toHex(digest);
  return signatures.some(signature => constantTimeEqual(signature, expected));
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: "Webhook is not configured." }, 503);
  }

  const payload = await request.text();
  const signature = request.headers.get("Stripe-Signature");

  let valid = false;
  try {
    valid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    valid = false;
  }

  if (!valid) return json({ error: "Invalid Stripe signature." }, 400);

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

  const orderId = session.metadata?.order_id;
  if (typeof orderId !== "string" || !orderId) {
    return json({ received: true });
  }

  try {
    if (
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      session.payment_status === "paid"
    ) {
      await env.DB.prepare(
        `UPDATE orders
         SET status = 'paid',
             stripe_payment_intent_id = ?,
             paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stripe_checkout_session_id = ?`
      ).bind(
        typeof session.payment_intent === "string" ? session.payment_intent : null,
        orderId,
        session.id
      ).run();
    } else if (event.type === "checkout.session.async_payment_failed") {
      await env.DB.prepare(
        `UPDATE orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stripe_checkout_session_id = ? AND status = 'pending'`
      ).bind(orderId, session.id).run();
    } else if (event.type === "checkout.session.expired") {
      await env.DB.prepare(
        `UPDATE orders SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stripe_checkout_session_id = ? AND status = 'pending'`
      ).bind(orderId, session.id).run();
    }
  } catch {
    // Return a failure so Stripe retries delivery instead of losing the update.
    return json({ error: "Unable to update the order record." }, 500);
  }

  return json({ received: true });
}
