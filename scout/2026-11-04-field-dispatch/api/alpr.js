// Known license plate reader locations from OpenStreetMap, by half degree tile. Stashed in Redis for a week.
const { createClient } = require("redis");
let client;
async function db() {
  if (!client) { client = createClient({ url: process.env.REDIS_URL }); client.on("error", () => {}); await client.connect(); }
  return client;
}
const TILE = 0.5;

module.exports = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (!isFinite(lat) || !isFinite(lng)) return res.status(400).json({ error: "lat and lng required" });
    const ty = Math.floor(lat / TILE), tx = Math.floor(lng / TILE), key = "alpr:tile:" + ty + ":" + tx;
    let r = null;
    try { r = await db(); const hit = await r.get(key); if (hit) return res.status(200).json(JSON.parse(hit)); } catch (e) { r = null; }
    const s = ty * TILE, w = tx * TILE, n = s + TILE, e = w + TILE;
    const q = '[out:json][timeout:25];(node["surveillance:type"="ALPR"](' + s + "," + w + "," + n + "," + e + '););out;';
    const o = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "field-dispatch-game" },
      body: "data=" + encodeURIComponent(q)
    });
    if (!o.ok) return res.status(502).json({ error: "overpass " + o.status });
    const data = await o.json();
    const out = (data.elements || []).map(x => ({ id: "a" + x.id, lat: x.lat, lng: x.lon }));
    if (r) await r.set(key, JSON.stringify(out), { EX: 604800 });
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
