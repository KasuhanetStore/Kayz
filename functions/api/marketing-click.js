const DESTINATIONS = {
  landing: "/Banner-WebSale-MS.html",
  premium: "/Banner-WebSale-MS.html",
  workshop: "/custom-web-workshop-MS",
  brand: "/"
};

const SOURCES = new Set(["facebook", "tiktok", "whatsapp", "telegram", "social", "google", "unknown"]);

export async function onRequestGet({ request, env }) {
  const requestUrl = new URL(request.url);
  const offer = (requestUrl.searchParams.get("offer") || "landing").toLowerCase();
  const rawSource = (requestUrl.searchParams.get("source") || "unknown").toLowerCase();
  const source = SOURCES.has(rawSource) ? rawSource : "unknown";
  const rawCampaign = requestUrl.searchParams.get("campaign") || "organic";
  const campaign = rawCampaign.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60) || "organic";
  const validOffer = Object.prototype.hasOwnProperty.call(DESTINATIONS, offer);
  const destinationPath = validOffer ? DESTINATIONS[offer] : DESTINATIONS.landing;
  const destination = new URL(destinationPath, requestUrl.origin);

  destination.searchParams.set("utm_source", source);
  destination.searchParams.set("utm_medium", "organic_social");
  destination.searchParams.set("utm_campaign", campaign);
  destination.searchParams.set("utm_content", offer);
  destination.searchParams.set("kn_offer", offer);

  if (env.DB) {
    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS marketing_clicks (
        id TEXT PRIMARY KEY, offer TEXT NOT NULL, source TEXT NOT NULL,
        campaign TEXT NOT NULL, referrer TEXT, user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).run();
      await env.DB.prepare(`INSERT INTO marketing_clicks
        (id,offer,source,campaign,referrer,user_agent) VALUES(?,?,?,?,?,?)`)
        .bind(
          crypto.randomUUID(),
          validOffer ? offer : "landing",
          source,
          campaign,
          (request.headers.get("Referer") || "").slice(0, 500),
          (request.headers.get("User-Agent") || "").slice(0, 300)
        ).run();
    } catch (error) {
      console.error("[KasuhaNET Marketing] Click logging failed:", error?.message || String(error));
    }
  }

  return Response.redirect(destination.toString(), 302);
}
