const ADMIN_EMAIL = "kasuhaoculusorganisation@kasuhanet.store";

export async function sendAdminNotification(env, { orderId, status, customerName, customerEmail, customerPhone, packageName, amount, currency = "myr", sessionId }) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return { sent: false, reason: "email_provider_not_configured" };
  }

  const amountText = new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: String(currency).toUpperCase()
  }).format(Number(amount) / 100);

  const subject = `KasuhaNET order ${status.toUpperCase()}: ${orderId}`;
  const lines = [
    "KasuhaNET order notification",
    "",
    `Status: ${status}`,
    `Order ID: ${orderId}`,
    `Package: ${packageName || "-"}`,
    `Amount: ${amountText}`,
    `Customer: ${customerName || "-"}`,
    `Customer email: ${customerEmail || "-"}`,
    `Customer phone: ${customerPhone || "-"}`,
    `Stripe session: ${sessionId || "-"}`
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `kasuhanet-${orderId}-${status}`
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject,
      text: lines.join("\n")
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Admin email delivery failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return { sent: true };
}
