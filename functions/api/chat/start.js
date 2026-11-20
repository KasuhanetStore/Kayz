const ALLOWED_HOSTS = new Set(["kasuhanet.store", "www.kasuhanet.store"]);
function json(data, status=200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"
  }});
}
function allowed(request) {
  try {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) return false;
    if (!origin) return true;
    const parsed = new URL(origin);
    return parsed.protocol === "https:" && ALLOWED_HOSTS.has(parsed.hostname) && parsed.origin === url.origin;
  } catch { return false; }
}
async function ensureTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbox_chats (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL UNIQUE,
    session_token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TEXT
  )`).run();
  try { await db.prepare('ALTER TABLE inbox_chats ADD COLUMN page_path TEXT').run(); } catch {}
  await db.prepare(`CREATE TABLE IF NOT EXISTS inbox_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender TEXT NOT NULL CHECK(sender IN ('buyer','admin')),
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    telegram_message_id TEXT
  )`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_inbox_messages_chat_created ON inbox_messages(chat_id, created_at)").run();
}
function randomHex(bytes) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, b => b.toString(16).padStart(2,"0")).join("");
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
}
export async function onRequestPost({request,env}) {
  if (!allowed(request)) return json({error:"Request origin is not allowed."},403);
  if (!env.DB) return json({error:"D1 database binding DB is not configured."},503);
  try {
    await ensureTables(env.DB);
    let pagePath = '/';
    try { const ref = new URL(request.headers.get('Referer') || ''); if (ref.origin === new URL(request.url).origin && /^\/[A-Za-z0-9_./-]{0,170}$/.test(ref.pathname)) pagePath = ref.pathname; } catch {}
    const token = randomHex(32);
    let chatId, created = false;
    for (let attempt=0; attempt<5; attempt++) {
      chatId = "KN-" + randomHex(5).toUpperCase();
      try {
        await env.DB.prepare("INSERT INTO inbox_chats (id,chat_id,session_token_hash,page_path) VALUES (?,?,?,?)")
          .bind(crypto.randomUUID(),chatId,await sha256(token),pagePath).run();
        created = true;
        break;
      } catch (error) {
        const message = String(error?.message || error);
        if (!/UNIQUE|constraint/i.test(message)) throw error;
      }
    }
    if (!created) return json({error:"Unable to create a chat session. Please try again."},500);
    return json({chatId,sessionToken:token,status:"open"},201);
  } catch {
    return json({error:"Unable to start Inbox Chat. Please try again later."},500);
  }
}
