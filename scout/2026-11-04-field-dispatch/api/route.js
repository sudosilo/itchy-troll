// Road route between two points from OpenStreetMap routing. Every route is stashed in Redis and reused.
const { createClient } = require("redis");
let client;
async function db() {
  if (!client) { client = createClient({ url: process.env.REDIS_URL }); client.on("error", () => {}); await client.connect(); }
  return client;
}
const pt = s => { const [a, b] = String(s || "").split(",").map(Number); return isFinite(a) && isFinite(b) ? [+a.toFixed(4), +b.toFixed(4)] : null; };

module.exports = async (req, res) => {
  try {
    const from = pt(req.query.from), to = pt(req.query.to);
    if (!from || !to) return res.status(400).json({ error: "from and to required as lat,lng" });
    const key = "route:" + from.join(",") + ";" + to.join(",");
    let r = null;
    try { r = await db(); const hit = await r.get(key); if (hit) return res.status(200).json(JSON.parse(hit)); } catch (e) { r = null; }
    const url = "https://router.project-osrm.org/route/v1/driving/" + from[1] + "," + from[0] + ";" + to[1] + "," + to[0] + "?overview=full&geometries=geojson";
    const o = await fetch(url, { headers: { "User-Agent": "field-dispatch-game" } });
    if (!o.ok) return res.status(502).json({ error: "router " + o.status });
    const data = await o.json(), best = data.routes && data.routes[0];
    if (!best) return res.status(404).json({ error: "no route" });
    const out = { path: best.geometry.coordinates.map(c => [+c[1].toFixed(5), +c[0].toFixed(5)]), dur: best.duration, dist: best.distance };
    if (r) await r.set(key, JSON.stringify(out), { EX: 2592000 });
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
