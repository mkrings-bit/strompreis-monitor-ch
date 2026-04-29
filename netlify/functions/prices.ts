// Netlify Function: server-side proxy für EPEX Spot CH Preise
// Unterstützt jetzt auch tres-Parameter (hour/quarter) für 15-Min-Auflösung
// Mit In-Memory + Edge-Cache

const memCache = new Map();
const TTL_MS = 10 * 60 * 1000;

export default async (req) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const tres = url.searchParams.get("tres");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: "missing or invalid date (YYYY-MM-DD)" }), {
      status: 400,
      headers: corsJsonHeaders(),
    });
  }

  const cacheKey = date + "::" + (tres || "default");
  const cached = memCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return new Response(cached.body, {
      status: cached.status,
      headers: { ...corsJsonHeaders(), "X-Cache": "HIT-mem" },
    });
  }

  try {
    const params = new URLSearchParams({
      bzn: "CH",
      start: date,
      end: date,
    });
    if (tres) params.set("tres", tres);
    const apiUrl = "https://api.energy-charts.info/price?" + params.toString();
    const r = await fetch(apiUrl, {
      headers: { "User-Agent": "AlpenEnergie-StrompreisMonitor/1.0 (+enura-group.com)" },
    });
    const body = await r.text();

    if (r.status === 200 && body.startsWith("{")) {
      memCache.set(cacheKey, { body, status: 200, ts: Date.now() });
    }

    return new Response(body, {
      status: r.status,
      headers: {
        ...corsJsonHeaders(),
        "Cache-Control": "public, max-age=300",
        "Netlify-CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=600",
        "X-Cache": "MISS",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e && e.message) || "fetch failed" }), {
      status: 502,
      headers: corsJsonHeaders(),
    });
  }
};

function corsJsonHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };
}

export const config = {
  path: "/api/prices",
};
