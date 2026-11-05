// Site scan through WiGLE. Every scan is stashed in Redis forever and reused, and a daily cap protects the key.
const { createClient } = require("redis");
let client;
async function db() {
  if (!client) { client = createClient({ url: process.env.REDIS_URL }); client.on("error", () => {}); await client.connect(); }
  return client;
}
const CELL = 0.005; // about 500 meters; every site in the same cell shares one scan

function summary(s) {
  const enc = {}, ch = {};
  (s.results || []).forEach(n => {
    const e = String(n.encryption || "unknown").toLowerCase(); enc[e] = (enc[e] || 0) + 1;
    if (n.channel) ch[n.channel] = (ch[n.channel] || 0) + 1;
  });
  const busiest = Object.entries(ch).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => ({ channel: +c, count: n }));
  return { cell: s.cell, scannedAt: s.at, networks: s.total, sampled: (s.results || []).length, encryption: enc, busiestChannels: busiest };
}

module.exports = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (!isFinite(lat) || !isFinite(lng)) return res.status(400).json({ error: "lat and lng required" });
    const cy = Math.floor(lat / CELL), cx = Math.floor(lng / CELL), id = cy + ":" + cx;
    const r = await db();

    const hit = await r.get("wigle:scan:" + id);
    if (hit) return res.status(200).json({ ...summary(JSON.parse(hit)), cached: true });

    const day = new Date().toISOString().slice(0, 10);
    if (await r.get("wigle:pause:" + day)) return res.status(200).json({ limited: true });
    if (!(await r.set("wigle:lock:" + id, "1", { NX: true, EX: 60 }))) return res.status(200).json({ pending: true });

    const max = parseInt(process.env.WIGLE_DAILY_MAX || "20", 10);
    const used = await r.incr("wigle:used:" + day);
    await r.expire("wigle:used:" + day, 172800);
    if (used > max) { await r.del("wigle:lock:" + id); return res.status(200).json({ limited: true }); }

    const box = [cy * CELL, (cy + 1) * CELL, cx * CELL, (cx + 1) * CELL];
    const q = new URLSearchParams({ latrange1: box[0], latrange2: box[1], longrange1: box[2], longrange2: box[3], resultsPerPage: "100" });
    const w = await fetch("https://api.wigle.net/api/v2/network/search?" + q, { headers: { Authorization: "Basic " + process.env.WIGLE_AUTH } });
    if (w.status === 429) { await r.set("wigle:pause:" + day, "1", { EX: 172800 }); await r.del("wigle:lock:" + id); return res.status(200).json({ limited: true }); }
    if (!w.ok) { await r.del("wigle:lock:" + id); return res.status(502).json({ error: "wigle " + w.status }); }

    const data = await w.json();
    const scan = { cell: id, at: Date.now(), box, total: data.totalResults || 0, results: data.results || [] };
    await r.set("wigle:scan:" + id, JSON.stringify(scan));
    await r.sAdd("wigle:cells", id);
    res.status(200).json({ ...summary(scan), cached: false });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
