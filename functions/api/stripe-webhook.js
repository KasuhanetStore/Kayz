import { sendAdminNotification } from "./_lib/admin-email.js";

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

  const paidEvent =
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded";
  const failedEvent = event.type === "checkout.session.async_payment_failed";
  const expiredEvent = event.type === "checkout.session.expired";

  if (!paidEvent && !failedEvent && !expiredEvent) {
    return json({ received: true });
  }

  const orderId = session.metadata?.order_id;
  if (
    typeof orderId !== "string" ||
    !orderId ||
    (session.client_reference_id && session.client_reference_id !== orderId)
  ) {
    return json({ error: "Checkout session does not contain a valid order reference." }, 400);
  }

  try {
    const orderResult = await env.DB.prepare(
      `SELECT id, package_id, package_name, amount, currency,
              customer_name, customer_email, customer_phone, status,
              stripe_checkout_session_id
       FROM stripe_orders
       WHERE id = ? AND stripe_checkout_session_id = ?
       LIMIT 1`
    ).bind(orderId, session.id).first();

    // Never match an order whose Stripe session ID is missing or different.
    if (!orderResult || !orderResult.stripe_checkout_session_id) {
      return json({ error: "No order matches this Stripe Checkout Session." }, 400);
    }

    if (paidEvent) {
      if (session.payment_status !== "paid") {
        return json({ received: true, payment_pending: true });
      }

      const amountMatches =
        Number.isInteger(session.amount_total) &&
        session.amount_total === Number(orderResult.amount);
      const currencyMatches =
        typeof session.currency === "string" &&
        session.currency.toLowerCase() === String(orderResult.currency).toLowerCase();
      const packageMatches =
        typeof session.metadata?.package_id === "string" &&
        session.metadata.package_id === orderResult.package_id;

      if (!amountMatches || !currencyMatches || !packageMatches) {
        return json({ error: "Payment amount, currency, or package does not match the order." }, 400);
      }

      await env.DB.prepare(
        `UPDATE stripe_orders
         SET status = 'paid',
             stripe_payment_intent_id = ?,
             paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND stripe_checkout_session_id = ?
           AND amount = ?
           AND LOWER(currency) = LOWER(?)
           AND status != 'paid'`
      ).bind(
        typeof session.payment_intent === "string" ? session.payment_intent : null,
        orderId,
        session.id,
        Number(orderResult.amount),
        String(orderResult.currency)
      ).run();

      try {
        await sendAdminNotification(env, {
          orderId,
          status: "paid",
          customerName: orderResult.customer_name,
          customerEmail: orderResult.customer_email,
          customerPhone: orderResult.customer_phone,
          packageName: orderResult.package_name,
          amount: orderResult.amount,
          currency: orderResult.currency,
          sessionId: session.id
        });
      } catch (error) {
        console.error("KasuhaNET paid notification failed:", error);
        return json({ error: "Payment recorded, but admin notification delivery failed. Stripe may retry this event." }, 500);
      }
    } else {
      const status = failedEvent ? "failed" : "expired";
      await env.DB.prepare(
        `UPDATE stripe_orders
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND stripe_checkout_session_id = ? AND status = 'pending'`
      ).bind(status, orderId, session.id).run();

      try {
        await sendAdminNotification(env, {
          orderId,
          status,
          customerName: orderResult.customer_name,
          customerEmail: orderResult.customer_email,
          customerPhone: orderResult.customer_phone,
          packageName: orderResult.package_name,
          amount: orderResult.amount,
          currency: orderResult.currency,
          sessionId: session.id
        });
      } catch (error) {
        console.error("KasuhaNET payment status notification failed:", error);
        return json({ error: "Order status recorded, but admin notification delivery failed. Stripe may retry this event." }, 500);
      }
    }
  } catch (error) {
    console.error("KasuhaNET Stripe webhook processing failed:", error);
    return json({ error: "Unable to update the order record." }, 500);
  }

  return json({ received: true });
}
