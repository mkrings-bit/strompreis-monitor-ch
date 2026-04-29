// Netlify Function: server-side proxy for EPEX Spot CH prices
// Bypasses CORS by fetching from the server, no third-party proxy needed

export default async (req: Request) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: "missing or invalid date parameter (YYYY-MM-DD)" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const apiUrl = `https://api.energy-charts.info/price?bzn=CH&start=${date}&end=${date}`;
    const r = await fetch(apiUrl, {
      headers: { "User-Agent": "Alpen-Energie-Strompreis-Monitor/1.0" },
    });
    const body = await r.text();

    return new Response(body, {
      status: r.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "fetch failed" }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};

export const config = {
  path: "/api/prices",
};
