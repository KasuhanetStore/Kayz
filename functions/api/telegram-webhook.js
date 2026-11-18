const PACKAGES = {
  "landing-page": { name: "KasuhaNET Landing Page Package", amount: 29900, description: "Website setup and deployment service" },
  "premium-standard": { name: "KasuhaNET Premium Standard", amount: 90000, description: "Premium website setup and deployment service" },
  "dualstream-pro": { name: "DualStream Pro", amount: 4770, description: "DualStream Pro Linux terminal downloader software" }
};

const SERVICES = {
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

const SITE = "https://kasuhanet.store";

async function telegram(env, method, payload) {
  const response = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error("Telegram API request failed");
  return data.result;
}

async function send(env, chatId, text, keyboard) {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {})
  });
}

function money(amount) {
  return "RM " + (amount / 100).toFixed(2);
}

function mainMenu() {
  return [
    [{ text: "Website Packages", callback_data: "menu:packages" }],
    [{ text: "Custom Web Workshop", callback_data: "menu:services" }],
    [{ text: "Affiliate Shop", url: SITE + "/Shop-MyAffliate-home-EN.html" }],
    [{ text: "Visit KasuhaNET", url: SITE }]
  ];
}

async function createCheckout(env, chatId, item, id, isService) {
  if (!env.DB || !env.STRIPE_SECRET_KEY) {
    await send(env, chatId, "Checkout belum tersedia. Sila cuba semula kemudian atau lawati " + SITE);
    return;
  }

  const orderId = crypto.randomUUID();
  const packageId = isService ? "telegram-workshop-" + id : id;
  const description = isService ? "KasuhaNET Custom Web Workshop service" : item.description;

  try {
    await env.DB.prepare(
      `INSERT INTO stripe_orders
       (id, package_id, package_name, amount, currency, customer_name, customer_email, customer_phone, status)
       VALUES (?, ?, ?, ?, 'myr', ?, ?, ?, 'pending')`
    ).bind(orderId, packageId, item.name, item.amount, "Telegram Customer", "telegram-" + chatId + "@customer.invalid", "Not provided").run();

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", SITE + "/Banner-WebSale-EN.html?payment=success&session_id={CHECKOUT_SESSION_ID}");
    form.set("cancel_url", SITE + "/Banner-WebSale-EN.html?payment=cancel");
    form.set("customer_creation", "always");
    form.set("billing_address_collection", "auto");
    form.set("phone_number_collection[enabled]", "true");
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", "myr");
    form.set("line_items[0][price_data][unit_amount]", String(item.amount));
    form.set("line_items[0][price_data][product_data][name]", item.name);
    form.set("line_items[0][price_data][product_data][description]", description);
    form.set("metadata[order_id]", orderId);
    form.set("metadata[package_id]", packageId);
    form.set("metadata[telegram_chat_id]", String(chatId));

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    });
    const result = await response.json();
    if (!response.ok || !result.url || !result.id) throw new Error("Stripe checkout creation failed");

    await env.DB.prepare(
      "UPDATE stripe_orders SET stripe_checkout_session_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(result.id, orderId).run();

    await send(env, chatId,
      "<b>" + item.name + "</b>\nHarga: <b>" + money(item.amount) + "</b>\n\nTekan butang di bawah untuk isi maklumat pembayaran dan selesaikan pesanan.",
      [[{ text: "SECURE CHECKOUT • " + money(item.amount), url: result.url }], [{ text: "Kembali ke Menu", callback_data: "menu:home" }]]
    );
  } catch {
    await env.DB.prepare("UPDATE stripe_orders SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderId).run().catch(() => {});
    await send(env, chatId, "Checkout gagal dijana. Sila cuba lagi atau hubungi sokongan KasuhaNET.");
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN) return new Response("Bot not configured", { status: 503 });

  const setupKey = request.headers.get("X-KasuhaNET-Setup-Key");
  if (setupKey && env.TELEGRAM_WEBHOOK_SECRET && setupKey === env.TELEGRAM_WEBHOOK_SECRET) {
    try {
      await telegram(env, "setWebhook", {
        url: SITE + "/api/telegram-webhook",
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false
      });
      return new Response("Telegram webhook connected successfully.", { status: 200 });
    } catch {
      return new Response("Unable to register Telegram webhook. Check bot token and webhook secret.", { status: 502 });
    }
  }

  const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!env.TELEGRAM_WEBHOOK_SECRET || suppliedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    const message = update.message;
    const callback = update.callback_query;
    if (message?.chat?.id) {
      const chatId = message.chat.id;
      const input = (message.text || "").trim();
      if (input === "/start" || input === "/menu") {
        await send(env, chatId,
          "<b>Selamat datang ke KasuhaNET Store.</b>\nPilih servis atau produk yang ingin dibeli. Harga dipaparkan dalam MYR.",
          mainMenu()
        );
      } else if (input === "/help") {
        await send(env, chatId, "Gunakan /start untuk membuka menu kedai KasuhaNET.");
      } else {
        await send(env, chatId, "Gunakan /start untuk melihat katalog dan pilihan pembelian.");
      }
    } else if (callback?.message?.chat?.id && callback.data) {
      const chatId = callback.message.chat.id;
      const action = callback.data;
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });

      if (action === "menu:home") {
        await send(env, chatId, "<b>KasuhaNET Store</b>\nPilih kategori:", mainMenu());
      } else if (action === "menu:packages") {
        const rows = Object.entries(PACKAGES).map(([id, item]) => [{
          text: item.name + " • " + money(item.amount),
          callback_data: "buy:package:" + id
        }]);
        rows.push([{ text: "Kembali", callback_data: "menu:home" }]);
        await send(env, chatId, "<b>Website Packages</b>\nPilih pakej untuk meneruskan ke pembayaran selamat Stripe.", rows);
      } else if (action === "menu:services") {
        const rows = Object.entries(SERVICES).map(([id, item]) => [{
          text: item.name + " • " + money(item.amount),
          callback_data: "buy:service:" + id
        }]);
        rows.push([{ text: "Kembali", callback_data: "menu:home" }]);
        await send(env, chatId, "<b>Custom Web Workshop</b>\nPilih satu servis. Untuk gabungan beberapa servis, gunakan laman bengkel.", rows);
      } else if (action.startsWith("buy:package:")) {
        const id = action.slice("buy:package:".length);
        if (PACKAGES[id]) await createCheckout(env, chatId, PACKAGES[id], id, false);
      } else if (action.startsWith("buy:service:")) {
        const id = action.slice("buy:service:".length);
        if (SERVICES[id]) await createCheckout(env, chatId, SERVICES[id], id, true);
      }
    }
  } catch {
    // Telegram retries webhook deliveries when the endpoint fails. Acknowledge safely.
  }

  return new Response("OK", { status: 200 });
}

export async function onRequestGet() {
  return new Response("KasuhaNET Telegram webhook is ready.", {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
